import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.conf.beat_schedule = getattr(sender.conf, "beat_schedule", None) or {}
    sender.conf.beat_schedule.update(
        {
            "cancel_expired_finish_later_transactions_every_60s": {
                "task": "transactions.cancel_expired_transactions",
                "schedule": 60.0,
            },
        }
    )
