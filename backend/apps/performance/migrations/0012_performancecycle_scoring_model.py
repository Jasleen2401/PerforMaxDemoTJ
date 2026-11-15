import json
import os
import uuid
from pathlib import Path
from django.db import migrations, models, transaction
import django.db.models.deletion


def check_duplicate_manifest_keys(pairs):
    res = {}
    for key, value in pairs:
        clean_key = str(key).strip().lower()
        if clean_key in res:
            raise RuntimeError(f"Duplicate entry in scoring manifest for cycle UUID: '{key}'")
        res[key] = value
    return res


def load_scoring_manifest(manifest_path=None, manifest_json=None):
    """
    Load explicit scoring model classification manifest.
    Priority order:
    1. Direct manifest_json parameter (for programmatic/test invocations)
    2. Direct manifest_path parameter (for programmatic/test invocations)
    3. Environment variable PERFORMAX_SCORING_MANIFEST_PATH (path to environment-specific JSON file)
    4. Environment variable PERFORMAX_SCORING_MANIFEST (direct JSON string)

    If none of the above are supplied, an empty manifest ({}) is returned.
    No development manifest file is loaded automatically, ensuring zero environment-specific
    leakage across staging, production, or CI runs.

    Returns (dict of {clean_uuid_str: scoring_model_str}, source_description).
    """
    raw_manifest = {}
    source_desc = "none"

    if manifest_json:
        try:
            raw_manifest = json.loads(manifest_json, object_pairs_hook=check_duplicate_manifest_keys)
            source_desc = "parameter:manifest_json"
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON in scoring manifest (manifest_json): {exc}")
    elif manifest_path:
        p = Path(manifest_path)
        if not p.is_file():
            raise RuntimeError(f"Scoring manifest file not found at specified path: {manifest_path}")
        try:
            with open(p, 'r', encoding='utf-8') as f:
                raw_manifest = json.loads(f.read(), object_pairs_hook=check_duplicate_manifest_keys)
            source_desc = f"file:{manifest_path}"
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON in scoring manifest file ({manifest_path}): {exc}")
    elif os.environ.get('PERFORMAX_SCORING_MANIFEST_PATH'):
        env_path = os.environ['PERFORMAX_SCORING_MANIFEST_PATH'].strip()
        p = Path(env_path)
        if not p.is_file():
            raise RuntimeError(f"Scoring manifest file not found at PERFORMAX_SCORING_MANIFEST_PATH: {env_path}")
        try:
            with open(p, 'r', encoding='utf-8') as f:
                raw_manifest = json.loads(f.read(), object_pairs_hook=check_duplicate_manifest_keys)
            source_desc = f"env_file:{env_path}"
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON in PERFORMAX_SCORING_MANIFEST_PATH file ({env_path}): {exc}")
    elif os.environ.get('PERFORMAX_SCORING_MANIFEST'):
        env_json = os.environ['PERFORMAX_SCORING_MANIFEST'].strip()
        try:
            raw_manifest = json.loads(env_json, object_pairs_hook=check_duplicate_manifest_keys)
            source_desc = "env_var:PERFORMAX_SCORING_MANIFEST"
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON in PERFORMAX_SCORING_MANIFEST environment variable: {exc}")
    else:
        # No manifest explicitly supplied via parameters or environment variables.
        # Manifests must be explicitly supplied per environment when ambiguous cycles exist.
        raw_manifest = {}
        source_desc = "none"

    if not isinstance(raw_manifest, dict):
        raise RuntimeError(f"Scoring manifest from {source_desc} must be a JSON object mapping cycle UUIDs to scoring models.")

    VALID_MODELS = {'LEGACY_CRITERIA', 'COMPETENCY_FRAMEWORK'}
    parsed_manifest = {}

    for raw_key, raw_val in raw_manifest.items():
        try:
            norm_uuid = str(uuid.UUID(str(raw_key).strip()))
        except (ValueError, AttributeError, TypeError):
            raise RuntimeError(f"Malformed UUID in scoring manifest: '{raw_key}' (from {source_desc})")

        acknowledged_hybrid = False
        if isinstance(raw_val, str):
            model_name = raw_val.strip().upper()
        elif isinstance(raw_val, dict):
            model_name = str(raw_val.get('scoring_model', '')).strip().upper()
            acknowledged_hybrid = bool(raw_val.get('acknowledged_hybrid') or raw_val.get('acknowledge_hybrid'))
        else:
            raise RuntimeError(
                f"Invalid entry format for cycle '{raw_key}' in manifest ({source_desc}): "
                "expected string scoring model or dictionary containing 'scoring_model'."
            )

        if model_name not in VALID_MODELS:
            raise RuntimeError(
                f"Invalid scoring model '{model_name}' for cycle '{raw_key}' in manifest ({source_desc}). "
                f"Must be one of: {sorted(list(VALID_MODELS))}."
            )

        parsed_manifest[norm_uuid] = {
            'scoring_model': model_name,
            'acknowledged_hybrid': acknowledged_hybrid,
        }

    return parsed_manifest, source_desc


