import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const field =
  "w-full rounded border border-line bg-surface text-sm text-fg placeholder:text-fg-subtle transition-colors duration-150 hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rejected/60";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: LucideIcon;
  /** Content at the right edge, e.g. a <Kbd>. */
  trailing?: ReactNode;
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon: Icon, trailing, invalid, inputSize = "md", className, ...rest },
  ref,
) {
  return (
    <div className={cn("relative flex items-center", className)}>
      {Icon ? <Icon aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-2.5 size-4 text-fg-subtle" /> : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(field, inputSize === "sm" ? "h-7 px-2 text-xs" : "h-8 px-2.5", Icon && "pl-8", trailing ? "pr-12" : undefined)}
        {...rest}
      />
      {trailing ? <span className="pointer-events-none absolute right-2 flex items-center">{trailing}</span> : null}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, mono, className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(field, "min-h-20 resize-y px-2.5 py-2 leading-relaxed", mono && "font-mono text-xs", className)}
      {...rest}
    />
  );
});

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

/** Native select, styled. Native keeps keyboard and screen-reader behaviour for free. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, inputSize = "md", className, children, ...rest }, ref) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(field, "appearance-none pr-8", inputSize === "sm" ? "h-7 pl-2 text-xs" : "h-8 pl-2.5")}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown aria-hidden strokeWidth={1.75} className="pointer-events-none absolute right-2 size-4 text-fg-subtle" />
    </div>
  );
});

/**
 * Label + control + hint/error, wired with ids and aria-describedby.
 *   <Field label="Pull request URL" hint="GitHub only"><Input /></Field>
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactElement;
  className?: string;
  optional?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, { id, "aria-describedby": describedBy, invalid: error ? true : children.props.invalid })
    : children;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-fg-muted">Optional</span> : null}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-rejected" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
