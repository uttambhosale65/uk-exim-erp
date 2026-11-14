"use client";

import { useState } from "react";
import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setMessage("Sign-out could not be confirmed. Please retry.");
        return;
      }
      window.location.replace("/login");
    } catch {
      setMessage("Sign-out could not be confirmed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Logout"}
    </button>
    {message && <p role="alert" aria-live="polite" className="mt-2 max-w-48 text-xs text-rose-700">{message}</p>}
  </div>;
}
