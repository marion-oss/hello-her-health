import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function WorkflowSection({
  workflow,
}: {
  workflow: LandingCopy["workflow"];
}) {
  return (
    <section id="how" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-5">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
              {workflow.title}
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              {workflow.intro}
            </p>
          </div>

          <div className="lg:col-span-7">
            <ol className="space-y-4">
              {workflow.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-black"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-100 dark:text-black">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-zinc-950 dark:text-zinc-50">
                        {step.title}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}

