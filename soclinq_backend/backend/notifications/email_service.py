import requests
from django.conf import settings


def send_email(*, to_email, subject, html_content):
    url = "https://api.zeptomail.com/v1.1/email"
    headers = {
        "Authorization": f"Zoho-enczapikey {settings.ZEPTOMAIL_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "from": {
            "address": settings.ZEPTOMAIL_SENDER_EMAIL,
            "name": settings.ZEPTOMAIL_SENDER_NAME,
        },
        "to": [
            {
                "email_address": {
                    "address": to_email,
                }
            }
        ],
        "subject": subject,
        "htmlbody": html_content,
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()

    return response.json()
