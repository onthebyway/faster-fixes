import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { getLocalObjectPath, LocalStorage } from "./local";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ff-storage-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it("persists, reads, and idempotently deletes an object", async () => {
  const storage = new LocalStorage(root);
  await storage.put(
    "uploads",
    "feedback-screenshots/project/image.png",
    Buffer.from("image"),
  );
  expect(
    await storage.read("uploads", "feedback-screenshots/project/image.png"),
  ).toEqual(Buffer.from("image"));
  await storage.delete("uploads", "feedback-screenshots/project/image.png");
  await storage.delete("uploads", "feedback-screenshots/project/image.png");
  await expect(
    storage.read("uploads", "feedback-screenshots/project/image.png"),
  ).rejects.toThrow();
});

it("rejects absolute paths, traversal, backslashes, and invalid buckets", () => {
  for (const key of [
    "../secret",
    "a/../../secret",
    "/secret",
    "a\\secret",
    "a//b",
    "a/./b",
    "%2e%2e/secret",
  ]) {
    expect(() => getLocalObjectPath(root, "uploads", key)).toThrow();
  }
  expect(() => getLocalObjectPath(root, "../uploads", "image.png")).toThrow();
  expect(() => getLocalObjectPath(root, "a/b", "image.png")).toThrow();
});

it("rejects symlinks escaping the configured root", async () => {
  await mkdir(join(root, "uploads"));
  await symlink(tmpdir(), join(root, "uploads", "outside"));
  const storage = new LocalStorage(root);
  await expect(
    storage.put("uploads", "outside/image.png", Buffer.from("image")),
  ).rejects.toThrow("escapes its root");
});
