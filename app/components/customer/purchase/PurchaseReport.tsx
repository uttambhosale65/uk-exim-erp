"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Purchase } from "./PurchaseTypes";

type View = "register" | "products" | "suppliers" | "monthly";
type LoadState = "loading" | "ready" | "empty" | "error";
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const qty = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value);
const control: CSSProperties = { padding: "8px 10px", border: "1px solid #dbe3e8", borderRadius: 7, background: "#fff", color: "#334155" };
const withinDates = (date: string, from: string, to: string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);

async function readJson(response: Response) {
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new Error(`Purchase API returned ${response.status} with a non-JSON response.`);
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Purchase data could not be loaded.");
  return body;
}

async function readAllPurchases() {
  const rows: Purchase[] = [];
  for (let offset = 0; offset < 100000; offset += 200) {
    const body = await readJson(await fetch(`/api/purchases?limit=200&offset=${offset}`, { cache: "no-store", credentials: "same-origin" }));
    if (!Array.isArray(body.transactions)) throw new Error("Purchase API response did not contain a transaction list.");
    rows.push(...body.transactions as Purchase[]);
    if (body.transactions.length < 200) return rows;
  }
  throw new Error("Purchase report exceeds the safe 100,000-record display limit; narrow the report at the source.");
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[=+@\-]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
  const csv = [columns.map(cell).join(","), ...rows.map(row => columns.map(key => cell(row[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function PurchaseReport() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
  const [productCode, setProductCode] = useState("");
  const [view, setView] = useState<View>("register");

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try { const transactions = await readAllPurchases(); setPurchases(transactions); setState(transactions.length ? "ready" : "empty"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Purchase data could not be loaded."); setState("error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const suppliers = useMemo(() => [...new Map(purchases.map(item => [item.supplierCode, item.supplierName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [purchases]);
  const products = useMemo(() => [...new Map(purchases.flatMap(purchase => purchase.items.map(item => [item.productCode, item.productName] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1])), [purchases]);
  const filtered = useMemo(() => purchases.filter(purchase => {
    const q = search.trim().toLocaleLowerCase();
    const matches = !q || [purchase.purchaseNo, purchase.invoiceNo, purchase.supplierCode, purchase.supplierName, purchase.purchaseDate, ...purchase.items.flatMap(item => [item.productCode, item.productName, item.hsn])].some(value => String(value ?? "").toLocaleLowerCase().includes(q));
    return matches && withinDates(purchase.purchaseDate, from, to) && (!supplierCode || purchase.supplierCode === supplierCode)
      && (!productCode || purchase.items.some(item => item.productCode === productCode));
  }).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || b.purchaseNo.localeCompare(a.purchaseNo)), [purchases, search, from, to, supplierCode, productCode]);

  const totalQty = filtered.reduce((sum, row) => sum + row.totalQty, 0);
  const subtotal = filtered.reduce((sum, row) => sum + row.totalAmount, 0);
  const gst = filtered.reduce((sum, row) => sum + row.totalGstAmount, 0);
  const total = filtered.reduce((sum, row) => sum + row.totalNetAmount, 0);
  const productRows = useMemo(() => {
    const groups = new Map<string, { code: string; name: string; quantity: number; amount: number; gst: number; total: number; grns: Set<string> }>();
    for (const purchase of filtered) for (const item of purchase.items) { const row = groups.get(item.productCode) ?? { code: item.productCode, name: item.productName, quantity: 0, amount: 0, gst: 0, total: 0, grns: new Set<string>() }; row.quantity += item.qty; row.amount += item.amount; row.gst += item.gstAmount; row.total += item.netAmount; row.grns.add(purchase.id); groups.set(item.productCode, row); }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);
  const supplierRows = useMemo(() => {
    const groups = new Map<string, { code: string; name: string; grns: number; quantity: number; total: number }>();
    for (const purchase of filtered) { const row = groups.get(purchase.supplierCode) ?? { code: purchase.supplierCode, name: purchase.supplierName, grns: 0, quantity: 0, total: 0 }; row.grns++; row.quantity += purchase.totalQty; row.total += purchase.totalNetAmount; groups.set(purchase.supplierCode, row); }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);
  const monthlyRows = useMemo(() => {
    const groups = new Map<string, { month: string; grns: number; quantity: number; subtotal: number; gst: number; total: number }>();
    for (const purchase of filtered) { const month = purchase.purchaseDate.slice(0, 7); const row = groups.get(month) ?? { month, grns: 0, quantity: 0, subtotal: 0, gst: 0, total: 0 }; row.grns++; row.quantity += purchase.totalQty; row.subtotal += purchase.totalAmount; row.gst += purchase.totalGstAmount; row.total += purchase.totalNetAmount; groups.set(month, row); }
    return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);
  const clearFilters = () => { setSearch(""); setFrom(""); setTo(""); setSupplierCode(""); setProductCode(""); };
  const csvRows = view === "products" ? productRows.map(row => ({ "Product code": row.code, "Product name": row.name, Quantity: row.quantity, GRNs: row.grns.size, "Subtotal INR": row.amount, "GST INR": row.gst, "Total INR": row.total }))
    : view === "suppliers" ? supplierRows.map(row => ({ "Supplier code": row.code, "Supplier name": row.name, GRNs: row.grns, Quantity: row.quantity, "Total INR": row.total }))
      : view === "monthly" ? monthlyRows.map(row => ({ Month: row.month, GRNs: row.grns, Quantity: row.quantity, "Subtotal INR": row.subtotal, "GST INR": row.gst, "Purchase total INR": row.total }))
        : filtered.map(row => ({ "Purchase no": row.purchaseNo, "Supplier invoice": row.invoiceNo, Date: row.purchaseDate, Supplier: row.supplierName, "Supplier code": row.supplierCode, Quantity: row.totalQty, Subtotal: row.totalAmount, GST: row.totalGstAmount, Total: row.totalNetAmount }));

  const tableStyle = { width: "100%", minWidth: 820, borderCollapse: "collapse" as const, fontSize: 12 };
  const table = () => {
    if (view === "products") return <table className="purchase-report-table" style={tableStyle}><thead><tr><th>Product</th><th>Quantity</th><th>GRNs</th><th>Subtotal</th><th>GST</th><th>Total</th></tr></thead><tbody>{productRows.map(row => <tr key={row.code}><td>{row.code} · {row.name}</td><td>{qty(row.quantity)}</td><td>{row.grns.size}</td><td>{money(row.amount)}</td><td>{money(row.gst)}</td><td>{money(row.total)}</td></tr>)}</tbody></table>;
    if (view === "suppliers") return <table className="purchase-report-table" style={tableStyle}><thead><tr><th>Supplier</th><th>GRNs</th><th>Quantity</th><th>Purchase total</th></tr></thead><tbody>{supplierRows.map(row => <tr key={row.code}><td>{row.code} · {row.name}</td><td>{row.grns}</td><td>{qty(row.quantity)}</td><td>{money(row.total)}</td></tr>)}</tbody></table>;
    if (view === "monthly") return <table className="purchase-report-table" style={tableStyle}><thead><tr><th>Month</th><th>GRNs</th><th>Quantity</th><th>Subtotal</th><th>GST</th><th>Purchase total</th></tr></thead><tbody>{monthlyRows.map(row => <tr key={row.month}><td>{row.month}</td><td>{row.grns}</td><td>{qty(row.quantity)}</td><td>{money(row.subtotal)}</td><td>{money(row.gst)}</td><td>{money(row.total)}</td></tr>)}</tbody></table>;
    return <table className="purchase-report-table" style={tableStyle}><thead><tr><th>GRN</th><th>Supplier invoice</th><th>Date</th><th>Supplier</th><th>Items</th><th>Quantity</th><th>Subtotal</th><th>GST</th><th>Total</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.purchaseNo}</td><td>{row.invoiceNo || "—"}</td><td>{row.purchaseDate}</td><td>{row.supplierCode} · {row.supplierName}</td><td>{row.items.map(item => `${item.productCode} · ${item.productName}`).join(", ")}</td><td>{qty(row.totalQty)}</td><td>{money(row.totalAmount)}</td><td>{money(row.totalGstAmount)}</td><td>{money(row.totalNetAmount)}</td></tr>)}</tbody></table>;
  };

  const views: Array<[View, string]> = [["register", "Purchase Register"], ["products", "Product-wise Purchases"], ["suppliers", "Supplier-wise Purchases"], ["monthly", "Monthly Purchase"]];
  return <section className="purchase-report" style={{ maxWidth: 1540, margin: "0 auto", padding: 14, color: "#142c3d" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}><div><h2 style={{ margin: 0, color: "#14532d" }}>📊 Domestic Purchase Reports</h2><p style={{ margin: "5px 0 12px", color: "#64748b", fontSize: 13 }}>Authenticated company-scoped PostgreSQL Purchase and GRN records</p></div><div className="purchase-report-no-print" style={{ display: "flex", gap: 8 }}><button type="button" style={control} onClick={() => window.print()}>Print</button><button type="button" style={control} onClick={() => downloadCsv(`uk-exim-purchases-${view}.csv`, csvRows)} disabled={!csvRows.length}>Export CSV</button></div></header>
    <nav className="purchase-report-no-print" aria-label="Purchase reports" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>{views.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} style={{ ...control, background: view === key ? "#14532d" : "white", color: view === key ? "white" : "#334155", borderColor: view === key ? "#15803d" : "#dbe3e8", fontWeight: 650 }}>{label}</button>)}</nav>
    <div className="purchase-report-no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", padding: 10, borderRadius: 9, marginBottom: 12 }}>
      <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 7 }} /></label>
      <label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 7 }} /></label>
      <label>Supplier<select value={supplierCode} onChange={event => setSupplierCode(event.target.value)} style={{ display: "block", width: "100%", padding: 7 }}><option value="">All suppliers</option>{suppliers.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
      <label>Product<select value={productCode} onChange={event => setProductCode(event.target.value)} style={{ display: "block", width: "100%", padding: 7 }}><option value="">All products</option>{products.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
      <label>Search<input value={search} onChange={event => setSearch(event.target.value)} placeholder="GRN, invoice, supplier, product, HSN" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 7 }} /></label>
      <button type="button" style={{ ...control, alignSelf: "end" }} onClick={clearFilters}>Clear filters</button>
    </div>
    {error && <div role="alert" style={{ padding: 10, borderRadius: 7, background: "#fef2f2", color: "#991b1b", marginBottom: 10 }}>{error} <button type="button" onClick={() => void load()}>Retry</button></div>}
    {state === "loading" && <p role="status">Loading PostgreSQL Purchase Register…</p>}
    {state === "error" && <p role="alert">Purchase report unavailable; no LocalStorage fallback is used.</p>}
    {state === "empty" && <p role="status">No PostgreSQL Purchase records are available.</p>}
    {state === "ready" && <div className="purchase-report-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>{[["GRNs", filtered.length], ["Quantity", qty(totalQty)], ["Subtotal", money(subtotal)], ["GST", money(gst)], ["Purchase total", money(total)]].map(([label, value]) => <div key={String(label)} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderTop: "3px solid #15803d", borderRadius: 8, background: "#fff" }}><div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><strong style={{ display: "block", marginTop: 3, overflowWrap: "anywhere" }}>{value}</strong></div>)}</div>}
    {state === "ready" && <div className="purchase-report-table-wrap" style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9 }}>{table()}{filtered.length === 0 && <p role="status" style={{ padding: 14 }}>No purchases match the selected filters.</p>}</div>}
    <style>{`.purchase-report th,.purchase-report td{padding:8px 9px;text-align:left;border-bottom:1px solid #e7edf0;vertical-align:top}.purchase-report th{background:#f1f5f9;color:#334155;position:sticky;top:0}.purchase-report tr:last-child td{border-bottom:0}@media print{body *{visibility:hidden!important}.purchase-report,.purchase-report *{visibility:visible!important}.purchase-report{position:absolute;inset:0;width:100%;max-width:none!important;padding:0!important}.purchase-report-no-print{display:none!important}.purchase-report-table-wrap{overflow:visible!important;border:0!important}.purchase-report-table{min-width:0!important;font-size:8px!important}.purchase-report th,.purchase-report td{padding:4px!important}.purchase-report-summary{grid-template-columns:repeat(5,1fr)!important}}`}</style>
  </section>;
}
