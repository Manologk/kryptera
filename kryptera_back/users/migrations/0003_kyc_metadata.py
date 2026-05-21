from django.db import migrations, models

import users.models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_extension_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="kyc_country",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="user",
            name="kyc_id_number",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="user",
            name="kyc_legal_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="kyc_rejection_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="user",
            name="kyc_submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="kyc_doc",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to=users.models.kyc_doc_upload_path,
            ),
        ),
    ]
