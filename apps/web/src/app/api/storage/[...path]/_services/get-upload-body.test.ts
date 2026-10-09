import { expect, it } from "vitest";
import { getUploadBody } from "./get-upload-body";

it("reads the exact authorized body size", async () => {
  expect(await getUploadBody(new Response("test").body, 4)).toEqual(
    Buffer.from("test"),
  );
});

it("rejects absent, shorter, and longer bodies", async () => {
  await expect(getUploadBody(null, 4)).rejects.toThrow("required");
  await expect(getUploadBody(new Response("abc").body, 4)).rejects.toThrow(
    "does not match",
  );
  await expect(getUploadBody(new Response("abcde").body, 4)).rejects.toThrow(
    "exceeds",
  );
});
