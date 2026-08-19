"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  parseShortlist,
  serializeShortlist,
  SHORTLIST_STORAGE_KEY,
  toggleShortlistId,
} from "@/lib/shortlist";

const SHORTLIST_EVENT = "trilemma-shortlist";

type ShortlistContextValue = {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
};

const ShortlistContext = createContext<ShortlistContextValue>({
  ids: [],
  toggle: () => {},
  clear: () => {},
});

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SHORTLIST_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SHORTLIST_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(SHORTLIST_STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function persist(ids: string[]) {
  window.localStorage.setItem(SHORTLIST_STORAGE_KEY, serializeShortlist(ids));
  window.dispatchEvent(new Event(SHORTLIST_EVENT));
}

export function ShortlistProvider({
  knownIds,
  children,
}: {
  knownIds: string[];
  children: ReactNode;
}) {
  const known = useMemo(() => new Set(knownIds), [knownIds]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ids = useMemo(() => parseShortlist(raw, known), [known, raw]);

  const toggle = useCallback(
    (id: string) => persist(toggleShortlistId(ids, id, known)),
    [ids, known],
  );
  const clear = useCallback(() => persist([]), []);

  return (
    <ShortlistContext.Provider value={{ ids, toggle, clear }}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist() {
  return useContext(ShortlistContext);
}
