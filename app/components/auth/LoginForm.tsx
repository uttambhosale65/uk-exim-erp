"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/client";
import { usernameClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [usernameClient({ displayUsername: false })],
});

export default function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!loginId.trim() || !password) {
      setMessage("Enter your Login ID and password.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.signIn.username({
        username: loginId.trim(),
        password,
      });
      if (result.error) {
        setPassword("");
        setMessage(result.error.status === 429
          ? "Too many attempts. Please wait before trying again."
          : "Login ID or password is incorrect.");
        return;
      }
      setPassword("");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setPassword("");
      setMessage("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <div>
        <label htmlFor="login-id" className="mb-2 block text-sm font-medium text-slate-700">Login ID</label>
        <input
          id="login-id"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={50}
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          placeholder="Enter your Login ID"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          placeholder="Enter your password"
          required
        />
      </div>
      {message && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</p>}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
