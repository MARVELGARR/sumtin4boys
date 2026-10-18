import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Get set up",
  description: "Claim your username and set up your creator page.",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
