import { BadRequestError } from "@/server/errors/domain-errors";
import { getStorageProvider } from "@/server/storage/config";
import { getLocalObjectPath, LocalStorage } from "@/server/storage/local";
import { verifyLocalStorageAccess } from "@/server/storage/local-url";
import { getUploadBody } from "./_services/get-upload-body";

type Context = { params: Promise<{ path: string[] }> };
const contentTypes: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
};

async function storageRequest(req: Request, { params }: Context) {
  if (getStorageProvider() !== "local") {
    return new Response(null, { status: 404 });
  }
  const [bucket, ...parts] = (await params).path;
  const key = parts.join("/");
  if (!bucket || !key) return new Response(null, { status: 400 });
  try {
    getLocalObjectPath(
      process.env.STORAGE_LOCAL_PATH ?? "./storage",
      bucket,
      key,
    );
  } catch {
    return new Response(null, { status: 400 });
  }
  const method = req.method === "PUT" ? "PUT" : "GET";
  const token = new URL(req.url).searchParams.get("token");
  const access = token
    ? verifyLocalStorageAccess(token, { method, bucket, key })
    : null;
  const publicImage =
    method === "GET" && /^(user-avatars|organization-logos)\//.test(key);
  if (!access && !publicImage) return new Response(null, { status: 403 });
  const storage = new LocalStorage();
  try {
    if (method === "PUT") {
      if (
        !access ||
        access.size === undefined ||
        !access.contentType ||
        !Object.values(contentTypes).includes(access.contentType) ||
        req.headers.get("content-type") !== access.contentType
      ) {
        return new Response(null, { status: 400 });
      }
      const body = await getUploadBody(req.body, access.size);
      await storage.put(bucket, key, body);
      return new Response(null, { status: 204 });
    }
    const body = await storage.read(bucket, key);
    const contentType = contentTypes[key.split(".").at(-1) ?? ""];
    if (!contentType) return new Response(null, { status: 404 });
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return new Response(error.message, { status: 400 });
    }
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Response(null, { status: 404 });
    }
    throw error;
  }
}

export const GET = storageRequest;
export const PUT = storageRequest;
