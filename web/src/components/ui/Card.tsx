import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Flat surface, 1px border, no shadow. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-surface", className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  as: Heading = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-4 py-3", className)}>
      <div className="min-w-0">
        <Heading className="truncate text-sm font-semibold text-fg">{title}</Heading>
        {description ? <p className="mt-0.5 text-xs text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-fg-muted", className)} {...rest} />;
}

/**
 * A titled card section, the default container for a block on a page.
 *   <Panel title="Recent decisions" actions={<ButtonLink to="/app/decisions" size="sm">View all</ButtonLink>}>…</Panel>
 * Use `flush` when the content (a list or table) brings its own padding.
 */
export function Panel({
  title,
  description,
  actions,
  footer,
  flush,
  className,
  bodyClassName,
  children,
  as,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  bodyClassName?: string;
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-lg border border-line bg-surface", className)} {...rest}>
      {title ? <CardHeader title={title} description={description} actions={actions} as={as} /> : null}
      <div className={cn("min-w-0 flex-1", !flush && "p-4", bodyClassName)}>{children}</div>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </section>
  );
}
