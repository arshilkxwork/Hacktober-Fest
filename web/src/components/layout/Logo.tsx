import { cn } from "@/lib/cn";

/**
 * The DecisionTrail mark: two discussion points rising along a trail to the decision they
 * settled. Ink square, accent node.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="24" height="24" rx="6" className="fill-fg" />
      <path d="M6.5 17.5 10.75 12.25 17 6.75" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-bg" opacity=".55" />
      <circle cx="6.5" cy="17.5" r="1.7" className="fill-bg" />
      <circle cx="10.75" cy="12.25" r="1.7" className="fill-bg" />
      <circle cx="17" cy="6.75" r="2.9" className="fill-accent" />
    </svg>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {collapsed ? <span className="sr-only">DecisionTrail</span> : <span className="text-md font-semibold tracking-[-0.01em] text-fg">DecisionTrail</span>}
    </span>
  );
}
