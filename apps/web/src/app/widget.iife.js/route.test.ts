import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("self-hosted widget script", () => {
  it("serves the workspace widget build in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(readFile).mockResolvedValue("/* self-hosted widget */");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(await response.text()).toBe("/* self-hosted widget */");
    expect(readFile).toHaveBeenCalledWith(
      expect.stringContaining("packages/widget/dist/widget.iife.js"),
      "utf8",
    );
  });
});
