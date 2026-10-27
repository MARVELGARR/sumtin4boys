import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Get set up",
  description: "Claim your username and set up your creator page.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-float absolute -left-40 -top-24 size-[28rem] rounded-full bg-primary/8 blur-3xl" />
        <div className="animate-float-delayed absolute -right-32 top-1/3 size-[22rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <OnboardingFlow />
    </div>
  );
}
