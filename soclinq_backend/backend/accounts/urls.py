from django.urls import path
from .views import (SendOTPView, LoginView, VerifyOTPView,
        RegisterSubmitView, CSRFView, MeView, RefreshView,
        ProfilePhotoUploadView, ProfileUpdateView, UsernameCheckView,
        UsernameClaimView, SendPhoneOTPView, VerifyPhoneOTPView, ProfileMeView,
        ProfileUploadPhotoView, ProfileRequestPhoneOtpView, ProfileVerifyPhoneOtpView, 
        ProfileCheckUsernameView, ProfileSetUsernameView, ProfileChangePhoneStartView,
        ProfileDeviceSettingsView, ProfileEmergencyContactsListView, ProfileEmergencyContactsCreateView,
        ProfileEmergencyContactsDeleteView,  ProfileEmergencyTestPingView, ProfilePrivacyUpdateView, ProfileExportView,
        ProfileDeleteRequestView, ProfileSettingsView
        )

urlpatterns = [
    path("send-otp/", SendOTPView.as_view()),
    path("me/", MeView.as_view()),
    path("refresh/", RefreshView.as_view()),
    path("register/", RegisterSubmitView.as_view()),
    path("login/", LoginView.as_view()),
    path("verify-otp/", VerifyOTPView.as_view()),
    path("csrf/", CSRFView.as_view()),
    path("profile/update/", ProfileUpdateView.as_view(), name="profile-update"),
    path("profile/photo/", ProfilePhotoUploadView.as_view(), name="profile-photo"),

    path("usernames/check/", UsernameCheckView.as_view(), name="username-check"),
    path("usernames/claim/", UsernameClaimView.as_view(), name="username-claim"),



    path("profile/phone/send-otp/", SendPhoneOTPView.as_view(), name="send-phone-otp"),
    path("profile/phone/verify-otp/", VerifyPhoneOTPView.as_view(), name="verify-phone-otp"),

    path("profile/me/", ProfileMeView.as_view(), name="profile-me"),
    path("profile/upload-photo/", ProfileUploadPhotoView.as_view(), name="profile-upload-photo"),
    path("profile/phone/request-otp/", ProfileRequestPhoneOtpView.as_view(), name="profile-request-phone-otp"),
    path("profile/phone/verify-otp/", ProfileVerifyPhoneOtpView.as_view(), name="profile-phone-verify-otp"),
    path("profile/check-username/", ProfileCheckUsernameView.as_view(), name="profile-check-username"),
    path("profile/set-username/", ProfileSetUsernameView.as_view(), name="profile-set-username"),
    path("profile/phone/change/start/", ProfileChangePhoneStartView.as_view(), name="profile-phone-change-start"),
    path("profile/device-settings/", ProfileDeviceSettingsView.as_view(), name="profile-device-settings"),
    path("profile/emergency-contacts/list", ProfileEmergencyContactsListView.as_view(), name="profile-emergency-contacts-list"),
    path("profile/emergency-contacts/create", ProfileEmergencyContactsCreateView.as_view(), name="profile-emergency-contacts-create"),
    path("profile/emergency-contacts/<uuid:id>/", ProfileEmergencyContactsDeleteView.as_view(), name="profile-emergency-contacts-delete"),
    path("profile/emergency-contacts/test-ping/", ProfileEmergencyTestPingView.as_view(), name="profile-emergency-test-ping"),
    path("profile/privacy/", ProfilePrivacyUpdateView.as_view(), name="profile-privacy-update"),
    path("profile/export/", ProfileExportView.as_view(), name="profile-export"),
    path("profile/delete-request/", ProfileDeleteRequestView.as_view(), name="profile-delete-request"),
    path("profile/settings/", ProfileSettingsView.as_view(), name="profile-settings"),

]
