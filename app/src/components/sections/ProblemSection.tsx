import { Container } from "@/components/Container";
import type { LandingCopy } from "@/lib/landingCopy";
import {
  Phone,
  MessageCircle,
  Mail,
  TrendingDown,
} from "lucide-react";

export function ProblemSection({
  problem,
}: {
  problem: LandingCopy["problem"];
}) {
  // Map the 5 bullets to their visual roles.
  // Indices match the order in both EN and DE copy files:
  // 0: WhatsApp threads, 1: missing photos, 2: emails, 3: missed phone calls, 4: admin work
  const [whatsapp, , email, phone] = problem.bullets;

  return (
    <section className="bg-black py-12 sm:py-20">
      <Container>
        <div className="mx-auto max-w-lg">

          {/* Title */}
          <h2 className="mb-10 text-center text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">
            {problem.title}
          </h2>

          {/* Row 1: 3 main channel source cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Phone, label: "Phone", text: phone },
              { icon: MessageCircle, label: "WhatsApp", text: whatsapp },
              { icon: Mail, label: "Email", text: email },
            ].map(({ icon: Icon, label, text }) => (
              <div
                key={label}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className="flex-shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">{label}</span>
                </div>
                <p className="text-xs leading-snug text-zinc-300">{text}</p>
              </div>
            ))}
          </div>

          {/* Converging SVG: 3 lines from top row meeting at center */}
          <svg viewBox="0 0 300 52" className="w-full" style={{ height: 52 }} aria-hidden="true">
            <path d="M50,0 C50,26 150,26 150,52" stroke="#3f3f46" strokeWidth="1.5" fill="none" strokeDasharray="5 4" />
            <path d="M150,0 L150,52"              stroke="#3f3f46" strokeWidth="1.5" fill="none" strokeDasharray="5 4" />
            <path d="M250,0 C250,26 150,26 150,52" stroke="#3f3f46" strokeWidth="1.5" fill="none" strokeDasharray="5 4" />
          </svg>

          {/* Arrow down to consequence */}
          <svg viewBox="0 0 300 40" className="w-full" style={{ height: 40 }} aria-hidden="true">
            <line x1="150" y1="0" x2="150" y2="28" stroke="#7f1d1d" strokeWidth="1.5" strokeDasharray="5 4" />
            <polygon points="143,24 150,36 157,24" fill="#991b1b" />
          </svg>

          {/* Missing Revenue consequence */}
          <div className="relative overflow-hidden rounded-2xl border border-red-900/50 bg-gradient-to-b from-red-950/60 to-zinc-950 px-6 py-8 text-center">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(185,28,28,0.15) 0%, transparent 70%)" }}
            />
            <div className="relative flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-950/80 ring-1 ring-red-800/60">
                <TrendingDown size={24} className="text-red-400" strokeWidth={2} />
              </div>
              <p className="text-lg font-semibold text-red-300">
                {problem.consequenceLabel}
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                {problem.closingLine}
              </p>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
