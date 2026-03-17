import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";
import { Inbox, ScanSearch, ListChecks, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: LucideIcon[] = [Inbox, ScanSearch, ListChecks, Zap];

export function CoreBenefitsSection({
  coreBenefits,
}: {
  coreBenefits: LandingCopy["coreBenefits"];
}) {
  return (
    <section className="bg-zinc-50 py-12 sm:py-20 dark:bg-zinc-950">
      <Container>

        <h2 className="mb-12 text-center text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
          {coreBenefits.title}
        </h2>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {coreBenefits.items.map((item, i) => {
            const Icon = ICONS[i] ?? Zap;
            return (
              <div key={item.title} className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-800">
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                {/* Title */}
                <h3 className="mb-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                {/* Body */}
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>

      </Container>
    </section>
  );
}
