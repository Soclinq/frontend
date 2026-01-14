import requests
from django.conf import settings
from audit.utils import log_action

def send_sms(*, phone_number, message):
    url = f"{settings.TERMII_BASE_URL}/sms/send"
    payload = {
        "to": phone_number,
        "from": settings.TERMII_SENDER_ID,
        "sms": message,
        "type": "plain",
        "api_key": settings.TERMII_API_KEY,
        "channel": "generic",
    }

    response = requests.post(url, json=payload, timeout=10)
    response.raise_for_status()

    return response.json()
