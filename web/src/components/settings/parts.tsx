import { useId, type ReactNode } from "react";
import { CopyButton } from "@/components/ui";
import { cn } from "@/lib/cn";

/** A settings area: title and help on the left, its panel on the right; stacked on phones. */
export function SettingsSection({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold text-fg">
          {title}
        </h2>
        <p className="mt-1 text-sm text-fg-muted text-pretty">{description}</p>
        {aside ? <div className="mt-3">{aside}</div> : null}
      </div>
      <div className="min-w-0 rounded-lg border border-line bg-surface">{children}</div>
    </section>
  );
}

/** Label on the left, value on the right; wraps under the label on narrow screens. */
export function SettingRow({
  label,
  hint,
  children,
  className,
  align = "end",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  /** "start" for sentences, which read badly right-aligned. */
  align?: "start" | "end";
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6", className)}>
      <dt className="shrink-0 sm:w-56">
        <span className="text-sm text-fg">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-fg-muted text-pretty">{hint}</span> : null}
      </dt>
      <dd className={cn("flex min-w-0 flex-wrap items-center gap-2 text-sm text-fg", align === "end" ? "sm:justify-end sm:text-right" : "sm:flex-1")}>
        {children}
      </dd>
    </div>
  );
}

/** A path or host shown in mono with a copy button. */
export function MonoValue({ value, copyLabel }: { value: string; copyLabel: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
      <code title={value} className="min-w-0 break-all font-mono text-xs text-fg sm:truncate">
        {value}
      </code>
      <CopyButton value={value} label={copyLabel} />
    </span>
  );
}

/** A shell command with a copy button. */
export function CommandLine({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-line bg-bg-sunken py-1 pl-3 pr-1">
      <code className="flex-1 overflow-x-auto whitespace-nowrap py-1 font-mono text-sm text-fg">
        <span aria-hidden className="select-none text-fg-subtle">
          ${" "}
        </span>
        {command}
      </code>
      <CopyButton value={command} label={`Copy “${command}”`} />
    </div>
  );
}

export function StateDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  return <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full", ok ? "bg-accepted" : warn ? "bg-open" : "bg-rejected")} />;
}
