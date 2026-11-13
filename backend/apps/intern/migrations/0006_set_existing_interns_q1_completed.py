from decimal import Decimal
from django.db import migrations


def set_existing_interns_q1_completed(apps, schema_editor):
    EmployeeProfile = apps.get_model('employees', 'EmployeeProfile')
    MiraiQuarterProgress = apps.get_model('intern', 'MiraiQuarterProgress')

    interns = EmployeeProfile.objects.filter(user__role='INTERN')
    for intern in interns:
        q1 = MiraiQuarterProgress.objects.filter(
            intern=intern,
            quarter_code='Q1'
        ).first()

        if q1:
            q1.completion_percentage = Decimal('100.00')
            q1.status = 'COMPLETED'
            q1.is_manually_updated = True
            q1.prerequisites_met = True
            q1.save(update_fields=['completion_percentage', 'status', 'is_manually_updated', 'prerequisites_met'])


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('intern', '0005_miraiquarterprogress_is_manually_updated'),
    ]

    operations = [
        migrations.RunPython(set_existing_interns_q1_completed, reverse_noop),
    ]
