import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createMailer } from "./mailer-factory";
import { PlunkMailer } from "./plunk";
import { ResendMailer } from "./resend";
import { SmtpMailer } from "./smtp";

beforeEach(() => {
  for (const key of [
    "MAILER_PROVIDER",
    "RESEND_API_KEY",
    "PLUNK_SECRET_KEY",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_PORT",
  ]) {
    vi.stubEnv(key, undefined);
  }
  vi.stubEnv("SMTP_HOST", "localhost");
});
afterEach(() => vi.unstubAllEnvs());

it("defaults to SMTP without cloud keys", () => {
  expect(createMailer()).toBeInstanceOf(SmtpMailer);
});

it("preserves API-key-only configurations and supports explicit selection", () => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  expect(createMailer()).toBeInstanceOf(ResendMailer);
  vi.stubEnv("PLUNK_SECRET_KEY", "plunk-test");
  vi.stubEnv("MAILER_PROVIDER", "plunk");
  expect(createMailer()).toBeInstanceOf(PlunkMailer);
  vi.stubEnv("MAILER_PROVIDER", "smtp");
  expect(createMailer()).toBeInstanceOf(SmtpMailer);
});

it("fails clearly for invalid SMTP configuration and unknown providers", () => {
  vi.stubEnv("SMTP_PORT", "not-a-port");
  expect(createMailer).toThrow("SMTP_PORT");
  vi.stubEnv("SMTP_PORT", "587");
  vi.stubEnv("SMTP_USER", "user");
  expect(createMailer).toThrow("configured together");
  vi.stubEnv("SMTP_USER", undefined);
  vi.stubEnv("SMTP_HOST", undefined);
  expect(createMailer).toThrow("SMTP_HOST");
  vi.stubEnv("MAILER_PROVIDER", "unknown");
  expect(createMailer).toThrow("Unsupported mailer provider");
});
