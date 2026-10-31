import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFocusTrap, useScrollLock } from "@/lib/focus";
import { IconButton } from "./Button";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

const overlay = "fixed inset-0 bg-black/55";

/**
 * Centred modal.
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Rename collection" footer={…}>…</Dialog>
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEscape(open, onClose);
  useFocusTrap(ref, open);
  useScrollLock(open);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div className={overlay} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            aria-describedby={description ? `${id}-d` : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-line bg-surface-overlay shadow-overlay focus:outline-none",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
              <div>
                <h2 id={`${id}-t`} className="text-lg font-semibold text-fg">
                  {title}
                </h2>
                {description ? (
                  <p id={`${id}-d`} className="mt-1 text-sm text-fg-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <IconButton icon={X} label="Close" size="sm" tooltip={false} onClick={onClose} className="-mr-1.5 -mt-0.5" />
            </div>
            {children ? <div className="min-h-0 overflow-y-auto px-5 pb-4">{children}</div> : null}
            {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Edge panel; used for mobile navigation and side details. */
export function Sheet({
  open,
  onClose,
  side = "left",
  label,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  /** Accessible name of the sheet. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(open, onClose);
  useFocusTrap(ref, open);
  useScrollLock(open);
  const from = side === "left" ? "-100%" : "100%";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.div className={overlay} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={{ x: from }}
            animate={{ x: 0 }}
            exit={{ x: from }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute inset-y-0 z-10 flex w-[min(300px,86vw)] flex-col border-line bg-bg focus:outline-none",
              side === "left" ? "left-0 border-r" : "right-0 border-l",
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
