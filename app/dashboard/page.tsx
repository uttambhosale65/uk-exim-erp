import Link from "next/link";
import { requireOwnerContext } from "@/app/lib/auth/dal";
import LogoutButton from "@/app/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { session, company } = await requireOwnerContext();
  const expiresAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(session.session.expiresAt));

  return (
    <main className="min-h-screen bg-[#f4f6f9] px-5 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">{company.company_name}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome to ERP</h1>
          </div>
          <LogoutButton />
        </header>

        <section className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl bg-slate-950 p-7 text-white shadow-lg shadow-slate-900/10 sm:p-9">
            <p className="text-sm font-medium text-slate-300">Owner dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold">Good to see you, {session.user.name}</h2>
            <p className="mt-3 max-w-xl leading-7 text-slate-300">
              Your owner session is active for {company.company_name}. The current business modules remain on their existing browser storage and are not connected to PostgreSQL yet.
            </p>
            <Link
              href="/erp"
              className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-amber-500 px-5 font-semibold text-slate-950 transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Open existing ERP workspace
            </Link>
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <h2 className="font-semibold">Session status</h2>
            </div>
            <p className="mt-5 text-sm text-slate-500">Signed in as owner</p>
            <p className="mt-1 break-all font-medium">{session.user.username}</p>
            <p className="mt-5 text-sm text-slate-500">Session expires</p>
            <p className="mt-1 font-medium">{expiresAt} IST</p>
            <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Controlled development preview. ERP modules, reports and business data have not been migrated to the cloud database.
            </p>
          </aside>
        </section>

        <p className="px-1 text-xs text-slate-500">Business Management ERP · Local PostgreSQL authentication foundation</p>
      </div>
    </main>
  );
}
