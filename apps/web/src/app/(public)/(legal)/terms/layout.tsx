import { APP_URL } from "@/app/_constants/app";
import type { LayoutParams } from "@/types/next";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms governing access to and use of the FasterFixes service.",
  alternates: { canonical: `${APP_URL}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: LayoutParams) {
  return children;
}
