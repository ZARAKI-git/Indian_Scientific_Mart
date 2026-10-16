"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { browserDb } from "@/lib/supabase/browser";

export default function AdminLogin() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("denied"))
      setMsg("This account is signed in but is not an admin. Ask the site owner to add it.");
  }, []);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg("");
    const { error } = await browserDb().auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
    setBusy(false);
    if (error) return setMsg("Those details didn't work. Check the email and password.");
    router.replace("/admin");
    router.refresh();
  };
  return (
    <div className="login">
      <form className="qcard" onSubmit={submit}>
        <span className="tag">Indian Scientific Mart</span>
        <h1 style={{ fontSize: "clamp(26px,2.4vw,34px)" }}>Admin sign in</h1>
        <p>Catalogue edits, the OCR review queue and incoming quote requests.</p>
        <div className="fgrid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="field"><label htmlFor="ae">Email</label><input id="ae" name="email" type="email" autoComplete="username" required /></div>
          <div className="field"><label htmlFor="ap">Password</label><input id="ap" name="password" type="password" autoComplete="current-password" required /></div>
          <div className="form-foot"><button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
            <span className={`msg${msg ? " bad" : ""}`} role="status" aria-live="polite">{msg}</span></div>
        </div>
      </form>
    </div>
  );
}
