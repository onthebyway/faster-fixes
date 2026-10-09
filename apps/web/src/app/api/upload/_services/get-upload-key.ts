import { auth } from "@/server/auth";
import { ForbiddenError } from "@/server/errors/domain-errors";
import { findUploadingMember } from "./find-uploading-member";

export async function getUploadKey({
  headers,
  route,
  contentType,
  organizationId,
}: {
  headers: Headers;
  route: "organization-logo" | "user-avatar";
  contentType: string;
  organizationId?: string;
}) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new ForbiddenError("Unauthorized");
  const extension = contentType.split("/")[1] ?? "png";
  if (route === "user-avatar") {
    return `user-avatars/${session.user.id}/${Date.now()}.${extension}`;
  }
  if (
    !organizationId ||
    !(await findUploadingMember({ organizationId, userId: session.user.id }))
  ) {
    throw new ForbiddenError(
      "You do not have permission to modify this organization.",
    );
  }
  return `organization-logos/${organizationId}/${Date.now()}.${extension}`;
}

export type GetUploadKeyOutput = Awaited<ReturnType<typeof getUploadKey>>;
