import "server-only";

import { requireEnv } from "@/utils/environment/require-env";
import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripeApi() {
  return (client ??= new Stripe(
    requireEnv("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
    { apiVersion: "2025-12-15.clover" },
  ));
}
