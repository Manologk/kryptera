from django.db import migrations, models


def seed_payment_receiving_configs(apps, schema_editor):
    PaymentReceivingConfig = apps.get_model("rates", "PaymentReceivingConfig")

    seeds = [
        {
            "corridor": "russia-zambia",
            "payment_method": "pay_bank_ru",
            "display_mode": "whatsapp",
            "details": {
                "phone": "+7 999 071-50-94",
                "account_name": "Каванда Ч",
                "bank_name": "Сбербанк",
                "instructions": [
                    "Send only the amount shown for this transfer. Use the phone, recipient name, and bank exactly as listed.",
                    "After paying, upload proof of payment on the next step before the timer ends.",
                ],
            },
        },
        {
            "corridor": "russia-zambia",
            "payment_method": "pay_crypto_usdt",
            "display_mode": "whatsapp",
            "details": {
                "address": "TXYZkrp7PLACEHOLDER9n3Q8Z7aB2cD4eF6gH",
                "network": "TRC20 (Tron)",
                "instructions": [
                    "Send only USDT on the network below. Wrong token or network can result in permanent loss.",
                    "Double-check the address character by character before confirming in your wallet.",
                ],
            },
        },
        {
            "corridor": "zambia-russia",
            "payment_method": "pay_mobile_money",
            "display_mode": "inline",
            "details": {
                "display_number": "260771330585",
                "instructions": [
                    "Open your mobile money app and send only the amount shown on the next screen (when available).",
                    "Use this number as the recipient: 260771330585.",
                    "Need help? Reach us on WhatsApp or email — see the contact block in the app footer.",
                ],
            },
        },
        {
            "corridor": "zambia-russia",
            "payment_method": "pay_crypto_usdt",
            "display_mode": "inline",
            "details": {
                "address": "TXYZkrp7PLACEHOLDER9n3Q8Z7aB2cD4eF6gH",
                "network": "TRC20 (Tron)",
                "instructions": [
                    "Send only USDT on the network below. Wrong token or network can result in permanent loss.",
                    "Double-check the address character by character before confirming in your wallet.",
                ],
            },
        },
    ]

    for row in seeds:
        PaymentReceivingConfig.objects.update_or_create(
            corridor=row["corridor"],
            payment_method=row["payment_method"],
            defaults={
                "display_mode": row["display_mode"],
                "details": row["details"],
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("rates", "0004_platform_settings"),
    ]

    operations = [
        migrations.CreateModel(
            name="PaymentReceivingConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("corridor", models.CharField(db_index=True, max_length=20)),
                ("payment_method", models.CharField(db_index=True, max_length=48)),
                (
                    "display_mode",
                    models.CharField(
                        choices=[("whatsapp", "Request via WhatsApp"), ("inline", "Show on site")],
                        default="whatsapp",
                        max_length=20,
                    ),
                ),
                ("details", models.JSONField(blank=True, default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Payment receiving config",
                "verbose_name_plural": "Payment receiving configs",
                "ordering": ["corridor", "payment_method"],
            },
        ),
        migrations.AddConstraint(
            model_name="paymentreceivingconfig",
            constraint=models.UniqueConstraint(
                fields=("corridor", "payment_method"),
                name="rates_paymentreceivingconfig_corridor_method_uniq",
            ),
        ),
        migrations.RunPython(seed_payment_receiving_configs, migrations.RunPython.noop),
    ]
