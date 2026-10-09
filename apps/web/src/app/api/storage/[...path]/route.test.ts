import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createLocalStorageUrl } from "@/server/storage/local-url";
import { LocalStorage } from "@/server/storage/local";
import { GET, PUT } from "./route";
import { POST } from "../../upload/route";

const session = vi.hoisted(() => vi.fn());
const member = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: session } } }));
vi.mock("@workspace/db", () => ({ prisma: { member: { findFirst: member } } }));

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ff-storage-api-"));
  vi.stubEnv("STORAGE_PROVIDER", "local");
  vi.stubEnv("STORAGE_BUCKET_NAME", "uploads");
  vi.stubEnv("STORAGE_LOCAL_PATH", root);
  vi.stubEnv("BASE_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", "test-signing-secret");
  session.mockResolvedValue({ user: { id: "user_1" } });
  member.mockResolvedValue({ id: "member_1" });
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

function context(key: string) {
  return { params: Promise.resolve({ path: ["uploads", ...key.split("/")] }) };
}
function uploadRequest(route = "user-avatar", type = "image/png", size = 4) {
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    body: JSON.stringify({
      route,
      files: [{ name: "image.png", size, type }],
      metadata: { organizationId: "org_1" },
    }),
  });
}

it("supports the existing browser upload protocol using local disk", async () => {
  const response = await POST(uploadRequest());
  expect(response.status).toBe(200);
  const { z } = await import("zod");
  const uploaded = z
    .object({
      files: z.array(
        z.object({
          signedUrl: z.string(),
          file: z.object({ objectInfo: z.object({ key: z.string() }) }),
        }),
      ),
    })
    .parse(await response.json()).files[0]!;
  const key = uploaded.file.objectInfo.key;
  expect(
    (
      await PUT(
        new Request(uploaded.signedUrl, {
          method: "PUT",
          headers: { "content-type": "image/png" },
          body: "test",
        }),
        context(key),
      )
    ).status,
  ).toBe(204);
  const read = await GET(
    new Request(`http://localhost:3000/api/storage/uploads/${key}`),
    context(key),
  );
  expect(read.headers.get("content-type")).toBe("image/png");
  expect(await read.text()).toBe("test");
});

it("requires authorization and enforces presigning limits", async () => {
  session.mockResolvedValue(null);
  expect((await POST(uploadRequest())).status).toBe(400);
  session.mockResolvedValue({ user: { id: "user_1" } });
  member.mockResolvedValue(null);
  expect((await POST(uploadRequest("organization-logo"))).status).toBe(400);
  expect((await POST(uploadRequest("user-avatar", "text/html"))).status).toBe(
    400,
  );
  expect(
    (await POST(uploadRequest("user-avatar", "image/png", 3 * 1024 * 1024)))
      .status,
  ).toBe(400);
});

it("keeps screenshots private and accepts signed reads only", async () => {
  const key = "feedback-screenshots/project/image.png";
  await new LocalStorage().put("uploads", key, Buffer.from("test"));
  const url = createLocalStorageUrl({ method: "GET", bucket: "uploads", key });
  expect(
    (await GET(new Request(url.split("?")[0]!), context(key))).status,
  ).toBe(403);
  expect(await (await GET(new Request(url), context(key))).text()).toBe("test");
});

it("rejects unsigned writes, oversized bodies, and MIME type changes", async () => {
  const key = "user-avatars/user/image.png";
  const url = createLocalStorageUrl({
    method: "PUT",
    bucket: "uploads",
    key,
    contentType: "image/png",
    size: 4,
  });
  expect(
    (
      await PUT(
        new Request(url.split("?")[0]!, { method: "PUT", body: "test" }),
        context(key),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await PUT(
        new Request(url, {
          method: "PUT",
          headers: { "content-type": "image/png" },
          body: "too long",
        }),
        context(key),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await PUT(
        new Request(url, {
          method: "PUT",
          headers: { "content-type": "text/html" },
          body: "test",
        }),
        context(key),
      )
    ).status,
  ).toBe(400);
});
