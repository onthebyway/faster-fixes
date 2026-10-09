import "server-only";

import { requireEnv } from "@/utils/environment/require-env";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const accessSchema = z.object({
  method: z.enum(["GET", "PUT"]),
  bucket: z.string(),
  key: z.string(),
  expires: z.number().int(),
  contentType: z.string().optional(),
  size: z
    .number()
    .int()
    .min(0)
    .max(2 * 1024 * 1024)
    .optional(),
});

type LocalAccess = z.infer<typeof accessSchema>;

function sign(payload: string) {
  return createHmac(
    "sha256",
    requireEnv("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET),
  )
    .update(payload)
    .digest();
}

export function createLocalStorageUrl(
  access: Omit<LocalAccess, "expires">,
  expiresIn = 120,
) {
  const payload = Buffer.from(
    JSON.stringify({
      ...access,
      expires: Math.floor(Date.now() / 1000) + expiresIn,
    }),
  ).toString("base64url");
  const signature = sign(payload).toString("base64url");
  const base = requireEnv(
    "BASE_URL",
    process.env.BASE_URL ?? process.env.BETTER_AUTH_URL,
  ).replace(/\/$/, "");
  const path = [access.bucket, ...access.key.split("/")]
    .map(encodeURIComponent)
    .join("/");
  return `${base}/api/storage/${path}?token=${payload}.${signature}`;
}

export function verifyLocalStorageAccess(
  token: string,
  expected: Pick<LocalAccess, "method" | "bucket" | "key">,
) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const actual = Buffer.from(signature, "base64url");
  const required = sign(payload);
  if (actual.length !== required.length || !timingSafeEqual(actual, required)) {
    return null;
  }
  try {
    const access = accessSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    );
    if (
      access.method !== expected.method ||
      access.bucket !== expected.bucket ||
      access.key !== expected.key ||
      access.expires <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return access;
  } catch {
    return null;
  }
}
