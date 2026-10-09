import { APP_URL } from "@/app/_constants/app";
import type { LayoutParams } from "@/types/next";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How FasterFixes collects, uses, and protects your personal data.",
  alternates: { canonical: `${APP_URL}/privacy-policy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyLayout({ children }: LayoutParams) {
  return children;
}
