"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  options: string[];
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  className?: string;
  /** Accessible name when there is no visible <label>. */
  ariaLabel?: string;
  /** Show a filter box at the top of the list (useful for long lists such as countries). */
  searchable?: boolean;
  invalid?: boolean;
}

export function Select({ options, placeholder = "Select...", value, onChange, className, ariaLabel, searchable, invalid }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internal, setInternal] = React.useState(value || "");
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  // Controlled when `value` is passed, so external resets show up.
  const selected = value !== undefined ? value : internal;
  const visible = searchable && query ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    setInternal(option);
    setIsOpen(false);
    setQuery("");
    if (onChange) onChange(option);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !searchable) {
      e.preventDefault();
      const idx = options.indexOf(selected);
      const next = options[Math.min(options.length - 1, Math.max(0, idx + (e.key === "ArrowDown" ? 1 : -1)))];
      if (next) handleSelect(next);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full select-none", className)} onKeyDown={onKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={ariaLabel}
        className={cn(
          "flex items-center justify-between h-full min-h-10 w-full rounded-md border-[1.5px] border-[var(--input)] bg-[var(--card)] px-4 py-2 text-[0.85rem] text-[var(--foreground)] cursor-pointer transition-colors text-left focus:outline-none focus-visible:border-[var(--ring)]",
          isOpen ? "border-[var(--ring)] shadow-[0_0_0_1px_var(--ring)]" : "",
          invalid ? "border-[var(--destructive)]" : ""
        )}
      >
        <span className={cn("truncate min-w-0", !selected ? "text-[var(--muted-foreground)]" : "font-medium")}>
          {selected || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-[var(--muted-foreground)] pointer-events-none" />
      </button>

      {isOpen && (
        // preventDefault stops a wrapping <label> from forwarding the click back to the trigger (which would re-open the list).
        <div id={listId} role="listbox" onClick={(e) => e.preventDefault()} className="absolute top-[calc(100%+4px)] left-0 w-full min-w-[180px] max-h-[240px] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg z-50 p-1">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="w-full h-8 mb-1 px-2 rounded border border-[var(--input)] bg-[var(--background)] text-[0.82rem] focus:outline-none focus:border-[var(--ring)]"
            />
          )}
          {visible.length === 0 && <div className="px-3 py-2 text-[0.82rem] text-[var(--muted-foreground)]">No matches</div>}
          {visible.map((opt) => (
            <div
              key={opt}
              role="option"
              aria-selected={selected === opt}
              onClick={() => handleSelect(opt)}
              className={cn(
                "px-3 py-2 text-[0.85rem] cursor-pointer rounded transition-colors",
                selected === opt
                  ? "bg-[rgba(242,169,59,0.08)] text-[var(--primary)] font-semibold"
                  : "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              )}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
