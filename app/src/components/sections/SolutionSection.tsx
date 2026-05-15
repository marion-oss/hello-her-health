import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function SolutionSection({
  solution,
}: {
  solution: LandingCopy["solution"];
}) {
  return (
    <section className="py-16">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {solution.title}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              {solution.body}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

