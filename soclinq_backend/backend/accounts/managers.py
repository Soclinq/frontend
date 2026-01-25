from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, phone_number, username, password=None, **extra_fields):
        if not phone_number:
            raise ValueError("Phone number is required")

        user = self.model(
            phone_number=phone_number,
            username=username,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "HQ_ADMIN")

        return self.create_user(phone_number, username, password, **extra_fields)
    
    def generate_username(self, identifier):
        base = identifier.split("@")[0]
        username = base
        i = 1
        while self.model.objects.filter(username=username).exists():
            username = f"{base}{i}"
            i += 1
        return username

