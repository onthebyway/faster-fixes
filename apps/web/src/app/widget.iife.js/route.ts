import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Trace the workspace build into standalone output, without relying on a CDN.
const IIFE_FILE = join(
  process.cwd(),
  "../../packages/widget/dist/widget.iife.js",
);

export async function GET() {
  const script = await readFile(IIFE_FILE, "utf8");
  return new Response(script, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
