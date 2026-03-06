import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function ProblemSection({
  problem,
}: {
  problem: LandingCopy["problem"];
}) {
  return (
    <section className="bg-black py-12 sm:py-20">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-14">

          {/* Left: headline */}
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
              {problem.title}
            </h2>
          </div>

          {/* Right: bullet items */}
          <div className="lg:col-span-7">
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
              {problem.bullets.map((b, i) => (
                <li
                  key={b}
                  className="flex flex-col gap-3 bg-zinc-950 p-4 sm:p-6"
                >
                  <span className="text-sm font-medium leading-snug text-zinc-200">
                    {b}
                  </span>
                </li>
              ))}
            </ul>


          </div>

        </div>
      </Container>
    </section>
  );
}
