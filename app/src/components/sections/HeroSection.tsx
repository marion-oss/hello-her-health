import { Container } from "@/components/Container";
import { GlassButton } from "@/components/GlassButton";
import type { LandingCopy } from "@/lib/landingCopy";

export function HeroSection({ hero }: { hero: LandingCopy["hero"] }) {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-16 sm:py-24 lg:py-32">

      {/* Craftsman — fills the right half of the section, stable at any zoom level */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 select-none lg:block">
        <img
          src="/hero-craftsman.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain object-center"
          style={{ mixBlendMode: "screen" }}
        />
      </div>

      {/* Left-side text */}
      <Container>
        <div className="relative max-w-xl">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {hero.headline}
          </h1>
          <p className="mt-4 max-w-lg text-pretty text-base leading-7 text-zinc-300 sm:mt-5 sm:text-lg sm:leading-8">
            {hero.subheadline}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GlassButton openSheet eventName="request_access_clicked" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </GlassButton>
            <GlassButton
              href={hero.secondaryCta.href}
              variant="secondary"
              eventName="secondary_cta_clicked"
            >
              {hero.secondaryCta.label}
            </GlassButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
