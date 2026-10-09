import { getStorageObjectUrl } from "./objects";

type AssetForSignedUrl = {
  key: string;
  bucket: string;
  provider?: string;
};

export async function getSignedAssetUrl(
  asset: AssetForSignedUrl,
  expiresIn = 3600,
): Promise<string> {
  return getStorageObjectUrl(asset, expiresIn);
}