def populate_scoring_models(apps, schema_editor, manifest_override=None):
    PerformanceCycle = apps.get_model('performance', 'PerformanceCycle')
    AppraisalRating = apps.get_model('performance', 'AppraisalRating')
    CycleCompetency = apps.get_model('performance', 'CycleCompetency')
    CycleEvaluatorAssignment = apps.get_model('performance', 'CycleEvaluatorAssignment')
    Appraisal = apps.get_model('performance', 'Appraisal')
    TechnicalCapabilityParameter = apps.get_model('performance', 'TechnicalCapabilityParameter')

    cycles = list(PerformanceCycle.objects.all())
    if not cycles:
        # Fresh database or test database creation: no cycles exist, nothing to classify.
        return

    if manifest_override is not None:
        manifest = {}
        for k, v in manifest_override.items():
            norm_k = str(uuid.UUID(str(k).strip()))
            if isinstance(v, str):
                manifest[norm_k] = {'scoring_model': v.strip().upper(), 'acknowledged_hybrid': False}
            elif isinstance(v, dict):
                manifest[norm_k] = {
                    'scoring_model': str(v.get('scoring_model', '')).strip().upper(),
                    'acknowledged_hybrid': bool(v.get('acknowledged_hybrid') or v.get('acknowledge_hybrid')),
                }
            else:
                manifest[norm_k] = v
        manifest_source = "override"
    else:
        manifest, manifest_source = load_scoring_manifest()

    existing_cycle_ids = {str(c.id) for c in cycles}

    # Reject unused manifest entries to prevent typos and configuration drift
    unused_manifest_entries = set(manifest.keys()) - existing_cycle_ids
    if unused_manifest_entries:
        raise RuntimeError(
            f"Scoring manifest from {manifest_source} contains unused entries that do not match any "
            f"PerformanceCycle in this database: {sorted(list(unused_manifest_entries))}. "
            "All manifest entries must correspond to existing cycles in the target database to prevent configuration drift."
        )

    classifications = {}
    ambiguous_cycles = []
    conflict_cycles = []

    for cycle in cycles:
        cid_str = str(cycle.id)
        has_ratings = AppraisalRating.objects.filter(appraisal__cycle=cycle).exists()
        has_competencies = CycleCompetency.objects.filter(cycle=cycle).exists()
        has_assignments = CycleEvaluatorAssignment.objects.filter(cycle=cycle).exists()
        has_appraisals = Appraisal.objects.filter(cycle=cycle).exists()
        has_tech_params = TechnicalCapabilityParameter.objects.filter(cycle=cycle).exists()

        # 1. Explicit Manifest Classification
        if cid_str in manifest:
            manifest_entry = manifest[cid_str]
            manifest_model = manifest_entry['scoring_model']
            acknowledged_hybrid = manifest_entry.get('acknowledged_hybrid', False)

            # Consistency check: manifest cannot contradict hard architectural evidence
            if manifest_model == 'LEGACY_CRITERIA' and has_competencies:
                conflict_cycles.append(
                    f"Cycle '{cycle.name}' ({cycle.id}) is declared as LEGACY_CRITERIA in manifest, "
                    f"but contains {CycleCompetency.objects.filter(cycle=cycle).count()} active CycleCompetency record(s)."
                )
                continue
            if manifest_model == 'COMPETENCY_FRAMEWORK' and has_ratings:
                conflict_cycles.append(
                    f"Cycle '{cycle.name}' ({cycle.id}) is declared as COMPETENCY_FRAMEWORK in manifest, "
                    "but contains legacy AppraisalRating records referencing EvaluationCriterion."
                )
                continue

            # Hybrid validation: legacy ratings + transitional technical parameters without competencies
            if manifest_model == 'LEGACY_CRITERIA' and has_ratings and has_tech_params and not has_competencies:
                if not acknowledged_hybrid:
                    rating_count = AppraisalRating.objects.filter(appraisal__cycle=cycle).count()
                    param_count = TechnicalCapabilityParameter.objects.filter(cycle=cycle).count()
                    conflict_cycles.append(
                        f"Cycle '{cycle.name}' ({cycle.id}) is a hybrid cycle containing {rating_count} legacy appraisal rating(s) "
                        f"and {param_count} transitional technical parameter(s). Explicit LEGACY_CRITERIA manifest classification "
                        "for hybrid cycles requires explicit operator acknowledgement: 'acknowledged_hybrid': true in manifest."
                    )
                    continue

            classifications[cycle] = manifest_model
            continue

        # 2. Conflicting Evidence Detection
        if has_ratings and (has_competencies or has_assignments):
            conflict_cycles.append(
                f"Cycle '{cycle.name}' ({cycle.id}) contains CONFLICTING evidence: "
                "legacy AppraisalRating records exist alongside modern CycleCompetency / CycleEvaluatorAssignment records."
            )
            continue

        # 3. Unambiguous Legacy Evidence (requires NO competencies, NO assignments, and NO technical parameters)
        if has_ratings and not has_competencies and not has_assignments and not has_tech_params:
            classifications[cycle] = 'LEGACY_CRITERIA'
            continue

        # 4. Unambiguous Modern Evidence
        if (has_competencies or has_assignments) and not has_ratings:
            classifications[cycle] = 'COMPETENCY_FRAMEWORK'
            continue

        # 5. Ambiguous Cases (Fail Closed)
        ambiguous_reasons = []
        if has_ratings and has_tech_params and not has_competencies:
            rating_count = AppraisalRating.objects.filter(appraisal__cycle=cycle).count()
            param_count = TechnicalCapabilityParameter.objects.filter(cycle=cycle).count()
            ambiguous_reasons.append(
                f"hybrid cycle: {rating_count} legacy appraisal rating(s) exist alongside {param_count} transitional technical parameter(s) without competencies"
            )
        elif has_appraisals and not has_ratings:
            ambiguous_reasons.append(f"{Appraisal.objects.filter(cycle=cycle).count()} appraisal(s) exist but 0 submitted ratings")
        elif has_tech_params and not has_competencies:
            ambiguous_reasons.append(f"{TechnicalCapabilityParameter.objects.filter(cycle=cycle).count()} transitional technical parameter(s) exist but 0 competencies")
        elif not has_appraisals and not has_ratings and not has_competencies and not has_assignments and not has_tech_params:
            ambiguous_reasons.append("empty cycle with no appraisals, ratings, competencies, or evaluator assignments")

        ambiguous_cycles.append(
            f"  - Cycle: '{cycle.name}' (ID: {cycle.id})\n"
            f"    Status: {cycle.status}, Dates: {cycle.start_date} to {cycle.end_date}\n"
            f"    Evidence: {'; '.join(ambiguous_reasons) if ambiguous_reasons else 'unresolved operational state'}"
        )

    if conflict_cycles:
        raise RuntimeError(
            "[MIGRATION 0012 REFUSAL: CONFLICTING DATA DETECTED]\n"
            "The following cycle(s) contain conflicting legacy and modern records:\n"
            + "\n".join(f"  - {c}" for c in conflict_cycles)
            + "\nResolve the conflicting records before running migration 0012."
        )

    if ambiguous_cycles:
        raise RuntimeError(
            "[MIGRATION 0012 REFUSAL: AMBIGUOUS CYCLES DETECTED]\n"
            "The following performance cycle(s) cannot be classified automatically:\n"
            + "\n".join(ambiguous_cycles)
            + "\n\nACTION REQUIRED:\n"
            + "To prevent accidental scoring model corruption, migration 0012 refuses to guess.\n"
            + "Please supply an explicit reviewed classification manifest via:\n"
            + "  1. A reviewed JSON file at backend/apps/performance/scoring_manifest.json\n"
            + "  2. Or set PERFORMAX_SCORING_MANIFEST_PATH=/path/to/manifest.json\n"
            + "  3. Or set PERFORMAX_SCORING_MANIFEST='{\"" + str(cycles[0].id) + "\": \"COMPETENCY_FRAMEWORK\"}'\n"
            + "\nManifest format:\n"
            + '{\n  "<cycle_uuid>": {\n    "scoring_model": "LEGACY_CRITERIA" | "COMPETENCY_FRAMEWORK",\n    "reason": "..."\n  }\n}'
        )

    # Atomic persistence
    with transaction.atomic():
        for cycle, model_name in classifications.items():
            PerformanceCycle.objects.filter(pk=cycle.pk).update(scoring_model=model_name)


