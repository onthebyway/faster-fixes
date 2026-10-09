import { afterEach, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({ prisma: {} }));
vi.mock("@/lib/mailer/client", () => ({ mailer: {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("initializes self-hosted auth without optional provider credentials", async () => {
  vi.stubEnv("NEXT_PUBLIC_IS_CLOUD", "false");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-secret-with-at-least-thirty-two-characters",
  );
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  for (const key of [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SIGNING_SECRET",
    "GITHUB_PRIVATE_KEY",
    "LINEAR_TOKEN_ENCRYPTION_KEY",
    "JIRA_TOKEN_ENCRYPTION_KEY",
    "SLACK_TOKEN_ENCRYPTION_KEY",
  ]) {
    vi.stubEnv(key, undefined);
  }

  const { auth } = await import("@/server/auth");
  expect(auth.options.plugins.map((plugin) => plugin.id)).not.toContain(
    "stripe",
  );
}, 15_000);
