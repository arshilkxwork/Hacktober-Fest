import type { ReactNode } from "react";
import { Button, Dialog } from "@/components/ui";

/** Destructive confirmation. Cancel takes focus first so Enter never deletes by accident. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  const body =
    children || error ? (
      <div className="flex flex-col gap-3">
        {children}
        {error ? (
          <p role="alert" className="text-sm text-rejected">
            {error}
          </p>
        ) : null}
      </div>
    ) : undefined;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose} disabled={pending} data-autofocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}
