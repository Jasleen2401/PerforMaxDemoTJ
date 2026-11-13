import json
import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.employees.models import EmployeeProfile
from apps.intern.models import QuarterCode, QuarterStatus, MiraiQuarterProgress
from apps.intern.services import MiraiJourneyService


class Command(BaseCommand):
    help = (
        'Safe, idempotent migration for existing interns: '
        'Sets Q1 progress to 100% and Q1 status to COMPLETED, '
        'leaving Q2, Q3, and Q4 untouched.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate updates without writing to the database.'
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        self.stdout.write(self.style.MIGRATE_HEADING("Starting Q1 progress update for existing interns..."))

        intern_profiles = EmployeeProfile.objects.filter(user__role='INTERN').select_related('user')
        total_interns = intern_profiles.count()
        self.stdout.write(f"Found {total_interns} existing intern profiles.")

        backup_records = []
        updated_count = 0
        already_completed_count = 0

        for intern in intern_profiles:
            # Ensure quarters exist
            MiraiJourneyService.get_or_initialize_quarters(intern)

            q1 = MiraiQuarterProgress.objects.filter(
                intern=intern,
                quarter_code=QuarterCode.Q1
            ).first()

            if not q1:
                continue

            # Record backup
            backup_entry = {
                'intern_id': str(intern.id),
                'username': intern.user.username,
                'employee_code': intern.employee_code,
                'previous_q1_status': str(q1.status),
                'previous_q1_progress': float(q1.completion_percentage),
                'previous_is_manual': getattr(q1, 'is_manually_updated', False),
                'timestamp': timezone.now().isoformat(),
            }
            backup_records.append(backup_entry)

            if q1.status == QuarterStatus.COMPLETED and q1.completion_percentage == Decimal('100.00'):
                already_completed_count += 1
                if not q1.is_manually_updated and not dry_run:
                    q1.is_manually_updated = True
                    q1.save(update_fields=['is_manually_updated', 'updated_at'])
                continue

            if not dry_run:
                q1.completion_percentage = Decimal('100.00')
                q1.status = QuarterStatus.COMPLETED
                q1.is_manually_updated = True
                q1.prerequisites_met = True
                q1.save(update_fields=[
                    'completion_percentage',
                    'status',
                    'is_manually_updated',
                    'prerequisites_met',
                    'updated_at'
                ])

            updated_count += 1

        # Write backup file to disk
        backup_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'migrations',
            'q1_backup_records.json'
        )
        try:
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(backup_records, f, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Saved pre-migration backup for {len(backup_records)} interns to {backup_path}"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not write backup file: {e}"))

        mode_str = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode_str}Complete! Total interns: {total_interns}, "
                f"Updated Q1 to 100% COMPLETED: {updated_count}, "
                f"Already 100% COMPLETED: {already_completed_count}."
            )
        )
