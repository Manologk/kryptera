from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test email to verify Brevo SMTP configuration."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Destination email address")

    def handle(self, *args, **options):
        recipient = options["recipient"].strip()
        if not recipient:
            raise CommandError("Recipient email is required.")

        if not settings.EMAIL_HOST.strip():
            raise CommandError("EMAIL_HOST is not set.")
        if not settings.EMAIL_HOST_USER.strip():
            raise CommandError("EMAIL_HOST_USER is not set.")
        if not settings.EMAIL_HOST_PASSWORD.strip():
            raise CommandError(
                "EMAIL_HOST_PASSWORD is not set. Add your Brevo SMTP key to .env."
            )

        subject = "Kryptera — SMTP test"
        text_body = (
            "This is a test message from Kryptera.\n\n"
            f"SMTP host: {settings.EMAIL_HOST}\n"
            f"From: {settings.DEFAULT_FROM_EMAIL}\n"
        )
        html_body = (
            "<p>This is a test message from <strong>Kryptera</strong>.</p>"
            f"<p>SMTP host: {settings.EMAIL_HOST}<br>"
            f"From: {settings.DEFAULT_FROM_EMAIL}</p>"
        )

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
            reply_to=[settings.REPLY_TO_EMAIL]
            if getattr(settings, "REPLY_TO_EMAIL", None)
            else None,
        )
        msg.attach_alternative(html_body, "text/html")

        try:
            msg.send(fail_silently=False)
        except Exception as exc:
            raise CommandError(f"Failed to send test email: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(f"Test email sent to {recipient} via {settings.EMAIL_HOST}.")
        )
