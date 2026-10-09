import { BadRequestError } from "@/server/errors/domain-errors";

export async function getUploadBody(
  stream: ReadableStream<Uint8Array> | null,
  size: number,
) {
  if (!stream) throw new BadRequestError("Upload body required.");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    let result = await reader.read();
    while (!result.done) {
      const { value } = result;
      bytes += value.length;
      if (bytes > size) {
        await reader.cancel();
        throw new BadRequestError("Upload exceeds its authorized size.");
      }
      chunks.push(value);
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }
  if (bytes !== size) throw new BadRequestError("Upload size does not match.");
  return Buffer.concat(chunks);
}

export type GetUploadBodyOutput = Awaited<ReturnType<typeof getUploadBody>>;
