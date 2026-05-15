"use client";

export type Lang = "de" | "en";

const FLAGS: Record<Lang, { emoji: string; label: string }> = {
  de: { emoji: "🇩🇪", label: "Deutsch" },
  en: { emoji: "🇬🇧", label: "English" },
};

export function LanguageSwitcher({
  lang,
  onToggle,
}: {
  lang: Lang;
  onToggle: () => void;
}) {
  const next: Lang = lang === "de" ? "en" : "de";
  const current = FLAGS[lang];
  const nextFlag = FLAGS[next];

  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${nextFlag.label}`}
      title={`Switch to ${nextFlag.label}`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg transition hover:border-white/25 hover:bg-white/10 active:scale-95"
    >
      <span aria-hidden="true">{current.emoji}</span>
    </button>
  );
}
