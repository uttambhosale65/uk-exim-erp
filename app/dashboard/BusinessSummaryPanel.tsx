"use client";

import { useCallback, useEffect, useState } from "react";
import { TRADE_DATA_CHANGED_EVENT } from "@/app/transactions/client/trade-events";

type Summary = {
  exports: Record<string, string | number> & { status: "ready" | "schema_pending" };
  payments: Record<string, string | number> & { status: "ready" | "schema_pending" };
};
const EXPORT_CARDS = [
  ["customers", "Export Customers", "export-customer"], ["enquiries", "Enquiries", "export-enquiry"],
  ["quotations", "Quotations", "export-quotation"], ["proformas", "Proformas", "export-proforma"],
  ["orders", "Export Orders", "export-order"], ["purchases", "Export Purchases", "export-purchase"],
  ["stock", "Export Stock", "export-stock"], ["reservations", "Reservations", "export-reservation"],
  ["packings", "Packing", "export-packing"], ["shipments", "Shipments", "export-shipment"],
  ["invoices", "Commercial Invoices", "export-invoice"],
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
  return <section className={compact ? "dashboard-business-summary" : undefined} style={{ marginTop: compact ? 0 : 12, padding: compact ? 8 : 14, background: "white", border: "1px solid #e5e7eb", borderRadius: 9, minWidth: 0 }}>
    <h3 style={{ margin: compact ? "0 0 5px" : "0 0 10px", color: "#14532d", fontSize: compact ? 13 : undefined }}>{view === "export" ? "Export PostgreSQL Summary" : "Export & Payments Summary"}</h3>
    {error && <p role="alert">Business summary APIs are unavailable. Counts and balances are not assumed.</p>}
    <div className="dashboard-export-summary-cards" style={{ display: "grid", gridTemplateColumns: compact ? "repeat(11, minmax(0, 1fr))" : "repeat(auto-fit,minmax(120px,1fr))", gap: compact ? 5 : 8 }}>
      {(view === "export" ? EXPORT_CARDS : EXPORT_CARDS).map(([key, label, page]) => <button key={key} type="button" onClick={() => onOpen?.(page)} style={{ textAlign: "left", padding: compact ? "5px 7px" : 10, border: "1px solid #d1d5db", borderRadius: 7, background: "#f8fafc", cursor: onOpen ? "pointer" : "default", minWidth: 0 }}>
        <div style={{ fontSize: compact ? 9 : 11, color: "#64748b", lineHeight: 1.15 }}>{label}</div><strong style={{ color: "#14532d", fontSize: compact ? 12 : undefined }}>{count(key, "exports")}</strong>
      </button>)}
    </div>
    {summary?.exports.status === "ready" && (Number(summary.exports.reviewRequired) + Number(summary.exports.customer_review_required) + Number(summary.exports.stockReviewRequired)) > 0 && <p role="status" style={{ color: "#92400e", fontSize: compact ? 10 : undefined, margin: compact ? "4px 0 0" : undefined }}>
      Owner review pending: {summary.exports.customer_review_required ?? 0} Export Customers, {summary.exports.reviewRequired ?? 0} Export documents, and {summary.exports.stockReviewRequired ?? 0} Export Stock rows. These records are preserved and excluded from confirmed operational totals.
    </p>}
    {view === "all" && <div className="dashboard-payment-summary-cards" style={{ display: "grid", gridTemplateColumns: compact ? "repeat(4, minmax(0, 1fr))" : "repeat(auto-fit,minmax(200px,1fr))", gap: compact ? 5 : 8, marginTop: compact ? 5 : 10 }}>
      <div style={{ background: "#f0fdf4", padding: compact ? "5px 7px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 9 : undefined }}>Recorded receipts (non-voided)</small><div style={{ fontSize: compact ? 10 : undefined }}><strong>{money("receipts_total")}</strong> · {count("receipt_count", "payments")} records</div></div>
      <div style={{ background: "#eff6ff", padding: compact ? "5px 7px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 9 : undefined }}>Recorded supplier payments (non-voided)</small><div style={{ fontSize: compact ? 10 : undefined }}><strong>{money("supplier_payments_total")}</strong> · {count("supplier_payment_count", "payments")} records</div></div>
      <div style={{ background: "#fffbeb", padding: compact ? "5px 7px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 9 : undefined }}>Verified outstanding receivables</small><div style={{ fontSize: compact ? 10 : undefined }}><strong>{money("verified_receivables")}</strong></div></div>
      <div style={{ background: "#f5f3ff", padding: compact ? "5px 7px" : 10, borderRadius: 7, minWidth: 0 }}><small style={{ fontSize: compact ? 9 : undefined }}>Verified outstanding payables</small><div style={{ fontSize: compact ? 10 : undefined }}><strong>{money("verified_payables")}</strong></div></div>
    </div>}
    {summary && (summary.exports.status !== "ready" || summary.payments.status !== "ready") && <p role="status" style={{ color: "#92400e", fontSize: compact ? 10 : 12, margin: compact ? "4px 0 0" : undefined }}>One or more summaries are unavailable until the corresponding database migration is applied. No zero balance is inferred.</p>}
  </section>;
}
