import { redirect } from "next/navigation";
import { getOwnerContext } from "@/app/lib/auth/dal";
import LoginForm from "@/app/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getOwnerContext()) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#081528] px-5 py-12 text-slate-900">
      <div className="pointer-events-none absolute -left-24 -top-28 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-20 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/30 md:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-[#122846] to-[#16425b] p-11 text-white md:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-lg font-bold text-amber-300">UK</div>
            <p className="mt-10 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Business Management ERP</p>
            <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">A clearer view of your business.</h1>
            <p className="mt-5 max-w-sm leading-7 text-slate-300">A secure owner sign-in for the UK EXIM ENTERPRISES development preview.</p>
          </div>
          <p className="text-xs text-slate-400">UK EXIM ENTERPRISES · Owner access</p>
        </div>
        <div className="p-7 sm:p-10 md:p-12">
          <div className="mb-8 md:hidden">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">UK EXIM ENTERPRISES</p>
            <p className="mt-2 text-sm text-slate-500">Business Management ERP</p>
          </div>
          <p className="text-sm font-semibold text-amber-700">OWNER ACCESS</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to your account</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Enter your Login ID and password to continue.</p>
          <LoginForm />
          <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">Access is provisioned locally by the company owner. Public registration is disabled.</p>
        </div>
      </section>
    </main>
  );
}
