import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createLocalStorageUrl, verifyLocalStorageAccess } from "./local-url";

const object = {
  method: "PUT" as const,
  bucket: "uploads",
  key: "user-avatars/user/image.png",
  contentType: "image/png",
  size: 10,
};
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-signing-secret");
  vi.stubEnv("BASE_URL", "https://app.example.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it("binds access to the method, object, MIME type, and size", () => {
  const url = new URL(createLocalStorageUrl(object));
  const token = url.searchParams.get("token")!;
  expect(verifyLocalStorageAccess(token, object)).toMatchObject(object);
  expect(
    verifyLocalStorageAccess(token, { ...object, method: "GET" }),
  ).toBeNull();
  expect(
    verifyLocalStorageAccess(token, { ...object, key: "different.png" }),
  ).toBeNull();
  expect(
    verifyLocalStorageAccess(token, { ...object, bucket: "other" }),
  ).toBeNull();
  expect(verifyLocalStorageAccess(`${token}tampered`, object)).toBeNull();
});

it("expires tokens and rejects malformed input", () => {
  vi.useFakeTimers();
  const token = new URL(createLocalStorageUrl(object, 120)).searchParams.get(
    "token",
  )!;
  vi.advanceTimersByTime(120_000);
  expect(verifyLocalStorageAccess(token, object)).toBeNull();
  for (const value of ["", "invalid", "a.b.c", "bad.signature"]) {
    expect(verifyLocalStorageAccess(value, object)).toBeNull();
  }
});
