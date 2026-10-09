import { getStripeApi } from "@/server/stripe";
import type Stripe from "stripe";
import {
  BILLING_CURRENCY,
  createVatShareResolver,
  getCollectedNetCents,
  isCollectedTransaction,
} from "./_collected-net";

const DAY_SECONDS = 24 * 60 * 60;
const WINDOW_SECONDS = 30 * DAY_SECONDS;

// Collected net revenue excluding VAT over the last 30 days, and over the 30
// days before. Each window includes its start and excludes its end.
export async function getCollectedRevenue(
  { now }: { now: Date },
  stripe: Stripe = getStripeApi(),
) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const currentStart = nowSeconds - WINDOW_SECONDS;
  const previousStart = currentStart - WINDOW_SECONDS;
  const resolveVatShare = createVatShareResolver(stripe);

  let currentCents = 0;
  let previousCents = 0;
  // Amounts in another currency are counted, never summed with EUR.
  let nonEurTransactionCount = 0;

  for await (const transaction of stripe.balanceTransactions.list({
    created: { gte: previousStart, lt: nowSeconds },
    expand: ["data.source"],
    limit: 100,
  })) {
    if (transaction.created < previousStart) continue;
    if (transaction.created >= nowSeconds) continue;

    if (!isCollectedTransaction(transaction)) continue;
    if (transaction.currency !== BILLING_CURRENCY) {
      nonEurTransactionCount += 1;
      continue;
    }

    const cents = await getCollectedNetCents(transaction, resolveVatShare);
    if (transaction.created >= currentStart) {
      currentCents += cents;
    } else {
      previousCents += cents;
    }
  }

  return {
    current: Math.round(currentCents) / 100,
    previous: Math.round(previousCents) / 100,
    nonEurTransactionCount,
  };
}

export type GetCollectedRevenueOutput = Awaited<
  ReturnType<typeof getCollectedRevenue>
>;
