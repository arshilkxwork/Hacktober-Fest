import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The title row of every app page: one h1, one line of description, actions on the right.
 *   <PageHeader title="Decision Explorer" description="…" actions={<Button variant="primary">Analyze</Button>} />
 * `meta` renders under the description (breadcrumb, source link, counts).
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  /** A breadcrumb or back link above the title. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-sm text-fg-muted">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold text-fg text-balance">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-fg-muted text-pretty">{description}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Standard page width and gutters. Page components wrap their content in it. */
export function PageContainer({ children, className, width = "default" }: { children: ReactNode; className?: string; width?: "default" | "narrow" | "full" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8",
        width === "default" && "max-w-[1240px]",
        width === "narrow" && "max-w-[860px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
