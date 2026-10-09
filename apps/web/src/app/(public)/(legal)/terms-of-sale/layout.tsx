import { APP_URL } from "@/app/_constants/app";
import type { LayoutParams } from "@/types/next";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of sale",
  description:
    "Terms governing the purchase of FasterFixes subscriptions and services.",
  alternates: { canonical: `${APP_URL}/terms-of-sale` },
  robots: { index: true, follow: true },
};

export default function TermsOfSaleLayout({ children }: LayoutParams) {
  return children;
}
