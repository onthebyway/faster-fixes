import { afterEach, expect, it, vi } from "vitest";
import {
  getStorageBucket,
  getStorageProvider,
  getStorageRegion,
} from "./config";

afterEach(() => vi.unstubAllEnvs());

it("supports legacy AWS configuration with empty generic variables", () => {
  vi.stubEnv("STORAGE_PROVIDER", "");
  vi.stubEnv("STORAGE_BUCKET_NAME", "");
  vi.stubEnv("STORAGE_REGION", "");
  vi.stubEnv("R2_ACCOUNT_ID", "");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "access-key");
  vi.stubEnv("AWS_BUCKET_NAME", "aws-bucket");
  vi.stubEnv("AWS_REGION", "eu-west-1");
  expect(getStorageProvider()).toBe("s3");
  expect(getStorageBucket()).toBe("aws-bucket");
  expect(getStorageRegion()).toBe("eu-west-1");
});

it("defaults local storage to the uploads bucket", () => {
  vi.stubEnv("STORAGE_PROVIDER", "local");
  vi.stubEnv("STORAGE_BUCKET_NAME", "");
  expect(getStorageBucket()).toBe("uploads");
});
