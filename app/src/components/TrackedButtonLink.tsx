"use client";

import Link from "next/link";
import posthog from "posthog-js";

type TrackedButtonLinkProps = {
  href: string;
  variant?: "primary" | "secondary";
  eventName: string;
  children: string;
};

const base =
  "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition";
const primary =
  "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-white";
const secondary =
  "border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-950";

export function TrackedButtonLink({
  href,
  variant = "primary",
  eventName,
  children,
}: TrackedButtonLinkProps) {
  const className = `${base} ${variant === "primary" ? primary : secondary}`;
  return (
    <Link
      href={href}
      className={className}
      onClick={() => posthog.capture(eventName, { href, label: children })}
    >
      {children}
    </Link>
  );
}
