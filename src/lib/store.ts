"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny in-memory store so prototype edits (new customers, published plans, notes)
 * survive navigation between pages for the whole session.
 */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
