import { prisma } from "@workspace/db";

export async function getHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok" };
}

export type GetHealthOutput = Awaited<ReturnType<typeof getHealth>>;