class Migration(migrations.Migration):

    atomic = True

    dependencies = [
        ('performance', '0011_mentor_appraisal_execution'),
    ]

    operations = [
        migrations.AddField(
            model_name='performancecycle',
            name='scoring_model',
            field=models.CharField(
                choices=[
                    ('LEGACY_CRITERIA', 'Legacy Evaluation Criteria'),
                    ('COMPETENCY_FRAMEWORK', 'Competency Framework')
                ],
                default='COMPETENCY_FRAMEWORK',
                editable=False,
                help_text='Evaluation and scoring framework used by this cycle',
                max_length=30
            ),
        ),
        migrations.AlterField(
            model_name='behavioralcapabilityreview',
            name='competency',
            field=models.ForeignKey(
                limit_choices_to={'section': 'BEHAVIORAL'},
                on_delete=django.db.models.deletion.PROTECT,
                related_name='behavioral_reviews',
                to='performance.cyclecompetency'
            ),
        ),
        migrations.AlterField(
            model_name='technicalcapabilityreview',
            name='competency',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='technical_reviews',
                to='performance.cyclecompetency'
            ),
        ),
        migrations.AlterField(
            model_name='technicalcapabilityreview',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', 'Draft'),
                    ('SUBMITTED', 'Submitted'),
                    ('SAVED_DRAFT', 'Saved Draft'),
                    ('LOCKED_FOR_APPRAISAL', 'Locked for Appraisal')
                ],
                default='DRAFT',
                max_length=20
            ),
        ),
        migrations.RunPython(populate_scoring_models, reverse_code=migrations.RunPython.noop),
    ]
