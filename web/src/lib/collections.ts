import { useMemo, useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "./storage";

/** A named, local-only list of decision ids. Lives in this browser's localStorage. */
export interface Collection {
  id: string;
  name: string;
  decision_ids: string[];
  created_at: string;
  updated_at: string;
}

const KEY = "decisiontrail.collections.v1";
const listeners = new Set<() => void>();
let cache: Collection[] | null = null;

function load(): Collection[] {
  if (cache) return cache;
  const raw = readStorage<unknown>(KEY, []);
  cache = Array.isArray(raw)
    ? raw.filter(
        (c): c is Collection =>
          !!c && typeof c === "object" && typeof (c as Collection).id === "string" && Array.isArray((c as Collection).decision_ids),
      )
    : [];
  return cache;
}

function commit(next: Collection[]): void {
  cache = next;
  writeStorage(KEY, next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function touch(c: Collection, patch: Partial<Collection>): Collection {
  return { ...c, ...patch, updated_at: new Date().toISOString() };
}

export function getCollections(): Collection[] {
  return load();
}

export function getCollection(id: string): Collection | undefined {
  return load().find((c) => c.id === id);
}

export function createCollection(name: string, decisionIds: string[] = []): Collection {
  const now = new Date().toISOString();
  const c: Collection = {
    id: newId(),
    name: name.trim() || "Untitled collection",
    decision_ids: Array.from(new Set(decisionIds)),
    created_at: now,
    updated_at: now,
  };
  commit([...load(), c]);
  return c;
}

export function renameCollection(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  commit(load().map((c) => (c.id === id ? touch(c, { name: trimmed }) : c)));
}

export function deleteCollection(id: string): void {
  commit(load().filter((c) => c.id !== id));
}

export function addToCollection(id: string, decisionId: string): void {
  commit(
    load().map((c) =>
      c.id === id && !c.decision_ids.includes(decisionId) ? touch(c, { decision_ids: [...c.decision_ids, decisionId] }) : c,
    ),
  );
}

export function removeFromCollection(id: string, decisionId: string): void {
  commit(
    load().map((c) => (c.id === id ? touch(c, { decision_ids: c.decision_ids.filter((d) => d !== decisionId) }) : c)),
  );
}

export function toggleInCollection(id: string, decisionId: string): void {
  if (isInCollection(id, decisionId)) removeFromCollection(id, decisionId);
  else addToCollection(id, decisionId);
}

export function isInCollection(id: string, decisionId: string): boolean {
  return !!getCollection(id)?.decision_ids.includes(decisionId);
}

export function collectionsContaining(decisionId: string): Collection[] {
  return load().filter((c) => c.decision_ids.includes(decisionId));
}

const api = {
  create: createCollection,
  rename: renameCollection,
  remove: deleteCollection,
  add: addToCollection,
  removeDecision: removeFromCollection,
  toggle: toggleInCollection,
  isIn: isInCollection,
  containing: collectionsContaining,
};

/** Live list of collections plus the mutators. Re-renders on change, including from other tabs. */
export function useCollections() {
  const collections = useSyncExternalStore(subscribe, load, load);
  return useMemo(() => ({ collections, ...api }), [collections]);
}
