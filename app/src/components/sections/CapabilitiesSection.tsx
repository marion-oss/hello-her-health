"use client";

import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";
import { useState } from "react";

export function CapabilitiesSection({
  capabilities,
}: {
  capabilities: LandingCopy["capabilities"];
}) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const items = capabilities.items;

  function goTo(index: number) {
    setDirection(index > active ? "next" : "prev");
    setActive(index);
  }

  function goNext() {
    goTo((active + 1) % items.length);
  }

  function goPrev() {
    goTo((active - 1 + items.length) % items.length);
  }

  return (
    <section className="py-12 sm:py-20">
      <Container>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
          {capabilities.title}
        </h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-8">

          {/* Progress list — below card on mobile, LEFT side on desktop */}
          <div className="order-last flex flex-wrap gap-2 lg:order-first lg:col-span-4 lg:flex-col lg:flex-nowrap lg:gap-1">
            {items.map((item, i) => (
              <button
                key={item.title}
                onClick={() => goTo(i)}
                className={`group flex items-start gap-3 rounded-xl p-3 text-left transition
                  ${i === active
                    ? "bg-zinc-950 dark:bg-zinc-50"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
              >
                <span
                  className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full transition
                    ${i === active
                      ? "bg-white dark:bg-zinc-950"
                      : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                />
                <span
                  className={`text-xs font-medium leading-snug transition
                    ${i === active
                      ? "text-white dark:text-zinc-950"
                      : "text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                    }`}
                >
                  {item.title}
                </span>
              </button>
            ))}
          </div>

          {/* Card — RIGHT side */}
          <div className="relative lg:col-span-8">
            <div
              key={active}
              className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 dark:border-zinc-900 dark:bg-black
                animate-card-${direction}`}
            >
              <div className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
                {String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {items[active].title}
              </h3>
              <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                {items[active].body}
              </p>

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={goPrev}
                  aria-label="Previous"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                >
                  ←
                </button>
                <button
                  onClick={goNext}
                  aria-label="Next"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                >
                  →
                </button>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
