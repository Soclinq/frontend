import { ProfileAdapter } from "@/types/profileAdapterTypes";

export const profileAdapter: ProfileAdapter = {

  me: () => "/auth/profile/me/",
  updateAccount: () => "/auth/profile/update/",
  uploadPhoto: () => "/auth/profile/upload-photo/",
  requestPhoneOtp: () => "/auth/profile/phone/request-otp/",
  verifyPhoneOtp: () => "/auth/profile/phone/verify-otp/",
  checkUsername: (username: string) =>

    `/auth/profile/check-username/?username=${encodeURIComponent(username)}`,
  setUsername: () => "/auth/profile/set-username/",
  changePhoneStart: () => "/auth/profile/phone/change/start/",
  updateDeviceSettings: () => `/auth/profile/device-settings/`,

  listEmergencyContacts: () => `/auth/profile/emergency-contacts/list`,
  addEmergencyContact: () => `/auth/profile/emergency-contacts/create`,
  deleteEmergencyContact: (id: string) => `/auth/profile/emergency-contacts/${id}/`,
  testEmergencyPing: () => `/auth/profile/emergency-contacts/test-ping/`,
  updatePrivacy: () => `/auth/profile/privacy/`,
  exportData: () => `/auth/profile/export/`,
  requestDeletion: () => `/auth/profile/delete-request/`,
  updateSettings: () => `/auth/profile/settings/`,
  activityHistory: () => "/api/profile/activity-history",
  
  
};
