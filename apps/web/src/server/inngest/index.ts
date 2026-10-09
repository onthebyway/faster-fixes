import "server-only";

import { Inngest } from "inngest";

export function createInngest() {
  const devMode = process.env.INNGEST_DEV;
  return new Inngest({
    id: "faster-fixes",
    baseUrl: process.env.INNGEST_BASE_URL,
    // Respect the SDK's INNGEST_DEV override; self-hosted production still verifies signatures.
    isDev: !devMode ? process.env.NODE_ENV !== "production" : undefined,
    checkpointing: { maxRuntime: "50s" },
  });
}

export const inngest = createInngest();
