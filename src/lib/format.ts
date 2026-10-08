/** Standalone: whoever signed in to Campaign Studio (set by signIn). */
export let CURRENT_USER = "Adeola Adesina";
export function setCurrentUser(name: string) { CURRENT_USER = name; }

const DAY = 86_400_000;

/** Midnight today, so day maths is stable within a session. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Plain dates ("2026-10-07") are read as local days, not UTC midnight, so they never shift by one. */
function parseDate(iso: string): Date {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

/** Local date (yyyy-mm-dd) offset from today, used by mock data so it never goes stale. */
export function daysFromToday(n: number): string {
  const d = new Date(today().getTime() + n * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntil(iso: string): number {
  return Math.round((parseDate(iso).setHours(0, 0, 0, 0) - today().getTime()) / DAY);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return parseDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatRelative(iso: string): string {
  const d = daysUntil(iso);
  if (d === 0) return "today";
  if (d === -1) return "yesterday";
  if (d === 1) return "tomorrow";
  return d < 0 ? `${-d} days ago` : `in ${d} days`;
}

export const CURRENCY_SYMBOL: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£" };

export function formatMoney(amount: number, currency = "NGN"): string {
  return `${CURRENCY_SYMBOL[currency] ?? ""}${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

/** Stored as E.164 (+2349078520406), shown grouped (+234 907 852 0406). */
export function formatPhone(e164?: string): string {
  if (!e164) return "—";
  const m = e164.match(/^\+234(\d{3})(\d{3})(\d{4})$/);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Accepts 0803…, 803…, 234803…, +234803… and returns E.164, or null when it can't be a Nigerian mobile. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("234") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^\d{10}$/.test(local) ? `+234${local}` : null;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/** Unique id for records created in the prototype (kept out of render paths). */
let idSeq = 0;
export function newId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}${idSeq}`;
}
