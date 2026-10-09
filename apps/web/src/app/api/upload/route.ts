import { ForbiddenError } from "@/server/errors/domain-errors";
import { s3Client } from "@/server/storage";
import { getStorageBucket, getStorageProvider } from "@/server/storage/config";
import { createLocalStorageUrl } from "@/server/storage/local-url";
import { RejectUpload, route, type Router } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";
import { z } from "zod";
import { getUploadKey } from "./_services/get-upload-key";

const fileTypes = ["image/png", "image/jpeg", "image/webp"];
const maxFileSize = 2 * 1024 * 1024;

const routes: Router["routes"] = {
  "organization-logo": route({
    fileTypes,
    maxFileSize,
    clientMetadataSchema: z.object({ organizationId: z.string() }),
    onBeforeUpload: async ({ req, file, clientMetadata }) => ({
      objectInfo: {
        key: await getUploadKey({
          headers: req.headers,
          route: "organization-logo",
          contentType: file.type,
          organizationId: clientMetadata.organizationId,
        }).catch(rejectUnauthorizedUpload),
      },
    }),
  }),
  "user-avatar": route({
    fileTypes,
    maxFileSize,
    onBeforeUpload: async ({ req, file }) => ({
      objectInfo: {
        key: await getUploadKey({
          headers: req.headers,
          route: "user-avatar",
          contentType: file.type,
        }).catch(rejectUnauthorizedUpload),
      },
    }),
  }),
};

function rejectUnauthorizedUpload(error: unknown): never {
  if (error instanceof ForbiddenError) throw new RejectUpload(error.message);
  throw error;
}

const localUploadSchema = z.object({
  route: z.enum(["organization-logo", "user-avatar"]),
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        size: z.number().int().min(0).max(maxFileSize),
        type: z.enum(["image/png", "image/jpeg", "image/webp"]),
      }),
    )
    .length(1),
  metadata: z.object({ organizationId: z.string().optional() }).optional(),
});

async function localUpload(req: Request) {
  const parsed = localUploadSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      {
        error: { type: "invalid_request", message: "Invalid upload request." },
      },
      { status: 400 },
    );
  }
  const { route: uploadRoute, files, metadata } = parsed.data;
  const file = files[0];
  if (!file) {
    return Response.json(
      { error: { type: "invalid_request", message: "File required." } },
      { status: 400 },
    );
  }
  try {
    const key = await getUploadKey({
      headers: req.headers,
      route: uploadRoute,
      contentType: file.type,
      organizationId: metadata?.organizationId,
    });
    return Response.json({
      files: [
        {
          signedUrl: createLocalStorageUrl({
            method: "PUT",
            bucket: getStorageBucket(),
            key,
            contentType: file.type,
            size: file.size,
          }),
          file: { ...file, objectInfo: { key, metadata: {} } },
          headers: {},
          skip: false,
        },
      ],
      metadata: {},
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return Response.json(
        { error: { type: "rejected", message: error.message } },
        { status: 400 },
      );
    }
    throw error;
  }
}

export function POST(req: Request) {
  if (getStorageProvider() === "local") return localUpload(req);
  return toRouteHandler({
    client: s3Client,
    bucketName: getStorageBucket(),
    routes,
  }).POST(req);
}
