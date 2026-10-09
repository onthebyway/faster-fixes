import { deleteStorageObjects } from "./objects";
import { prisma } from "@workspace/db";

// S3 accepts at most 1000 keys in one DeleteObjects request.
const DELETE_BATCH_SIZE = 1000;

/**
 * Deletes many Assets: removes their objects from S3 (best-effort) then deletes
 * the DB records. The batched form of `deleteAsset`, for a cascade that frees a
 * whole Project's screenshots in a handful of requests instead of one per Asset.
 */
export async function deleteAssets(assetIds: string[]) {
  for (let start = 0; start < assetIds.length; start += DELETE_BATCH_SIZE) {
    const batchIds = assetIds.slice(start, start + DELETE_BATCH_SIZE);
    const assets = await prisma.asset.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, key: true, bucket: true, provider: true },
    });

    const keysByBucket = new Map<
      string,
      { bucket: string; provider: string; keys: string[] }
    >();
    for (const asset of assets) {
      const groupKey = `${asset.provider}:${asset.bucket}`;
      const group = keysByBucket.get(groupKey) ?? {
        bucket: asset.bucket,
        provider: asset.provider,
        keys: [],
      };
      group.keys.push(asset.key);
      keysByBucket.set(groupKey, group);
    }

    for (const { bucket, provider, keys } of keysByBucket.values()) {
      await deleteBucketObjects(bucket, keys, provider);
    }

    await prisma.asset.deleteMany({
      where: { id: { in: assets.map((asset) => asset.id) } },
    });
  }
}

// Best-effort: a failed S3 delete is logged and never blocks the DB cleanup.
async function deleteBucketObjects(
  bucket: string,
  keys: string[],
  provider: string,
) {
  try {
    const { errors } = await deleteStorageObjects(bucket, keys, provider);
    for (const error of errors) {
      console.error(
        `Failed to delete S3 object (key=${error.key}): ${error.code} ${error.message}`,
      );
    }
  } catch (error) {
    console.error(
      `Failed to delete ${keys.length} S3 objects (bucket=${bucket}):`,
      error,
    );
  }
}
