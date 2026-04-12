import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipients", "0001_initial"),
        ("transactions", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="rate_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="transaction",
            name="recipient_snapshot",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="recipient",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transactions",
                to="recipients.recipient",
            ),
        ),
    ]
