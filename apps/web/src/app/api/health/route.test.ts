import { expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@workspace/db", () => ({ prisma: { $queryRaw: query } }));
import { GET } from "./route";

it("reports readiness when PostgreSQL responds", async () => {
  query.mockResolvedValueOnce([{ "?column?": 1 }]);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});

it("reports database outages without exposing credentials or errors", async () => {
  query.mockRejectedValueOnce(
    new Error("Connection failed: secret database URL"),
  );
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "unavailable" });
});
