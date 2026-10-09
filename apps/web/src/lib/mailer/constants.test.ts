import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("supports a separately verified sender domain", async () => {
  vi.stubEnv("DOMAIN_NAME", "app.example.com");
  vi.stubEnv("MAIL_FROM_DOMAIN", "mail.example.com");
  vi.stubEnv("EMAIL_FROM", undefined);
  const { SENDER_EMAIL, NO_REPLY_EMAIL } =
    await import("@/lib/mailer/constants");
  expect(SENDER_EMAIL).toBe("contact@mail.example.com");
  expect(NO_REPLY_EMAIL).toBe("noreply@mail.example.com");
});

it("treats empty optional environment values as unset", async () => {
  vi.stubEnv("DOMAIN_NAME", "app.example.com");
  vi.stubEnv("MAIL_FROM_DOMAIN", "");
  vi.stubEnv("EMAIL_FROM", "");
  const { SENDER_EMAIL, NO_REPLY_EMAIL } =
    await import("@/lib/mailer/constants");
  expect(SENDER_EMAIL).toBe("contact@app.example.com");
  expect(NO_REPLY_EMAIL).toBe("noreply@app.example.com");
});

it("supports a full sender address override", async () => {
  vi.stubEnv("EMAIL_FROM", "FasterFixes <support@example.com>");
  const { SENDER_EMAIL, NO_REPLY_EMAIL } =
    await import("@/lib/mailer/constants");
  expect(SENDER_EMAIL).toBe("FasterFixes <support@example.com>");
  expect(NO_REPLY_EMAIL).toBe(SENDER_EMAIL);
});
