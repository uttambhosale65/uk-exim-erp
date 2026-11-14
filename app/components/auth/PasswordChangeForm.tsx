"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (newPassword !== confirmation) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setMessage("Use a new password between 12 and 128 characters.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      if (result.error) {
        setMessage("Password was not changed. Check the current password and try again after signing in again.");
        return;
      }
      setMessage("Password changed. Other sessions were revoked; this session remains active.");
    } catch {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setMessage("Password change could not be confirmed. Sign in again and retry.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-labelledby="owner-password-title" className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 id="owner-password-title" className="text-lg font-semibold text-slate-900">Owner password</h3>
    <p className="mt-1 text-sm text-slate-600">Confirm your current password. Changing it revokes other active sessions. Passwords are sent only in the protected request body and never placed in a URL.</p>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submit} autoComplete="off">
      <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="owner-current-password">Current password
        <input id="owner-current-password" type="password" autoComplete="current-password" maxLength={128} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="owner-new-password">New password
        <input id="owner-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor="owner-password-confirmation">Confirm new password
        <input id="owner-password-confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-10 rounded-md border border-slate-300 px-3" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Changing password…" : "Change owner password"}
        </button>
        {message && <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-700">{message}</p>}
      </div>
    </form>
  </section>;
}
