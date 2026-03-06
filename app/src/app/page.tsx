import { getLandingCopy } from "@/lib/landingCopy";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RequestAccessProvider } from "@/components/RequestAccessContext";
import { RequestAccessSheet } from "@/components/RequestAccessSheet";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { CoreBenefitsSection } from "@/components/sections/CoreBenefitsSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { WorkflowSection } from "@/components/sections/WorkflowSection";

export default function Home() {
  const copy = getLandingCopy();

  return (
    <RequestAccessProvider>
      <div id="top" className="min-h-screen font-sans">
        <Header productName={copy.meta.productName} />
        <main>
          <HeroSection hero={copy.hero} />
          <RevealOnScroll><ProblemSection problem={copy.problem} /></RevealOnScroll>
          <RevealOnScroll><CoreBenefitsSection coreBenefits={copy.coreBenefits} /></RevealOnScroll>
          <RevealOnScroll><WorkflowSection workflow={copy.workflow} /></RevealOnScroll>
          <RevealOnScroll><CapabilitiesSection capabilities={copy.capabilities} /></RevealOnScroll>
          <RevealOnScroll><FaqSection faq={copy.faq} /></RevealOnScroll>
          <RevealOnScroll><FinalCtaSection finalCta={copy.finalCta} /></RevealOnScroll>
        </main>
        <Footer productName={copy.meta.productName} footer={copy.footer} />
      </div>
      <RequestAccessSheet requestAccess={copy.requestAccess} finalCta={copy.finalCta} />
    </RequestAccessProvider>
  );
}
