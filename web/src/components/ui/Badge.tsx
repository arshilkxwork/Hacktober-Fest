import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "accepted" | "rejected" | "open" | "verified" | "unverified" | "conflict";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-raised text-fg-muted",
  accent: "border-accent/25 bg-accent/10 text-accent",
  accepted: "border-accepted/25 bg-accepted/10 text-accepted",
  rejected: "border-rejected/25 bg-rejected/10 text-rejected",
  open: "border-open/25 bg-open/10 text-open",
  verified: "border-verified/25 bg-verified/10 text-verified",
  unverified: "border-dashed border-line-strong bg-transparent text-unverified",
  conflict: "border-conflict/30 bg-conflict/10 text-conflict",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: LucideIcon;
  size?: "sm" | "md";
}

export function Badge({ tone = "neutral", icon: Icon, size = "sm", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border font-medium tabular",
        size === "sm" ? "h-5 px-1.5 text-2xs [&_svg]:size-3" : "h-6 px-2 text-xs [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon aria-hidden strokeWidth={2} /> : null}
      {children}
    </span>
  );
}
