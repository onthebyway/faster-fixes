import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createS3Client } from "./index";
import { getStorageProvider } from "./config";

beforeEach(() => {
  vi.stubEnv("AWS_ACCESS_KEY_ID", "test-access");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test-secret");
  vi.stubEnv("R2_ACCESS_KEY_ID", "test-access");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
});
afterEach(() => vi.unstubAllEnvs());

it("supports HTTP path-style S3 endpoints such as self-hosted MinIO", () => {
  vi.stubEnv("STORAGE_PROVIDER", "s3");
  vi.stubEnv("STORAGE_ENDPOINT", "http://localhost:9000");
  vi.stubEnv("STORAGE_FORCE_PATH_STYLE", "true");
  expect(createS3Client().buildBucketUrl("screenshots")).toBe(
    "http://localhost:9000/screenshots",
  );
});

it("supports AWS virtual-host addressing and the R2 default", () => {
  vi.stubEnv("STORAGE_PROVIDER", "s3");
  vi.stubEnv("STORAGE_ENDPOINT", undefined);
  vi.stubEnv("STORAGE_REGION", "eu-west-1");
  expect(createS3Client().buildBucketUrl("screenshots")).toBe(
    "https://screenshots.s3.eu-west-1.amazonaws.com",
  );
  vi.stubEnv("STORAGE_PROVIDER", "r2");
  vi.stubEnv("R2_ACCOUNT_ID", "account");
  expect(createS3Client().buildBucketUrl("screenshots")).toBe(
    "https://screenshots.account.r2.cloudflarestorage.com",
  );
});

it("rejects invalid providers and endpoints", () => {
  vi.stubEnv("STORAGE_PROVIDER", "unknown");
  expect(getStorageProvider).toThrow("Unsupported storage provider");
  vi.stubEnv("STORAGE_PROVIDER", "s3");
  vi.stubEnv("STORAGE_ENDPOINT", "http://localhost:9000/path");
  expect(createS3Client).toThrow("without a path");
});
