"use client";

import { useCallback, useEffect, useState } from "react";
import { TRADE_DATA_CHANGED_EVENT } from "@/app/transactions/client/trade-events";

type Summary = {
  exports: Record<string, string | number> & { status: "ready" | "schema_pending"; documentRegister?: { kind: string; availableCount: number; draftCount: number; issuedCount: number; reviewPendingCount: number; evidenceStatus: "not_tracked" }[] };
  payments: Record<string, string | number> & { status: "ready" | "schema_pending" };
};
const EXPORT_CARDS = [
  { key: "customers", label: "Export Customers", verified: "customers", pending: "customer_review_required", page: "export-customer" },
  { key: "enquiries", label: "Enquiries", verified: "enquiries", pending: "enquiriesReviewRequired", page: "export-enquiry" },
  { key: "quotations", label: "Quotations", verified: "quotations", pending: "quotationsReviewRequired", page: "export-quotation" },
  { key: "proformas", label: "Proforma Invoices", verified: "proformas", pending: "proformasReviewRequired", page: "export-proforma" },
  { key: "orders", label: "Export Orders", verified: "orders", pending: "ordersReviewRequired", page: "export-order" },
  { key: "purchases", label: "Export Purchases", verified: "purchases", pending: "purchasesReviewRequired", page: "export-purchase" },
  { key: "stock", label: "Export Stock", verified: "stock", pending: "stockReviewRequired", page: "export-stock" },
  { key: "reservations", label: "Reservations", verified: "reservations", pending: "reservationsReviewRequired", page: "export-reservation" },
  { key: "packings", label: "Packing", verified: "packings", pending: "packingsReviewRequired", page: "export-packing" },
  { key: "shipments", label: "Shipments", verified: "shipments", pending: "shipmentsReviewRequired", page: "export-shipment" },
  { key: "invoices", label: "Commercial Invoices", verified: "invoices", pending: "invoicesReviewRequired", page: "export-invoice" },
] as const;
const EXPORT_DOCUMENTS = [
  { kind: "enquiry", label: "Export Enquiry", page: "export-enquiry" },
  { kind: "quotation", label: "Quotation", page: "export-quotation" },
  { kind: "proforma_invoice", label: "Proforma Invoice", page: "export-proforma" },
  { kind: "order", label: "Export Order", page: "export-order" },
  { kind: "purchase", label: "Export Purchase", page: "export-purchase" },
  { kind: "reservation", label: "Reservation", page: "export-reservation" },
  { kind: "packing", label: "Packing List", page: "export-packing" },
  { kind: "shipment", label: "Shipment", page: "export-shipment" },
  { kind: "commercial_invoice", label: "Commercial Invoice", page: "export-invoice" },
] as const;

