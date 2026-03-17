import type { ReactNode } from "react";
import { Container } from "@/components/Container";
import { GlassButton } from "@/components/GlassButton";
import type { LandingCopy } from "@/lib/landingCopy";

export function Header({
  productName,
  nav,
  hero,
  languageSwitcher,
}: {
  productName: string;
  nav: LandingCopy["nav"];
  hero: LandingCopy["hero"];
  languageSwitcher?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a
            href="#top"
            className="text-sm font-semibold tracking-tight text-white"
          >
            {productName}
          </a>

          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            {nav.links.map((link) => (
              <a
                key={link.href}
                className="hover:text-white transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {languageSwitcher}
            <span className="hidden sm:inline-flex">
              <GlassButton
                href={hero.secondaryCta.href}
                variant="secondary"
                eventName="secondary_cta_clicked"
              >
                {hero.secondaryCta.label}
              </GlassButton>
            </span>
            <GlassButton
              openSheet
              href="#request-access"
              eventName="request_access_clicked"
            >
              {hero.primaryCta.label}
            </GlassButton>
          </div>
        </div>
      </Container>
    </header>
  );
}
