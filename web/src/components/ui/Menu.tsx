import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface MenuCtx {
  close: () => void;
}
const Ctx = createContext<MenuCtx | null>(null);

export interface MenuTriggerProps {
  ref: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
}

/**
 * Dropdown menu.
 *   <Menu trigger={(p) => <Button {...p} iconRight={ChevronDown}>Sort</Button>}>
 *     <MenuItem onSelect={…}>Newest first</MenuItem>
 *   </Menu>
 * The trigger must forward the props (ref included) to a <button>.
 */
export function Menu({
  trigger,
  children,
  align = "end",
  className,
  label,
}: {
  trigger: (props: MenuTriggerProps) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <Ctx.Provider value={{ close }}>
      <div className="relative inline-flex">
        {trigger({
          ref: (el) => {
            triggerRef.current = el;
          },
          onClick: () => setOpen((o) => !o),
          onKeyDown: (e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          },
          "aria-haspopup": "menu",
          "aria-expanded": open,
          "aria-controls": id,
        })}
        {open ? (
          <div
            ref={menuRef}
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            className={cn(
              "absolute top-full z-50 mt-1 min-w-44 animate-fade-in rounded-md border border-line bg-surface-overlay p-1 shadow-overlay",
              align === "end" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon: Icon,
  checked,
  danger,
  disabled,
  hint,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: LucideIcon;
  /** Set to true/false to render a checkable item. */
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  const ctx = useContext(Ctx);
  const checkable = typeof checked === "boolean";
  return (
    <button
      type="button"
      role={checkable ? "menuitemcheckbox" : "menuitem"}
      aria-checked={checkable ? checked : undefined}
      tabIndex={-1}
      disabled={disabled}
      onClick={() => {
        onSelect();
        ctx?.close();
      }}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors duration-100 focus:bg-surface-raised disabled:opacity-50 hover:bg-surface-raised",
        danger ? "text-rejected" : "text-fg",
      )}
    >
      {Icon ? <Icon aria-hidden strokeWidth={1.75} className="size-4 text-fg-muted" /> : null}
      <span className="flex-1 truncate">{children}</span>
      {hint ? <span className="text-xs text-fg-muted">{hint}</span> : null}
      {checkable && checked ? <Check aria-hidden strokeWidth={2} className="size-4 text-accent" /> : null}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 pb-1 pt-1.5 text-xs text-fg-muted">{children}</div>;
}

export function MenuSeparator() {
  return <div role="separator" className="-mx-1 my-1 h-px bg-line" />;
}
