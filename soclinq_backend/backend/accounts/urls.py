from django.urls import path
from .views import SendOTPView, LoginView, VerifyOTPView, RegisterSubmitView, CSRFView

urlpatterns = [
    path("send-otp/", SendOTPView.as_view()),
    path("register/", RegisterSubmitView.as_view()),
    path("login/", LoginView.as_view()),
    path("verify-otp/", VerifyOTPView.as_view()),
    path("csrf/", CSRFView.as_view()),

]
