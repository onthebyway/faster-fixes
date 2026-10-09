import "server-only";

import { constants } from "node:fs";
import { mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

export function getLocalObjectPath(root: string, bucket: string, key: string) {
  for (const value of [bucket, key]) {
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) ||
      value
        .split("/")
        .some((part) => part === "" || part === "." || part === "..")
    ) {
      throw new Error("Invalid local storage path");
    }
  }
  if (bucket.includes("/")) throw new Error("Invalid local storage bucket");
  return resolve(root, bucket, key);
}

export class LocalStorage {
  constructor(private root = process.env.STORAGE_LOCAL_PATH ?? "./storage") {}

  private async assertInsideRoot(path: string) {
    const root = await realpath(this.root);
    const actual = await realpath(path);
    if (!actual.startsWith(`${root}${sep}`)) {
      throw new Error("Storage path escapes its root");
    }
  }

  async put(bucket: string, key: string, body: Uint8Array) {
    const path = getLocalObjectPath(this.root, bucket, key);
    await mkdir(this.root, { recursive: true });
    let directory = resolve(this.root);
    for (const part of relative(directory, dirname(path)).split(sep)) {
      directory = resolve(directory, part);
      try {
        await mkdir(directory);
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            error.code === "EEXIST"
          )
        ) {
          throw error;
        }
      }
      await this.assertInsideRoot(directory);
    }
    const file = await open(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_TRUNC |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.writeFile(body);
    } finally {
      await file.close();
    }
  }

  async read(bucket: string, key: string) {
    const path = getLocalObjectPath(this.root, bucket, key);
    await this.assertInsideRoot(path);
    return readFile(path);
  }

  async delete(bucket: string, key: string) {
    const path = getLocalObjectPath(this.root, bucket, key);
    try {
      await this.assertInsideRoot(path);
      await unlink(path);
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        throw error;
      }
    }
  }
}
