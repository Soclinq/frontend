export interface SecurityStatus {
    riskScore: number;
    signals: {
      phoneVerified: boolean;
      trackingEnabled: boolean;
      locationEnabled: boolean;
      recentSuspiciousActivity: boolean;
      newDeviceDetected: boolean;
    };
  }
  
  export async function fetchSecurityStatus(): Promise<SecurityStatus> {
    // 🔁 Replace with real fetch later
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            riskScore: 35,
            signals: {
              phoneVerified: true,
              trackingEnabled: true,
              locationEnabled: true,
              recentSuspiciousActivity: false,
              newDeviceDetected: false,
            },
          }),
        700
      )
    );
  }
  