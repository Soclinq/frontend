from .sms_service import send_sms
from .email_service import send_email
from audit.utils import log_action

def send_otp_notification(*, identifier, otp, purpose):
    message = f"Your Linqmi OTP is {otp}. Valid for 5 minutes."

    if identifier:
        send_sms(
            phone_number=identifier,
            message=message
        )

    if identifier:
        send_email(
            to_email=identifier,
            subject="Your Linqmi OTP",
            html_content=f"<p>{message}</p>",
        )

    
