# Generated manually — require delivery_method on recipients

from django.db import migrations, models


def backfill_empty_delivery_method(apps, schema_editor):
    Recipient = apps.get_model("recipients", "Recipient")
    Recipient.objects.filter(delivery_method="").update(delivery_method="mobile_money")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recipients", "0004_rename_recipients_owner_idx_recipients__owner_i_507911_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_empty_delivery_method, noop_reverse),
        migrations.AlterField(
            model_name="recipient",
            name="delivery_method",
            field=models.CharField(max_length=48),
        ),
    ]
