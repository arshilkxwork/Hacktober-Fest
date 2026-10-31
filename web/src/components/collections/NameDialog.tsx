import { useEffect, useId, useState, type FormEvent } from "react";
import { Button, Dialog, Field, Input } from "@/components/ui";

const MAX = 80;

/** Name a new collection, or rename one. */
export function NameDialog({
  open,
  onClose,
  initial = "",
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: string;
  title: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
}) {
  const formId = useId();
  const [name, setName] = useState(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial);
    setTouched(false);
  }, [open, initial]);

  const error = touched && !name.trim() ? "Give the collection a name." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description="Collections are kept in this browser only."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} variant="primary">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <Field label="Name" error={error} hint={`${name.trim().length} of ${MAX} characters`}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX))}
            placeholder="Narrowing in typing_extensions"
            maxLength={MAX}
            autoComplete="off"
            data-autofocus
          />
        </Field>
      </form>
    </Dialog>
  );
}
