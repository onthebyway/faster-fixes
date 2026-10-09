import "server-only";

import { aws, cloudflare, custom } from "@better-upload/server/clients";
import { getStorageProvider, getStorageRegion } from "./config";

export function createS3Client() {
  const provider = getStorageProvider();
  if (provider !== "s3") {
    return cloudflare({
      accountId: process.env.R2_ACCOUNT_ID ?? "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    });
  }
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    region: getStorageRegion(),
  };
  const endpoint = process.env.STORAGE_ENDPOINT;
  if (!endpoint) return aws(credentials);
  const url = new URL(endpoint);
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/") {
    throw new Error(
      "STORAGE_ENDPOINT must be an HTTP(S) origin without a path",
    );
  }
  return custom({
    ...credentials,
    host: url.host,
    secure: url.protocol === "https:",
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== "false",
  });
}

// Credential validation is deferred until use, so builds need no storage account.
let client: ReturnType<typeof createS3Client> | undefined;
const getClient = () => (client ??= createS3Client());
export const s3Client: ReturnType<typeof createS3Client> = {
  get buildBucketUrl() {
    return getClient().buildBucketUrl;
  },
  get s3() {
    return getClient().s3;
  },
};
