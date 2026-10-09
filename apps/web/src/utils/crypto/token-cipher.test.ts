import { afterEach, describe, expect, it, vi } from "vitest";

import { createTokenCipher } from "@/utils/crypto/token-cipher";

const ENV_VAR = "TEST_TOKEN_ENCRYPTION_KEY";

describe("createTokenCipher", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a token through encrypt and decrypt", () => {
    vi.stubEnv(ENV_VAR, "a".repeat(64));
    const cipher = createTokenCipher(ENV_VAR);

    const payload = cipher.encrypt("secret-token");

    expect(payload).not.toContain("secret-token");
    expect(cipher.decrypt(payload)).toBe("secret-token");
  });

  it("rejects a payload encrypted with a different key", () => {
    vi.stubEnv(ENV_VAR, "a".repeat(64));
    const payload = createTokenCipher(ENV_VAR).encrypt("secret-token");

    vi.stubEnv(ENV_VAR, "b".repeat(64));
    expect(() => createTokenCipher(ENV_VAR).decrypt(payload)).toThrow();
  });

  it("does not require credentials until the integration is used", () => {
    vi.stubEnv(ENV_VAR, undefined);
    const cipher = createTokenCipher(ENV_VAR);
    expect(() => cipher.encrypt("token")).toThrow(`${ENV_VAR} is not set`);
    expect(() => cipher.decrypt("payload")).toThrow(`${ENV_VAR} is not set`);
  });

  it("throws when the key has the wrong length", () => {
    vi.stubEnv(ENV_VAR, "abcd");
    expect(() => createTokenCipher(ENV_VAR).encrypt("token")).toThrow(
      "must decode to 32 bytes",
    );
  });
});
