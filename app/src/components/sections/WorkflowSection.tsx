import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";
import { ChevronDown } from "lucide-react";

export function WorkflowSection({
  workflow,
}: {
  workflow: LandingCopy["workflow"];
}) {
  return (
    <section id="workflow" className="py-10 sm:py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-14">

          {/* Left: title, intro, image — image fills remaining height to match steps */}
          <div className="flex flex-col lg:col-span-5">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
              {workflow.title}
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              {workflow.intro}
            </p>

            <div className="mt-8 flex flex-1 flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10">
                <img
                  src="/ai-agent-preview.png"
                  alt="Takumiro AI agent task list"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Right: numbered steps with arrows */}
          <div className="flex flex-col lg:col-span-7">
            <ol className="flex h-full flex-col">
              {workflow.steps.map((step, index) => (
                <li key={step.title} className="flex flex-1 flex-col">
                  {/* Step card */}
                  <div className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-900 dark:bg-black">
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

                  {/* Arrow connector — shown between steps, not after the last */}
                  {index < workflow.steps.length - 1 && (
                    <div className="flex flex-1 items-center justify-center py-1">
                      <ChevronDown
                        size={28}
                        strokeWidth={2}
                        className="text-zinc-300 dark:text-zinc-700"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

        </div>
      </Container>
    </section>
  );
}
