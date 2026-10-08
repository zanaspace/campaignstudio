import { useState, useEffect } from "react";

/**
 * Drop-in replacement for useState that persists to localStorage.
 * The initializer can be a function (lazy init) or a plain value.
 *
 * Usage:
 *   const [templates, setTemplates] = useLocalState("cs_templates", createInitialData);
 */
export function useLocalState(key, initializer) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch {
      // corrupt data — fall through to initializer
    }
    return typeof initializer === "function" ? initializer() : initializer;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota exceeded — ignore
    }
  }, [key, state]);

  return [state, setState];
}
