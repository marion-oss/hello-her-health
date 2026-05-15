import { Container } from "@/components/Container";
import { GlassButton } from "@/components/GlassButton";
import type { LandingCopy } from "@/lib/landingCopy";

export function FinalCtaSection({ finalCta }: { finalCta: LandingCopy["finalCta"] }) {
  return (
    <section className="bg-zinc-950 py-20">
      <Container>
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {finalCta.title}
          </h2>
          <p className="max-w-xl text-pretty text-zinc-400">{finalCta.body}</p>
          <GlassButton openSheet eventName="request_access_clicked" href="#">
            {finalCta.cta.label}
          </GlassButton>
        </div>
      </Container>
    </section>
  );
}
