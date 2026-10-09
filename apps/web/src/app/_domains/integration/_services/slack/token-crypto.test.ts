import { afterEach, describe, expect, it, vi } from "vitest";

describe("Slack token encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("can be imported without optional Slack credentials", async () => {
    vi.stubEnv("SLACK_TOKEN_ENCRYPTION_KEY", undefined);
    const cipher = await import("./token-crypto");

    expect(() => cipher.encryptSlackToken("token")).toThrow(
      "SLACK_TOKEN_ENCRYPTION_KEY is not set",
    );
  });

  it("round-trips tokens when Slack is configured", async () => {
    vi.stubEnv("SLACK_TOKEN_ENCRYPTION_KEY", "a".repeat(64));
    const cipher = await import("./token-crypto");

    const encrypted = cipher.encryptSlackToken("secret-token");

    expect(encrypted).not.toContain("secret-token");
    expect(cipher.decryptSlackToken(encrypted)).toBe("secret-token");
  });
});
