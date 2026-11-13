from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('goals', '0003_goal_blocked_reason_goal_expected_evidence_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='goal',
            name='category',
            field=models.CharField(blank=True, default='TECHNICAL', max_length=100),
        ),
    ]
