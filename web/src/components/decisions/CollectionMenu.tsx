import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookmarkCheck, BookmarkPlus, FolderOpen, Plus } from "lucide-react";
import { Button, Dialog, Field, IconButton, Input, Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui";
import { useCollections } from "@/lib/collections";
import { routes } from "@/lib/routes";
import { truncate } from "@/lib/format";

/**
 * Add a decision to one of this browser's collections, or start a new one with it.
 * `compact` renders an icon button for cards; the default is a labelled button.
 */
export function CollectionMenu({ decisionId, decisionTitle, compact }: { decisionId: string; decisionTitle: string; compact?: boolean }) {
  const { collections, create, toggle } = useCollections();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const formId = useId();
  const saved = collections.filter((c) => c.decision_ids.includes(decisionId));
  const savedLabel = saved.length === 1 ? `Saved in ${saved[0]!.name}` : `Saved in ${saved.length} collections`;

  const close = () => {
    setOpen(false);
    setName("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create(name, [decisionId]);
    close();
  };

  return (
    <>
      <Menu
        label="Collections"
        className="w-60"
        trigger={(p) =>
          compact ? (
            <IconButton
              {...p}
              icon={saved.length ? BookmarkCheck : BookmarkPlus}
              label={saved.length ? savedLabel : "Add to collection"}
              tooltipSide="left"
              className={saved.length ? "text-accent hover:text-accent" : undefined}
            />
          ) : (
            <Button {...p} icon={saved.length ? BookmarkCheck : BookmarkPlus} className={saved.length ? "text-accent" : undefined}>
              {saved.length ? "Saved" : "Add to collection"}
            </Button>
          )
        }
      >
        <MenuLabel>{collections.length ? "Add to collection" : "No collections yet"}</MenuLabel>
        {collections.map((c) => (
          <MenuItem key={c.id} checked={c.decision_ids.includes(decisionId)} onSelect={() => toggle(c.id, decisionId)} hint={c.decision_ids.length}>
            {c.name}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem icon={Plus} onSelect={() => setOpen(true)}>
          New collection…
        </MenuItem>
        {collections.length ? (
          <MenuItem icon={FolderOpen} onSelect={() => navigate(routes.collections())}>
            Manage collections
          </MenuItem>
        ) : null}
      </Menu>
      <Dialog
        open={open}
        onClose={close}
        title="New collection"
        description={`“${truncate(decisionTitle, 80)}” will be its first decision. Collections are kept in this browser only.`}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={formId} disabled={!name.trim()}>
              Create and add
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit}>
          <Field label="Name">
            <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Typing decisions" autoComplete="off" maxLength={80} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
