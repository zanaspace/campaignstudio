import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { signIn, useStudioAccess } from "@/lib/studio/access";

const SIGNED_OUT_KEY = "cs-signed-out";
/** Call before signing out so the sign-in page can confirm it (the route guard does the redirect). */
export function noteSignedOut() {
  try { sessionStorage.setItem(SIGNED_OUT_KEY, "1"); } catch { /* ignore */ }
}

/** Sign in with a Studio user's email (any password in this demo). */
export function Login() {
  const navigate = useNavigate();
  const { users, roles } = useStudioAccess();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState("");
  const [signedOut] = React.useState(() => { try { return sessionStorage.getItem(SIGNED_OUT_KEY) === "1"; } catch { return false; } });
  React.useEffect(() => { try { sessionStorage.removeItem(SIGNED_OUT_KEY); } catch { /* ignore */ } }, []);
  const input = "w-full h-[2.8rem] px-3 rounded-[8px] border-[1.5px] border-[var(--input)] bg-[var(--card)] text-[0.95rem] focus:outline-none focus:border-[var(--ring)]";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter your work email");
    if (!password) return setError("Enter your password");
    const err = signIn(email);
    if (err) return setError(err);
    toast.success("Signed in to Campaign Studio");
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center gap-1 mb-6">
          <img src="/images/cicod-crm-logo-light.png" alt="CICOD" className="logo-light h-[64px] w-auto" />
          <img src="/images/cicod-crm-logo-dark.png" alt="CICOD" className="logo-dark h-[64px] w-auto" />
          <span className="font-heading font-bold text-[1.05rem]">Campaign Studio</span>
        </div>
        {signedOut && (
          <div role="status" className="mb-4 rounded-xl border border-[rgba(31,157,115,.3)] bg-[rgba(31,157,115,.06)] px-4 py-3 text-[0.88rem] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" /> You&apos;ve signed out.
          </div>
        )}
        <form onSubmit={submit} aria-labelledby="signin-title" className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-7 flex flex-col gap-5">
          <div>
            <h1 id="signin-title" className="m-0 text-[1.4rem] font-heading font-extrabold">Sign in</h1>
            <p className="m-0 mt-1 text-[0.88rem] text-[var(--muted-foreground)]">Use your CICOD work account.</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.85rem] font-bold">Work email</span>
            <input type="email" autoComplete="username" autoFocus className={input} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="name@cicod.com" />
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="signin-password" className="text-[0.85rem] font-bold">Password</label>
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="text-[0.8rem] font-semibold text-[var(--primary)] flex items-center gap-1">{show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{show ? "Hide" : "Show"}</button>
            </div>
            <input id="signin-password" type={show ? "text" : "password"} autoComplete="current-password" className={input} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
          </div>
          {error && <p role="alert" className="m-0 text-[0.84rem] text-[var(--destructive)]">{error}</p>}
          <Button type="submit" className="w-full h-11"><LogIn className="w-4 h-4 mr-2" /> Sign in</Button>
        </form>
        <section aria-label="Demo accounts" className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-4">
          <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Demo accounts (any password)</div>
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            {users.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => { setEmail(u.email); setError(""); }} className="w-full text-left text-[0.84rem] flex items-center justify-between gap-3 hover:text-[var(--primary)]">
                  <span className="font-mono truncate">{u.email}</span>
                  <span className="text-[var(--muted-foreground)] shrink-0">{roles.find((r) => r.id === u.roleId)?.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
