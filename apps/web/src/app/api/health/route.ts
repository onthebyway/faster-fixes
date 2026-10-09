import { getHealth } from "./_services/get-health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getHealth(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
