# Generated manually for payment_deadline / finish_later

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("transactions", "0006_canceled_and_proof_deadline"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="payment_deadline",
            field=models.DateTimeField(
                blank=True,
                help_text="When finish_later is true, POP must be uploaded before this time or the transfer is canceled.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="finish_later",
            field=models.BooleanField(
                default=False,
                help_text="User chose to complete payment later; payment_deadline applies.",
            ),
        ),
    ]
