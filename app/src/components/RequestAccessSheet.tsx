"use client";

import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";
import { useRequestAccess } from "@/components/RequestAccessContext";
import type { LandingCopy } from "@/lib/landingCopy";

export function RequestAccessSheet({
  requestAccess,
  finalCta,
}: {
  requestAccess: LandingCopy["requestAccess"];
  finalCta: LandingCopy["finalCta"];
}) {
  const { isOpen, close } = useRequestAccess();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const emailError = useMemo(() => {
    const t = email.trim();
    if (!t) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "Invalid email.";
    return null;
  }, [email]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || emailError) return;
    try {
      setStatus("submitting");
      const res = await fetch(requestAccess.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (!res.ok) { setStatus("error"); return; }
      const data = (await res.json()) as { status?: string };
      posthog.capture("request_access_submitted", {
        email: trimmedEmail,
        status: data.status ?? "subscribed",
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Sheet — centered, 30vw wide (min 320px for usability) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request Access"
        className={`fixed bottom-0 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-t-3xl
          border border-b-0 border-white/10 bg-zinc-950 shadow-2xl
          sm:w-[36vw] sm:min-w-96
          transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-4">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-8 pt-4 sm:px-8 sm:pb-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-white">{finalCta.title}</h2>
            <button
              onClick={close}
              aria-label="Close"
              className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white"
            >
              ✕
            </button>
          </div>

          {status === "success" ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
              <div className="font-semibold text-emerald-400">{requestAccess.successTitle}</div>
              <p className="mt-1 text-sm text-zinc-400">{requestAccess.successBody}</p>
            </div>
          ) : (
            <form className="mt-5 flex flex-col gap-3" onSubmit={onSubmit}>
              <label className="block">
                <div className="text-xs font-medium text-zinc-400">
                  {requestAccess.fields.email.label}
                </div>
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30"
                  placeholder={requestAccess.fields.email.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
                {emailError && (
                  <div className="mt-1 text-xs text-red-400">{emailError}</div>
                )}
              </label>

              <button
                type="submit"
                disabled={status === "submitting" || !!emailError || !email.trim()}
                className="mt-1 inline-flex h-12 w-full items-center justify-center rounded-full border border-white/40 bg-white/25 text-sm font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md transition hover:bg-white/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? requestAccess.submittingLabel : requestAccess.submitLabel}
              </button>

              {status === "error" && (
                <div className="text-center text-sm text-red-400">{requestAccess.errorBody}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
