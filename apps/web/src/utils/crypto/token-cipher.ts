import {
  decryptWithKey,
  encryptWithKey,
  loadHexKeyFromEnv,
} from "@/utils/crypto/aes-gcm";

export type TokenCipher = {
  encrypt: (plain: string) => string;
  decrypt: (payload: string) => string;
};

// Optional integrations bind their key on first use, never during app startup.
// The key stays fixed for the lifetime of the cipher. See ADR 0003.
export function createTokenCipher(envVarName: string): TokenCipher {
  let key: Buffer | undefined;
  const getKey = () => (key ??= loadHexKeyFromEnv(envVarName));
  return {
    encrypt: (plain) => encryptWithKey(plain, getKey()),
    decrypt: (payload) => decryptWithKey(payload, getKey()),
  };
}
