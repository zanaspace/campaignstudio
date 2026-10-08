/**
 * The standalone Campaign Studio frame in the CICOD CRM design: sidebar, breadcrumb header, user menu.
 * Like the original app, the sidebar only shows the modules the signed-in user's role can view.
 */
import * as React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LayoutTemplate, Send, Contact, Plug, ShieldCheck, ChevronRight, Moon, LogOut, RotateCcw, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { can, signOut, useStudioAccess, useStudioPermissions, type StudioModule } from "@/lib/studio/access";
import { useStudioTemplates } from "@/lib/studio/templates";
import { useStudioCampaigns } from "@/lib/studio/campaigns";
import { resetDemoData } from "@/persist";
import { noteSignedOut } from "@/shell/Login";

export const MODULE_NAV: { id: StudioModule; label: string; to: string; icon: React.ElementType }[] = [
  { id: "templates", label: "Template Library", to: "/templates", icon: LayoutTemplate },
  { id: "campaigns", label: "Campaigns", to: "/campaigns", icon: Send },
  { id: "contacts", label: "Contacts", to: "/contacts", icon: Contact },
  { id: "integrations", label: "Integrations", to: "/integrations", icon: Plug },
  { id: "admin", label: "Studio Admin", to: "/admin", icon: ShieldCheck },
];

export function StudioShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const { role } = useStudioPermissions("templates");
  const visible = MODULE_NAV.filter((m) => can(role, m.id, "view"));
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <aside className={cn("bg-[var(--sidebar-background)] border-r border-[var(--sidebar-border)] flex flex-col h-screen fixed inset-y-0 left-0 z-50 transition-[width] duration-300", collapsed ? "w-[72px]" : "w-[260px]")}>
        <div className={cn("h-[70px] flex items-center border-b border-[var(--sidebar-border)]", collapsed ? "justify-center" : "justify-between px-5")}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label="Campaign Studio home">
              <img src="/images/cicod-crm-logo-light.png" alt="CICOD" className="logo-light h-[46px] w-auto" />
              <img src="/images/cicod-crm-logo-dark.png" alt="CICOD" className="logo-dark h-[46px] w-auto" />
              <span className="font-heading font-bold text-[0.95rem] leading-tight text-[var(--foreground)]">Campaign<br />Studio</span>
            </Link>
          )}
          <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="p-1.5 rounded-md text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav aria-label="Main" className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-4")}>
          {!collapsed && <div className="text-[0.75rem] text-[#6B7787] uppercase font-semibold tracking-wider px-3 pt-2 pb-2">Campaign Studio</div>}
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            {visible.map((m) => (
              <li key={m.id} title={collapsed ? m.label : undefined}>
                <NavLink to={m.to} className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors", collapsed && "justify-center",
                  isActive ? "text-[var(--sidebar-accent-foreground)] bg-[var(--accent)] font-heading font-semibold" : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] font-medium")}>
                  <m.icon className="w-5 h-5 shrink-0" />{!collapsed && <span className="text-[0.92rem] truncate">{m.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className={cn("flex-1 flex flex-col h-screen overflow-hidden transition-[margin-left] duration-300", collapsed ? "ml-[72px]" : "ml-[260px]")}>
        <Header />
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}

/* ---------------- Header: breadcrumb, theme, user menu ---------------- */

const THEME_KEY = "cs-theme";
function Header() {
  const crumbs = useCrumbs();
  const [dark, setDark] = React.useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* ignore */ }
    setDark(next);
  };
  return (
    <header className="h-[70px] bg-[var(--background)] border-b border-[var(--border)] px-8 flex items-center justify-between sticky top-0 z-40">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[0.9rem] text-[var(--muted-foreground)] min-w-0">
        {crumbs.map((c, i) => (
          <React.Fragment key={`${c.label}-${i}`}>
            {i > 0 && <ChevronRight className="w-4 h-4 shrink-0" />}
            {i === crumbs.length - 1 ? <span aria-current="page" className="font-heading font-semibold text-[var(--foreground)] truncate">{c.label}</span>
              : c.to ? <Link to={c.to} className="hover:text-[var(--foreground)] whitespace-nowrap">{c.label}</Link> : <span className="whitespace-nowrap">{c.label}</span>}
          </React.Fragment>
        ))}
      </nav>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-[var(--muted-foreground)]" />
          <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={toggle} className={cn("relative w-10 h-5 rounded-full transition-colors flex items-center", dark ? "bg-[var(--primary)]" : "bg-[var(--input)]")}>
            <span className={cn("absolute w-4 h-4 bg-white rounded-full shadow-sm transition-transform", dark ? "translate-x-5" : "translate-x-1")} />
          </button>
        </div>
        <div className="border-l border-[var(--border)] pl-6"><UserMenu /></div>
      </div>
    </header>
  );
}

function useCrumbs(): { label: string; to?: string }[] {
  const { pathname } = useLocation();
  const templates = useStudioTemplates();
  const campaigns = useStudioCampaigns();
  const [first, id, extra] = pathname.split("/").filter(Boolean);
  const mod = MODULE_NAV.find((m) => m.to === `/${first}`);
  const crumbs: { label: string; to?: string }[] = [{ label: "Campaign Studio", to: "/" }];
  if (!mod) return [...crumbs, { label: "Not found" }];
  crumbs.push({ label: mod.label, to: id ? mod.to : undefined });
  if (id && first === "templates") {
    crumbs.push({ label: templates.find((t) => t.id === id)?.name ?? id, to: extra ? `/templates/${id}` : undefined });
    if (extra === "compare") crumbs.push({ label: "Compare versions" });
  }
  if (id && first === "campaigns") crumbs.push({ label: campaigns.find((c) => c.id === id)?.name ?? id });
  return crumbs;
}

function UserMenu() {
  const { me, role } = useStudioPermissions("templates");
  const { roles } = useStudioAccess();
  const [open, setOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!me) return null;
  const item = "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-[0.88rem] hover:bg-[var(--muted)] focus:bg-[var(--muted)] focus:outline-none";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" title={me.name}
        className="w-9 h-9 rounded-full bg-[var(--accent)] border-2 border-[var(--card)] hover:border-[var(--primary)]/50 flex items-center justify-center text-[var(--primary)] font-heading font-bold text-[0.8rem] shadow-sm">
        {initials(me.name)}
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-12 z-50 w-[270px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <div className="font-heading font-bold text-[0.92rem] truncate">{me.name}</div>
            <div className="text-[0.8rem] text-[var(--muted-foreground)] truncate">{me.email}</div>
            <Badge variant="secondary" className="mt-2">{role?.name ?? roles[0]?.name}</Badge>
          </div>
          <div className="p-1.5 border-b border-[var(--border)]">
            <button role="menuitem" className={item} onClick={() => { setOpen(false); setResetting(true); }}><RotateCcw className="w-4 h-4 text-[var(--muted-foreground)]" /> Reset demo data</button>
          </div>
          <div className="p-1.5">
            <button role="menuitem" className={cn(item, "text-[var(--destructive)] font-semibold")} onClick={() => { setOpen(false); noteSignedOut(); signOut(); }}><LogOut className="w-4 h-4" /> Log out</button>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={resetting} onClose={() => setResetting(false)} onConfirm={resetDemoData} tone="danger" icon={<RotateCcw className="w-6 h-6" />}
        title="Reset the demo data?" description="Everything saved in this browser (templates, campaigns, contacts, users) goes back to the starting demo data." confirmLabel="Reset" />
    </div>
  );
}
