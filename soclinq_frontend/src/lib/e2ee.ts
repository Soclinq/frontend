export type E2EEContext = {
    encrypt: (plaintext: string) => Promise<string>;
    decrypt: (ciphertext: string) => Promise<string>;
    enabled: boolean;
  };
  
  export const NoopE2EE: E2EEContext = {
    enabled: false,
    encrypt: async (v) => v,
    decrypt: async (v) => v,
  };
  