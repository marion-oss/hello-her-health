import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";

export function FaqSection({ faq }: { faq: LandingCopy["faq"] }) {
  return (
    <section id="faq" className="border-y border-zinc-200/70 bg-zinc-50 py-10 sm:py-16 dark:border-zinc-900/80 dark:bg-zinc-950/30">
      <Container>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
          {faq.title}
        </h2>

        <div className="mt-8 space-y-3">
          {faq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm open:shadow-md dark:border-zinc-900 dark:bg-black"
            >
              <summary className="cursor-pointer list-none text-sm font-medium text-zinc-950 dark:text-zinc-50">
                <div className="flex items-center justify-between gap-4">
                  <span className="min-w-0">{item.q}</span>
                  <span className="text-zinc-400 transition group-open:rotate-45">
                    +
                  </span>
                </div>
              </summary>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

