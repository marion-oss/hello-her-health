"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useRequestAccess } from "@/components/RequestAccessContext";

type BaseProps = {
  variant?: "primary" | "secondary";
  eventName?: string;
  children: string;
  openSheet?: boolean;
};

type LinkProps = BaseProps & {
  as?: "link";
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
};

type ButtonProps = BaseProps & {
  as: "button";
  href?: never;
  onClick?: () => void;
  type?: "submit" | "button";
  disabled?: boolean;
};

type GlassButtonProps = LinkProps | ButtonProps;

const primaryCls =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/25 px-6 text-sm font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md transition hover:bg-white/35 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

const secondaryCls =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold tracking-wide text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md transition hover:bg-white/18 hover:text-white active:scale-[0.98]";

export function GlassButton(props: GlassButtonProps) {
  const { open } = useRequestAccess();
  const cls = props.variant === "secondary" ? secondaryCls : primaryCls;

  function handleClick() {
    if (props.eventName) posthog.capture(props.eventName);
    if (props.openSheet) open();
  }

  if (props.as === "button") {
    return (
      <button
        type={props.type ?? "button"}
        disabled={props.disabled}
        onClick={props.onClick ?? handleClick}
        className={cls}
      >
        {props.children}
      </button>
    );
  }

  if (props.openSheet) {
    return (
      <button type="button" onClick={handleClick} className={cls}>
        {props.children}
      </button>
    );
  }

  return (
    <Link href={props.href} className={cls} onClick={handleClick}>
      {props.children}
    </Link>
  );
}
