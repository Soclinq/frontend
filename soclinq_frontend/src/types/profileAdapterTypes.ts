export type ProfileAdapter = {
    me: () => string;
  
    updateAccount: () => string;
    uploadPhoto: () => string;
  
    requestPhoneOtp: () => string;
    verifyPhoneOtp: () => string;
  
    checkUsername: (username: string) => string;
    setUsername: () => string;
  
    changePhoneStart: () => string;
  
    updateDeviceSettings: () => string;
  
    listEmergencyContacts: () => string;
    addEmergencyContact: () => string;
    deleteEmergencyContact: (id: string) => string;
    testEmergencyPing: () => string;

    updatePrivacy: () => string;
    exportData: () => string;
    requestDeletion: () => string;
    updateSettings: () => string;
    activityHistory: () => string;
  };
  