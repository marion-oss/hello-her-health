import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function UseCasesSection({
  useCases,
}: {
  useCases: LandingCopy["useCases"];
}) {
  return (
    <section id="use-cases" className="py-16">
      <Container>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {useCases.title}
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {useCases.items.map((uc) => (
            <div
              key={uc.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-black"
            >
              <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {uc.title}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {uc.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

