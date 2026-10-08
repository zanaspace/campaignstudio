import { useState } from "react";

const GREEN = "#055F36", GREEN_MID = "#21714B";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mock auth — any valid email + non-empty password signs in.
// Swap signIn() for a real POST /api/auth/login when wiring the backend.
export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = EMAIL_RE.test(email.trim()) && pwd.length > 0;

  const signIn = () => {
    if (!EMAIL_RE.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (!pwd) { setError("Enter your password."); return; }
    setError("");
    setLoading(true);
    // mock latency — replace with real auth call
    setTimeout(() => {
      onLogin({ email: email.trim(), name: email.trim().split("@")[0], remember });
    }, 700);
  };

  return (
    <div style={wrap}>
      <style>{`@keyframes cs-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={card}>
        <div style={{ padding: "28px 30px 0", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: GREEN }}>1Government Cloud</div>
          <div style={{ fontSize: 10, color: GREEN, marginTop: 1 }}>Towards the Digitalization of the Public Service</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#121A26", marginTop: 22 }}>Sign in to Campaign Studio</div>
          <div style={{ fontSize: 13, color: "#707070", marginTop: 4 }}>Welcome back — please enter your details</div>
        </div>

        <div style={{ padding: "22px 30px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Email address">
            <input type="email" value={email} placeholder="you@galaxybackbone.com.ng"
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              style={{ ...input, borderColor: error && !EMAIL_RE.test(email.trim()) ? "#E0584F" : "#ddd" }} />
          </Field>

          <Field label="Password">
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
              <input type={showPwd ? "text" : "password"} value={pwd} placeholder="••••••••"
                onChange={(e) => { setPwd(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) signIn(); }}
                style={{ ...input, paddingRight: 38 }} />
              <button type="button" onClick={() => setShowPwd((s) => !s)} aria-label="Toggle password visibility"
                style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 12, fontFamily: "inherit" }}>
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, color: "#4B4D4C", cursor: "pointer" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: GREEN }} /> Remember me
            </label>
            <a onClick={() => alert("Mock login — password reset would go here.")} style={{ color: GREEN, cursor: "pointer" }}>Forgot password?</a>
          </div>

          <div style={{ fontSize: 11, color: "#A32D2D", minHeight: 14 }}>{error}</div>

          <button onClick={signIn} disabled={!canSubmit || loading}
            style={{ ...signinBtn, opacity: (!canSubmit || loading) ? 0.5 : 1, cursor: (!canSubmit || loading) ? "not-allowed" : "pointer" }}>
            {loading
              ? <><span style={spinner} /> Signing in…</>
              : "Sign in"}
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#707070", paddingBottom: 24 }}>
          New to Campaign Studio? <a onClick={() => alert("Mock login — request-access flow would go here.")} style={{ color: GREEN, fontWeight: 500, cursor: "pointer" }}>Request access</a>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#4B4D4C", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</label>
      {children}
    </div>
  );
}

const wrap = { fontFamily: "Poppins, system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0f9f5 0%,#EBEBEB 100%)", padding: 30, boxSizing: "border-box" };
const card = { background: "#fff", border: "0.5px solid #e4e4e4", borderRadius: 16, boxShadow: "0 10px 40px rgba(5,95,54,.08)", width: "100%", maxWidth: 440, overflow: "hidden", boxSizing: "border-box" };
const input = { fontSize: 14, padding: "11px 12px", borderRadius: 9, border: "0.5px solid #ddd", background: "#fafafa", color: "#121A26", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
const signinBtn = { padding: 12, borderRadius: 9, border: "none", background: GREEN, color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", boxSizing: "border-box" };
const spinner = { width: 15, height: 15, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "cs-spin .6s linear infinite" };
