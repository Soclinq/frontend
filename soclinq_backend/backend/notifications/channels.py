from .sms_service import send_sms
from .email_service import send_email
from audit.utils import log_action

def send_otp_notification(*, user, otp, purpose):
    message = f"Your Linqmi OTP is {otp}. Valid for 5 minutes."

    if user.phone_number:
        send_sms(
            phone_number=user.phone_number,
            message=message
        )

    if user.email:
        send_email(
            to_email=user.email,
            subject="Your Linqmi OTP",
            html_content=f"<p>{message}</p>",
        )

    
