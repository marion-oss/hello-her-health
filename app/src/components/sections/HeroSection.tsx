import { Container } from "@/components/Container";
import { GlassButton } from "@/components/GlassButton";
import type { LandingCopy } from "@/lib/landingCopy";

export function HeroSection({ hero }: { hero: LandingCopy["hero"] }) {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-16 sm:py-24 lg:py-32">

      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-7">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {hero.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-300 sm:mt-5 sm:text-lg sm:leading-8">
              {hero.subheadline}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GlassButton openSheet eventName="request_access_clicked" href={hero.primaryCta.href}>
                {hero.primaryCta.label}
              </GlassButton>
              <GlassButton
                href={hero.secondaryCta.href}
                variant="secondary"
                eventName="watch_demo_clicked"
              >
                {hero.secondaryCta.label}
              </GlassButton>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              id="demo"
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm"
            >
              <div className="text-sm font-medium text-zinc-200">Demo</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Placeholder for a short video or screenshots. Meeting → tasks →
                agent drafts → you approve.
              </p>
              <div className="mt-4 h-40 w-full rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02]" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
