import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  // Primary is the ink colour inverted, not the accent: the accent stays for selection and links.
  primary: "bg-fg text-fg-inverse hover:bg-fg/85",
  secondary: "border border-line bg-surface-raised text-fg hover:border-line-strong hover:bg-surface-raised/70",
  outline: "border border-line-strong bg-transparent text-fg hover:bg-surface-raised",
  ghost: "text-fg-muted hover:bg-surface-raised hover:text-fg",
  danger: "border border-rejected/30 bg-rejected/10 text-rejected hover:bg-rejected/15",
  accent: "bg-accent text-white hover:bg-accent-hover",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
  md: "h-8 px-3 text-sm [&_svg]:size-4",
  lg: "h-9 px-4 text-sm [&_svg]:size-4",
};

export function buttonClasses({ variant = "secondary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon: Icon, iconRight: IconRight, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="text-current" /> : Icon ? <Icon aria-hidden strokeWidth={1.75} /> : null}
      {children}
      {IconRight && !loading ? <IconRight aria-hidden strokeWidth={1.75} /> : null}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
}

/** A router link styled as a button. Use for navigation, Button for actions. */
export function ButtonLink({ variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className: typeof className === "string" ? className : undefined })} {...rest}>
      {Icon ? <Icon aria-hidden strokeWidth={1.75} /> : null}
      {children}
      {IconRight ? <IconRight aria-hidden strokeWidth={1.75} /> : null}
    </Link>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Accessible name and tooltip text. Required: the button shows no text. */
  label: string;
  variant?: Extract<ButtonVariant, "ghost" | "secondary" | "outline">;
  size?: ButtonSize;
  tooltip?: boolean;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  tooltipAlign?: "center" | "start" | "end";
}

const iconSizes: Record<ButtonSize, string> = {
  sm: "size-7 [&_svg]:size-3.5",
  md: "size-8 [&_svg]:size-4",
  lg: "size-9 [&_svg]:size-[18px]",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = "ghost", size = "md", tooltip = true, tooltipSide = "bottom", tooltipAlign = "center", className, type = "button", ...rest },
  ref,
) {
  const btn = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(base, variants[variant], iconSizes[size], "px-0", className)}
      {...rest}
    >
      <Icon aria-hidden strokeWidth={1.75} />
    </button>
  );
  return tooltip ? (
    <Tooltip content={label} side={tooltipSide} align={tooltipAlign}>
      {btn}
    </Tooltip>
  ) : (
    btn
  );
});
