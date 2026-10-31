import { ExampleDecisions } from "@/components/landing/ExampleDecisions";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Problem } from "@/components/landing/Problem";
import { PullRequests } from "@/components/landing/PullRequests";
import { RepoCta } from "@/components/landing/RepoCta";
import { TechStack } from "@/components/landing/TechStack";

export default function Landing() {
  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-fg focus:px-3 focus:py-2 focus:text-sm focus:text-fg-inverse"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <ExampleDecisions />
        <PullRequests />
        <TechStack />
        <RepoCta />
      </main>
      <LandingFooter />
    </div>
  );
}
