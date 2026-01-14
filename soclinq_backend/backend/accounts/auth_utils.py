from django.contrib.auth import get_user_model

User = get_user_model()

def get_user_by_identifier(identifier):
    """
    Identifier can be phone number or email
    """
    if not identifier:
        return None

    if "@" in identifier:
        return User.objects.filter(email__iexact=identifier).first()

    return User.objects.filter(phone_number=identifier).first()