export default function BusinessSummaryPanel({ view = "all", onOpen, compact = false }: { view?: "all" | "export"; onOpen?: (page: string) => void; compact?: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/business-summary", { cache: "no-store" });
      if (!response.ok) throw new Error("Summary unavailable");
      setSummary(await response.json() as Summary); setError(false);
    } catch { setSummary(null); setError(true); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    window.addEventListener("focus", load);
    window.addEventListener("ukexim:settlement-data-changed", load);
    window.addEventListener("ukexim:export-data-changed", load);
    window.addEventListener(TRADE_DATA_CHANGED_EVENT, load);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("ukexim:settlement-data-changed", load);
      window.removeEventListener("ukexim:export-data-changed", load);
      window.removeEventListener(TRADE_DATA_CHANGED_EVENT, load);
      window.clearTimeout(timer);
    };
  }, [load]);
  const count = (key: string, group: "exports" | "payments") => {
    if (error) return "Unavailable";
    if (!summary) return "Loading";
    if (summary[group].status !== "ready") return "Migration pending";
    return String(summary[group][key] ?? "0");
  };
  const money = (key: string) => {
    const value = summary?.payments.status === "ready" ? Number(summary.payments[key]) : NaN;
    return Number.isFinite(value) ? `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : error ? "Unavailable" : summary ? "Migration pending" : "Loading";
  };
  if (view === "export") return <ExportDashboard summary={summary?.exports ?? null} error={error} onOpen={onOpen} />;
  return <section className={compact ? "dashboard-business-summary" : undefined} style={{ marginTop: compact ? 0 : 12, padding: compact ? 8 : 14, background: "white", border: "1px solid #e5e7eb", borderRadius: 9, minWidth: 0 }}>
    <h3 style={{ margin: compact ? "0 0 5px" : "0 0 10px", color: "#14532d", fontSize: compact ? 13 : undefined }}>Payments Summary</h3>
    {error && <p role="alert">Business summary APIs are unavailable. Counts and balances are not assumed.</p>}
    <div className="dashboard-payment-summary-cards" style={{ display: "grid", gridTemplateColumns: compact ? "repeat(4, minmax(0, 1fr))" : "repeat(auto-fit,minmax(200px,1fr))", gap: compact ? 6 : 8, marginTop: compact ? 8 : 10 }}>
      <div style={{ background: "#f0fdf4", padding: compact ? "7px 8px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 10 : undefined }}>Recorded receipts (non-voided)</small><div style={{ fontSize: compact ? 11 : undefined }}><strong>{money("receipts_total")}</strong> · {count("receipt_count", "payments")} records</div></div>
      <div style={{ background: "#eff6ff", padding: compact ? "7px 8px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 10 : undefined }}>Recorded supplier payments (non-voided)</small><div style={{ fontSize: compact ? 11 : undefined }}><strong>{money("supplier_payments_total")}</strong> · {count("supplier_payment_count", "payments")} records</div></div>
      <div style={{ background: "#fffbeb", padding: compact ? "7px 8px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 10 : undefined }}>Verified outstanding receivables</small><div style={{ fontSize: compact ? 11 : undefined }}><strong>{money("verified_receivables")}</strong></div></div>
      <div style={{ background: "#f5f3ff", padding: compact ? "7px 8px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 10 : undefined }}>Verified outstanding payables</small><div style={{ fontSize: compact ? 11 : undefined }}><strong>{money("verified_payables")}</strong></div></div>
    </div>
    {summary && summary.payments.status !== "ready" && <p role="status" style={{ color: "#92400e", fontSize: compact ? 10 : 12, margin: compact ? "4px 0 0" : undefined }}>Payment summary is unavailable until its database migration is applied. No zero balance is inferred.</p>}
  </section>;
}

function ExportDashboard({ summary, error, onOpen }: { summary: Summary["exports"] | null; error: boolean; onOpen?: (page: string) => void }) {
  const ready = summary?.status === "ready";
  const value = (key: string) => ready ? Number(summary[key] ?? 0) : null;
  const verified = (key: string) => value(key) ?? 0;
  const pending = (key: string) => value(key) ?? 0;
  const totalFor = (item: typeof EXPORT_CARDS[number]) => ready ? verified(item.verified) + pending(item.pending) : null;
  const totals = ready ? EXPORT_CARDS.reduce((result, item) => ({
    total: result.total + (totalFor(item) ?? 0),
    verified: result.verified + verified(item.verified),
    pending: result.pending + pending(item.pending),
  }), { total: 0, verified: 0, pending: 0 }) : null;
  const heuristic = ready ? Number(summary.heuristicCustomerCount ?? 0) + Number(summary.heuristicDocumentCount ?? 0) + Number(summary.heuristicStockCount ?? 0) : null;
  const metric = (key: string) => error ? "Unavailable" : !summary ? "Loading" : summary.status === "schema_pending" ? "Migration pending" : String(value(key));
  const nav = (page: string) => onOpen?.(page);
  const groups = [
    { title: "Enquiries & quotations", count: ready ? verified("enquiries") + pending("enquiriesReviewRequired") + verified("quotations") + pending("quotationsReviewRequired") : null, links: [["Enquiry", "export-enquiry"], ["Quotation", "export-quotation"]] },
    { title: "Proforma & orders", count: ready ? verified("proformas") + pending("proformasReviewRequired") + verified("orders") + pending("ordersReviewRequired") : null, links: [["Proforma invoices", "export-proforma"], ["Export orders", "export-order"]] },
    { title: "Purchases & stock", count: ready ? verified("purchases") + pending("purchasesReviewRequired") + verified("stock") + pending("stockReviewRequired") : null, links: [["Export purchases", "export-purchase"], ["Export stock", "export-stock"]] },
    { title: "Reservations & packing", count: ready ? verified("reservations") + pending("reservationsReviewRequired") + verified("packings") + pending("packingsReviewRequired") : null, links: [["Reservations", "export-reservation"], ["Packing", "export-packing"]] },
    { title: "Shipments & invoices", count: ready ? verified("shipments") + pending("shipmentsReviewRequired") + verified("invoices") + pending("invoicesReviewRequired") : null, links: [["Shipments", "export-shipment"], ["Commercial invoices", "export-invoice"]] },
  ];
  return <div className="export-dashboard">
    <style>{`
      .export-dashboard { display:grid; gap:10px; min-width:0; color:#172b3a; }
      .export-dashboard-section { min-width:0; border:1px solid #e2e8f0; border-radius:12px; background:#fff; box-shadow:0 4px 14px rgba(15,35,50,.055); padding:10px 12px; }
      .export-dashboard-section h3 { margin:0 0 8px; color:#15364b; font-size:13px; line-height:1.25; }
      .export-dashboard-kpis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; }
      .export-dashboard-kpi { display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:5px; min-height:70px; padding:9px 10px; border:1px solid #dbe5ea; border-radius:10px; background:linear-gradient(145deg,#fff 0%,#f7faf9 100%); color:#15364b; text-align:left; cursor:pointer; box-shadow:0 2px 7px rgba(15,35,50,.04); }
      .export-dashboard-kpi:hover,.export-dashboard-link:hover { border-color:#81b89a; background:#f0fdf4; }
      .export-dashboard-kpi-label { color:#526575; font-size:11px; font-weight:650; line-height:1.25; }
      .export-dashboard-kpi-count { color:#12643c; font-size:22px; font-weight:800; font-variant-numeric:tabular-nums; line-height:1; }
      .export-dashboard-kpi-meta { color:#64748b; font-size:10px; line-height:1.3; }
      .export-dashboard-status { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
      .export-dashboard-status-card { min-width:0; padding:8px 10px; border-radius:9px; background:#f5f8fa; border:1px solid #e5ebef; }
      .export-dashboard-status-card strong { display:block; color:#15364b; font-size:18px; font-variant-numeric:tabular-nums; }
      .export-dashboard-status-card span { color:#596b78; font-size:10px; line-height:1.3; }
      .export-dashboard-groups { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
      .export-dashboard-group { min-width:0; border:1px solid #e2e8f0; border-radius:10px; padding:9px; background:#fff; }
      .export-dashboard-group h4 { margin:0; color:#203b4e; font-size:11px; line-height:1.3; }
      .export-dashboard-group-count { margin:6px 0; color:#12643c; font-size:18px; font-weight:800; }
      .export-dashboard-group-links { display:grid; gap:4px; }
      .export-dashboard-link { border:1px solid #e2e8f0; border-radius:6px; padding:5px 7px; background:#f8fafc; color:#244b62; text-align:left; font:inherit; font-size:10px; cursor:pointer; }
      .export-dashboard-review-note { margin:7px 0 0; color:#7c4a08; font-size:10px; line-height:1.4; }
      .export-dashboard-register { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
      .export-dashboard-register-row { display:grid; grid-template-columns:minmax(0,1.2fr) auto; gap:4px 8px; min-width:0; padding:7px 8px; border:1px solid #e5ebef; border-radius:8px; background:#fbfdfe; }
      .export-dashboard-register-row button { justify-self:start; padding:0; border:0; background:transparent; color:#1d5d42; text-align:left; font:inherit; font-size:11px; font-weight:600; line-height:1.25; cursor:pointer; }
      .export-dashboard-register-row strong { color:#15364b; font-size:12px; font-variant-numeric:tabular-nums; }
      .export-dashboard-register-detail { grid-column:1/-1; color:#596b78; font-size:9px; line-height:1.25; }
      .export-dashboard-actions { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
      .export-dashboard-actions button { border:1px solid #cfe1d7; border-radius:6px; padding:5px 7px; background:#f4fbf7; color:#1c5138; font:inherit; font-size:10px; font-weight:600; line-height:1.2; cursor:pointer; }
      .export-dashboard-alert { margin:0; padding:9px 11px; border:1px solid #fed7aa; border-radius:9px; background:#fff7ed; color:#9a3412; font-size:12px; }
      @media (max-width: 1100px) { .export-dashboard-kpis { grid-template-columns:repeat(4,minmax(0,1fr)); } .export-dashboard-groups { grid-template-columns:repeat(3,minmax(0,1fr)); } }
      @media (max-width: 700px) { .export-dashboard-kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } .export-dashboard-status { grid-template-columns:repeat(2,minmax(0,1fr)); } .export-dashboard-groups { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width: 700px) { .export-dashboard-register { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width: 420px) { .export-dashboard-kpis,.export-dashboard-groups { grid-template-columns:1fr; } }
      @media (max-width: 420px) { .export-dashboard-register { grid-template-columns:1fr; } }
    `}</style>

    {(error || summary?.status === "schema_pending") && <p className="export-dashboard-alert" role="alert">{error ? "Export summary is unavailable. Counts are not assumed." : "Export summary migration is pending. Counts are not assumed."}</p>}

    <section className="export-dashboard-section" aria-label="Export source and review status">
      <h3>Source &amp; review status</h3>
      <div className="export-dashboard-status">
        <div className="export-dashboard-status-card"><strong>{totals?.total ?? metric("customers")}</strong><span>Total source records</span></div>
        <div className="export-dashboard-status-card"><strong>{totals?.verified ?? metric("customers")}</strong><span>Owner-verified operational records</span></div>
        <div className="export-dashboard-status-card"><strong>{totals?.pending ?? metric("customer_review_required")}</strong><span>Review-pending records</span></div>
        <div className="export-dashboard-status-card"><strong>{heuristic ?? metric("heuristicDocumentCount")}</strong><span>Heuristic-flagged records</span></div>
      </div>
      {ready && <p className="export-dashboard-review-note" role="status">{totals?.pending ?? 0} records remain on review hold. The {heuristic ?? 0} heuristic flags are review hints, not evidence that records are invalid: 4 match flagged customer codes and 5 match flagged document IDs. These are source-identifier hints only; they do not establish authenticity or invalidity.</p>}
    </section>

    <section className="export-dashboard-section" aria-label="Export record counts">
      <h3>International Export records · total source records with verified and pending breakdown</h3>
      <div className="export-dashboard-kpis">
        {EXPORT_CARDS.map((item) => {
          const total = totalFor(item);
          return <button className="export-dashboard-kpi" key={item.key} type="button" onClick={() => nav(item.page)} aria-label={`Open ${item.label}`}>
            <span className="export-dashboard-kpi-label">{item.label}</span>
            <strong className="export-dashboard-kpi-count">{total ?? metric(item.verified)}</strong>
            <span className="export-dashboard-kpi-meta">{ready ? `${verified(item.verified)} verified · ${pending(item.pending)} pending` : error ? "Unavailable" : summary?.status === "schema_pending" ? "Migration pending" : "Loading"}</span>
          </button>;
        })}
      </div>
    </section>

    <section className="export-dashboard-section" aria-label="Export document centre">
      <h3>Export Document Centre · company-scoped register status</h3>
      {ready ? <div className="export-dashboard-register">
        {EXPORT_DOCUMENTS.map((document) => {
          const row = summary.documentRegister?.find((item) => item.kind === document.kind);
          const available = row?.availableCount ?? 0;
          return <div className="export-dashboard-register-row" key={document.kind}>
            <button type="button" onClick={() => nav(document.page)}>{document.label}</button>
            <strong>{available} available</strong>
            <span className="export-dashboard-register-detail">Draft {row?.draftCount ?? 0} · Issued {row?.issuedCount ?? 0} · Evidence pending: Not tracked</span>
            <span className="export-dashboard-register-detail">Next action: {row?.reviewPendingCount ? "Review source and evidence" : available ? "Open register" : "Create when supported"}</span>
          </div>;
        })}
      </div> : <p className="export-dashboard-review-note" role={error ? "alert" : "status"}>{metric("customers")} — document status is not inferred.</p>}
      <div className="export-dashboard-actions" aria-label="Export quick actions">
        {[["New Export Customer", "export-customer"], ["New Enquiry", "export-enquiry"], ["Create Quotation", "export-quotation"], ["Create Proforma", "export-proforma"], ["Create Export Order", "export-order"], ["Prepare Commercial Invoice", "export-invoice"], ["Create Packing List", "export-packing"]].map(([label, page]) => <button key={label} type="button" onClick={() => nav(page)}>{label} →</button>)}
        <button type="button" disabled title="CHA checklist is not represented in the current schema; no submission action is available.">CHA Document Pack · unavailable</button>
      </div>
      <p className="export-dashboard-review-note">Evidence attachments, CHA checklist state, revisions, cancellation history and payment-realisation status are not tracked in the current export schema.</p>
    </section>

    <section className="export-dashboard-section" aria-label="Export pipeline overview">
      <h3>Export pipeline overview · record counts only</h3>
      <div className="export-dashboard-groups">
        {groups.map((group) => <div className="export-dashboard-group" key={group.title}>
          <h4>{group.title}</h4>
          <div className="export-dashboard-group-count">{group.count ?? (error ? "Unavailable" : "Loading")}</div>
          <div className="export-dashboard-group-links">{group.links.map(([label, page]) => <button className="export-dashboard-link" type="button" key={page} onClick={() => nav(page)}>{label} →</button>)}</div>
        </div>)}
      </div>
    </section>

    <div className="dashboard-brand-ticker" aria-label="UK EXIM ENTERPRISES, UTTAM HALDI, वाईच्या कुशीतील उत्तम सातारी हळद. Delivering Indian purity across continents.">
      <div className="dashboard-brand-ticker-track">
        <span><strong>UK EXIM ENTERPRISES</strong><span className="ticker-separator">✦</span><strong>UTTAM HALDI</strong><span>वाईच्या कुशीतील उत्तम सातारी हळद</span><span>Delivering Indian purity across continents</span></span>
        <span aria-hidden="true"><strong>UK EXIM ENTERPRISES</strong><span className="ticker-separator">✦</span><strong>UTTAM HALDI</strong><span>वाईच्या कुशीतील उत्तम सातारी हळद</span><span>Delivering Indian purity across continents</span></span>
      </div>
    </div>
  </div>;
}
