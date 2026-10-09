import "server-only";

import { s3Client } from "@/server/storage";
import {
  deleteObject,
  deleteObjects,
  presignGetObject,
  putObject,
} from "@better-upload/server/helpers";
import { getStorageProvider } from "./config";
import { LocalStorage } from "./local";
import { createLocalStorageUrl } from "./local-url";

type StoredObject = { bucket: string; key: string; provider?: string };
const isLocal = (object: StoredObject) =>
  (object.provider ?? getStorageProvider()) === "local";

export async function putStorageObject(
  object: StoredObject & { body: Buffer<ArrayBuffer>; contentType: string },
) {
  if (isLocal(object)) {
    return new LocalStorage().put(object.bucket, object.key, object.body);
  }
  return putObject(s3Client, object);
}

export async function deleteStorageObject(object: StoredObject) {
  if (isLocal(object)) {
    return new LocalStorage().delete(object.bucket, object.key);
  }
  return deleteObject(s3Client, object);
}

export async function deleteStorageObjects(
  bucket: string,
  keys: string[],
  provider?: string,
) {
  if ((provider ?? getStorageProvider()) === "local") {
    for (const key of keys) await new LocalStorage().delete(bucket, key);
    return { errors: [] };
  }
  return deleteObjects(s3Client, {
    bucket,
    objects: keys.map((key) => ({ key })),
    quiet: true,
  });
}

export function getStorageObjectUrl(object: StoredObject, expiresIn = 3600) {
  if (isLocal(object)) {
    return createLocalStorageUrl({ ...object, method: "GET" }, expiresIn);
  }
  return presignGetObject(s3Client, { ...object, expiresIn });
}
