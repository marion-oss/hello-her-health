"use client";

import { notFound } from "next/navigation";
import { useState, useCallback } from "react";
import { enCopy, deCopy } from "@/lib/landingCopy";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LanguageSwitcher, type Lang } from "@/components/LanguageSwitcher";
import { RequestAccessProvider } from "@/components/RequestAccessContext";
import { RequestAccessSheet } from "@/components/RequestAccessSheet";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { WorkflowSection } from "@/components/sections/WorkflowSection";

const copies = { de: deCopy, en: enCopy };

export default function Home() {
  notFound();
  const [lang, setLang] = useState<Lang>("de");
  const toggleLang = useCallback(() => setLang((l) => (l === "de" ? "en" : "de")), []);
  const copy = copies[lang];

  return (
    <RequestAccessProvider>
      <div id="top" className="min-h-screen font-sans">
        <Header
          productName={copy.meta.productName}
          nav={copy.nav}
          hero={copy.hero}
          languageSwitcher={<LanguageSwitcher lang={lang} onToggle={toggleLang} />}
        />
        <main>
          <HeroSection hero={copy.hero} />
          <RevealOnScroll><ProblemSection problem={copy.problem} /></RevealOnScroll>
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
