import { afterEach, expect, it, vi } from "vitest";
import { createInngest } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("sends production events to self-hosted Inngest with the configured event key", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("INNGEST_DEV", "0");
  vi.stubEnv("INNGEST_BASE_URL", "http://inngest:8288");
  vi.stubEnv("INNGEST_EVENT_KEY", "self-hosted-event-key");
  vi.stubEnv("INNGEST_SIGNING_KEY", "a".repeat(64));
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({ status: 200, ids: ["event-id"] }));
  vi.stubGlobal("fetch", fetch);
  const client = createInngest();
  expect(client.mode).toBe("cloud");
  expect(client.apiBaseUrl).toBe("http://inngest:8288");
  expect(client.signingKey).toBe("a".repeat(64));
  expect(
    await client.send({
      name: "user/email-verified",
      data: { userId: "user_1" },
    }),
  ).toEqual({ ids: ["event-id"] });
  const request = fetch.mock.calls[0]?.[0];
  const url = request instanceof Request ? request.url : request?.toString();
  expect(url).toBe("http://inngest:8288/e/self-hosted-event-key");
});

it("retains local development defaults but honors explicit production mode", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("INNGEST_BASE_URL", undefined);
  vi.stubEnv("INNGEST_DEV", undefined);
  expect(createInngest().mode).toBe("dev");
  vi.stubEnv("INNGEST_DEV", "0");
  expect(createInngest().mode).toBe("cloud");
});
