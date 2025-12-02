"""Azure Communication Services email helper."""
from __future__ import annotations

import logging

from azure.communication.email import EmailClient
from azure.core.exceptions import AzureError

from settings import get_settings

logger = logging.getLogger(__name__)
_client: EmailClient | None = None


def _get_client() -> EmailClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = EmailClient.from_connection_string(settings.email_connection_str)
    return _client


def send_otp_email(recipient: str, otp_code: str) -> None:
    settings = get_settings()
    client = _get_client()
    message = {
        "senderAddress": settings.from_email,
        "recipients": {"to": [{"address": recipient}]},
        "content": {
            "subject": "Your Virtual Teaching Assistant verification code",
            "plainText": f"Your one-time password is {otp_code}. It expires in {settings.otp_expire_minutes} minutes.",
            "html": (
                "<html><body>"
                f"<p>Your one-time password is <strong>{otp_code}</strong>.</p>"
                f"<p>This code expires in {settings.otp_expire_minutes} minutes.</p>"
                "</body></html>"
            ),
        },
    }
    try:
        poller = client.begin_send(message)
        poller.result()
    except AzureError as exc:  # pragma: no cover - network dependent
        logger.exception("Failed to send OTP email", extra={"recipient": recipient})
        raise RuntimeError("Unable to send OTP email right now") from exc