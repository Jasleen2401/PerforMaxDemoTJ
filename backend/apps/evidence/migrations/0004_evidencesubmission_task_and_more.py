import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evidence', '0003_evidencesubmission_is_locked_for_appraisal_and_more'),
        ('goals', '0002_goalitem_goalset_kpicategory_kpilibrary_and_more'),
        ('intern', '0003_miraicertification_miraitimelineevent_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='evidencesubmission',
            name='task',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='evidence_submissions', to='intern.interntask'),
        ),
        migrations.AlterField(
            model_name='evidencesubmission',
            name='goal',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='evidence_submissions', to='goals.goal'),
        ),
    ]
