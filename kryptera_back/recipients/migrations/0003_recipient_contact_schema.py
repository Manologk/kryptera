# Generated manually — recipient as owner-scoped contact (no separate login).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipients", "0002_rename_rcp_user_active_idx_recipients__user_id_d338ff_idx"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="recipient",
            name="recipients__user_id_d338ff_idx",
        ),
        migrations.RemoveField(
            model_name="recipient",
            name="label",
        ),
        migrations.RemoveField(
            model_name="recipient",
            name="is_active",
        ),
        migrations.RemoveField(
            model_name="recipient",
            name="updated_at",
        ),
        migrations.RenameField(
            model_name="recipient",
            old_name="user",
            new_name="owner",
        ),
        migrations.RenameField(
            model_name="recipient",
            old_name="phone",
            new_name="phone_number",
        ),
        migrations.RenameField(
            model_name="recipient",
            old_name="payout_details",
            new_name="delivery_details",
        ),
        migrations.AddField(
            model_name="recipient",
            name="delivery_method",
            field=models.CharField(blank=True, default="", max_length=48),
        ),
        migrations.AddIndex(
            model_name="recipient",
            index=models.Index(fields=["owner"], name="recipients_owner_idx"),
        ),
    ]
