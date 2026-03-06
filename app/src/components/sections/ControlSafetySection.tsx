import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function ControlSafetySection({
  controlSafety,
}: {
  controlSafety: LandingCopy["controlSafety"];
}) {
  return (
    <section className="py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {controlSafety.title}
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              {controlSafety.closingLine}
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="grid gap-3 sm:grid-cols-2">
              {controlSafety.bullets.map((b) => (
                <li
                  key={b}
                  className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-900 dark:bg-black dark:text-zinc-300"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}

