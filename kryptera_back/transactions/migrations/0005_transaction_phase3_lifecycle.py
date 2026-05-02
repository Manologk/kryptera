# Phase 3 — POP → confirm receipt → delivery proof → completed

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0004_transfer_delivery_payment_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="receipt_confirmed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="transaction",
            name="receipt_confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="admin_notes",
            field=models.TextField(blank=True, help_text="Optional notes shown to the client with delivery proof."),
        ),
        migrations.AddField(
            model_name="transaction",
            name="delivery_proof",
            field=models.FileField(blank=True, null=True, upload_to="delivery_proofs/"),
        ),
    ]
