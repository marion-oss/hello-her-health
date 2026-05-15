import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function DifferentiationSection({
  differentiation,
}: {
  differentiation: LandingCopy["differentiation"];
}) {
  return (
    <section className="border-y border-zinc-200/70 bg-zinc-50 py-16 dark:border-zinc-900/80 dark:bg-zinc-950/30">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {differentiation.title}
            </h2>
          </div>
          <div className="lg:col-span-8">
            <div className="grid gap-4 md:grid-cols-2">
              {differentiation.points.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-black"
                >
                  <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                    {p.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

