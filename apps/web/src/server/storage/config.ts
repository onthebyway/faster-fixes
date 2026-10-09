import { requireEnv } from "@/utils/environment/require-env";

export function getStorageProvider() {
  const provider = process.env.STORAGE_PROVIDER;
  if (!provider) {
    if (process.env.R2_ACCOUNT_ID) return "r2";
    if (process.env.AWS_ACCESS_KEY_ID) return "s3";
    return "r2";
  }
  if (provider === "local" || provider === "s3" || provider === "r2") {
    return provider;
  }
  throw new Error(`Unsupported storage provider: ${provider}`);
}

export function getStorageBucket() {
  const configuredBucket = process.env.STORAGE_BUCKET_NAME;
  const bucket = configuredBucket === "" ? undefined : configuredBucket;
  if (getStorageProvider() === "local") return bucket ?? "uploads";
  return requireEnv(
    "STORAGE_BUCKET_NAME",
    bucket ?? process.env.AWS_BUCKET_NAME,
  );
}

export function getStorageRegion() {
  const storageRegion = process.env.STORAGE_REGION;
  const awsRegion = process.env.AWS_REGION;
  if (storageRegion !== undefined && storageRegion !== "") return storageRegion;
  if (awsRegion !== undefined && awsRegion !== "") return awsRegion;
  return "us-east-1";
}
