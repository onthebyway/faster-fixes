import { afterEach, expect, it, vi } from "vitest";
import { getAppOctokit, getInstallationOctokit } from "./github-app";

afterEach(() => vi.unstubAllEnvs());

it("loads without GitHub credentials, but requires them when used", () => {
  vi.stubEnv("GITHUB_APP_ID", undefined);
  vi.stubEnv("GITHUB_PRIVATE_KEY", undefined);
  expect(() => getAppOctokit()).toThrow("GITHUB_APP_ID");
  expect(() => getInstallationOctokit(1)).toThrow("GITHUB_APP_ID");
  vi.stubEnv("GITHUB_APP_ID", "123");
  expect(() => getAppOctokit()).toThrow("GITHUB_PRIVATE_KEY");
});
