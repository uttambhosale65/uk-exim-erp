"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Sales } from "./SalesTypes";

type View = "register" | "products" | "customers" | "monthly" | "gst" | "non-gst" | "outstanding";
type Outstanding = { id: string; invoice_no: string; invoice_date: string; partner_code: string; invoice_total: string; outstanding: string };
type LoadState = "idle" | "loading" | "ready" | "empty" | "error";
const button = (active: boolean): CSSProperties => ({ padding: "8px 11px", borderRadius: 7, border: `1px solid ${active ? "#15803d" : "#dbe3e8"}`, background: active ? "#14532d" : "#fff", color: active ? "#fff" : "#334155", fontWeight: 650, cursor: "pointer" });
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const quantity = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value);
const withinDates = (date: string, from: string, to: string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to);

async function jsonResponse(response: Response) {
  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) throw new Error(`Sales API returned ${response.status} with a non-JSON response.`);
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Sales data could not be loaded.");
  return body;
}

async function readAllSales() {
  const rows: Sales[] = [];
  for (let offset = 0; offset < 100000; offset += 200) {
    const body = await jsonResponse(await fetch(`/api/sales?limit=200&offset=${offset}`, { cache: "no-store", credentials: "same-origin" }));
    if (!Array.isArray(body.transactions)) throw new Error("Sales API response did not contain a transaction list.");
    rows.push(...body.transactions as Sales[]);
    if (body.transactions.length < 200) return rows;
  }
  throw new Error("Sales report exceeds the safe 100,000-record display limit; narrow the report at the source.");
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = [columns.map(cell).join(","), ...rows.map(row => columns.map(column => cell(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function SalesReport() {
  const [sales, setSales] = useState<Sales[]>([]);
  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [outstandingState, setOutstandingState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [productCode, setProductCode] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<View>("register");

  const load = useCallback(async () => {
    setState("loading"); setError("");
    try { const transactions = await readAllSales(); setSales(transactions); setState(transactions.length ? "ready" : "empty"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Sales data could not be loaded."); setState("error"); }
  }, []);

  const loadOutstanding = useCallback(async () => {
    setOutstandingState("loading");
    try {
      const body = await jsonResponse(await fetch("/api/receipts?outstanding=1&limit=200", { cache: "no-store", credentials: "same-origin" }));
      if (!Array.isArray(body.invoices)) throw new Error("The verified receivables response was invalid.");
      setOutstanding(body.invoices as Outstanding[]); setOutstandingState((body.invoices as Outstanding[]).length ? "ready" : "empty");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Verified receivables could not be loaded."); setOutstandingState("error"); }
  }, []);

  useEffect(() => {
    let active = true;
    void readAllSales()
      .then(transactions => { if (active) { setSales(transactions); setState(transactions.length ? "ready" : "empty"); } })
      .catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : "Sales data could not be loaded."); setState("error"); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (view !== "outstanding" || outstandingState !== "idle") return;
    let active = true;
    void fetch("/api/receipts?outstanding=1&limit=200", { cache: "no-store", credentials: "same-origin" })
      .then(jsonResponse)
      .then(body => {
        if (!Array.isArray(body.invoices)) throw new Error("The verified receivables response was invalid.");
        if (active) { setOutstanding(body.invoices as Outstanding[]); setOutstandingState((body.invoices as Outstanding[]).length ? "ready" : "empty"); }
      })
      .catch(cause => { if (active) { setError(cause instanceof Error ? cause.message : "Verified receivables could not be loaded."); setOutstandingState("error"); } });
    return () => { active = false; };
  }, [view, outstandingState]);

  const customers = useMemo(() => [...new Map(sales.map(sale => [sale.customerCode, sale.customerName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [sales]);
  const products = useMemo(() => [...new Map(sales.flatMap(sale => sale.items.map(item => [item.productCode, item.productName] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1])), [sales]);
  const filtered = useMemo(() => sales.filter(sale => {
    const q = search.trim().toLocaleLowerCase();
    const matchesSearch = !q || [sale.salesNo, sale.invoiceNo, sale.customerName, sale.customerCode, sale.salesDate, sale.status, ...sale.items.flatMap(item => [item.productCode, item.productName, item.hsn])].some(value => String(value ?? "").toLocaleLowerCase().includes(q));
    return matchesSearch && withinDates(sale.salesDate, from, to) && (!customerCode || sale.customerCode === customerCode)
      && (!productCode || sale.items.some(item => item.productCode === productCode)) && (!statusFilter || sale.status === statusFilter)
      && (view !== "gst" || sale.invoiceType === "GST") && (view !== "non-gst" || sale.invoiceType === "NON_GST");
  }).sort((a, b) => b.salesDate.localeCompare(a.salesDate) || b.salesNo.localeCompare(a.salesNo)), [sales, search, from, to, customerCode, productCode, statusFilter, view]);

  const total = filtered.reduce((sum, sale) => sum + sale.grandTotal, 0);
  const taxable = filtered.reduce((sum, sale) => sum + sale.taxableAmount, 0);
  const tax = filtered.reduce((sum, sale) => sum + sale.gstAmount, 0);
  const qty = filtered.reduce((sum, sale) => sum + sale.items.reduce((lineTotal, item) => lineTotal + item.qty, 0), 0);

  const productRows = useMemo(() => {
    const groups = new Map<string, { code: string; name: string; quantity: number; taxable: number; tax: number; total: number; invoices: Set<string> }>();
    for (const sale of filtered) for (const item of sale.items) {
      const key = item.productCode; const row = groups.get(key) ?? { code: key, name: item.productName, quantity: 0, taxable: 0, tax: 0, total: 0, invoices: new Set<string>() };
      row.quantity += item.qty; row.taxable += item.taxableAmount; row.tax += item.gstAmount; row.total += item.grandTotal; row.invoices.add(sale.id); groups.set(key, row);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);
  const customerRows = useMemo(() => {
    const groups = new Map<string, { code: string; name: string; invoices: number; total: number; pending: number }>();
    for (const sale of filtered) { const key = sale.customerCode; const row = groups.get(key) ?? { code: key, name: sale.customerName, invoices: 0, total: 0, pending: 0 }; row.invoices++; row.total += sale.grandTotal; if (sale.status === "Pending") row.pending++; groups.set(key, row); }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);
  const monthlyRows = useMemo(() => {
    const groups = new Map<string, { month: string; invoices: number; gst: number; nonGst: number; total: number }>();
    for (const sale of filtered) { const month = sale.salesDate.slice(0, 7); const row = groups.get(month) ?? { month, invoices: 0, gst: 0, nonGst: 0, total: 0 }; row.invoices++; row.total += sale.grandTotal; if (sale.invoiceType === "GST") row.gst += sale.grandTotal; else row.nonGst += sale.grandTotal; groups.set(month, row); }
    return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const clearFilters = () => { setSearch(""); setFrom(""); setTo(""); setCustomerCode(""); setProductCode(""); setStatusFilter(""); };
  const groupCsv = view === "products" ? productRows.map(row => ({ "Product code": row.code, "Product name": row.name, Quantity: row.quantity, Invoices: row.invoices.size, "Taxable amount INR": row.taxable, "GST amount INR": row.tax, "Invoice total INR": row.total }))
    : view === "customers" ? customerRows.map(row => ({ "Customer code": row.code, "Customer name": row.name, Invoices: row.invoices, "Pending invoices": row.pending, "Sales INR": row.total }))
      : view === "monthly" ? monthlyRows.map(row => ({ Month: row.month, Invoices: row.invoices, "GST sales INR": row.gst, "Without GST sales INR": row.nonGst, "Sales total INR": row.total }))
        : view === "outstanding" ? outstanding.map(row => ({ "Invoice no": row.invoice_no, Date: String(row.invoice_date).slice(0, 10), "Customer code": row.partner_code, "Invoice total INR": row.invoice_total, "Verified outstanding INR": row.outstanding }))
          : filtered.map(sale => ({ "Sales no": sale.salesNo, "Invoice no": sale.invoiceNo, Date: sale.salesDate, "Invoice type": sale.invoiceType, Customer: sale.customerName, "Customer code": sale.customerCode, Status: sale.status, Taxable: sale.taxableAmount, GST: sale.gstAmount, Total: sale.grandTotal }));

  const renderRows = () => {
    const tableStyle = { width: "100%", minWidth: 900, borderCollapse: "collapse" as const, fontSize: 12 };
    if (view === "products") return <table className="sales-report-table" style={tableStyle}><thead><tr><th>Product</th><th>Quantity</th><th>Invoices</th><th>Taxable amount</th><th>GST</th><th>Total sales</th></tr></thead><tbody>{productRows.map(row => <tr key={row.code}><td>{row.code} · {row.name}</td><td>{quantity(row.quantity)}</td><td>{row.invoices.size}</td><td>{money(row.taxable)}</td><td>{money(row.tax)}</td><td>{money(row.total)}</td></tr>)}</tbody></table>;
    if (view === "customers") return <table className="sales-report-table" style={tableStyle}><thead><tr><th>Customer</th><th>Invoices</th><th>Pending</th><th>Sales total</th></tr></thead><tbody>{customerRows.map(row => <tr key={row.code}><td>{row.code} · {row.name}</td><td>{row.invoices}</td><td>{row.pending}</td><td>{money(row.total)}</td></tr>)}</tbody></table>;
    if (view === "monthly") return <table className="sales-report-table" style={tableStyle}><thead><tr><th>Month</th><th>Invoices</th><th>GST Tax Invoice</th><th>Without GST Invoice</th><th>Total sales</th></tr></thead><tbody>{monthlyRows.map(row => <tr key={row.month}><td>{row.month}</td><td>{row.invoices}</td><td>{money(row.gst)}</td><td>{money(row.nonGst)}</td><td>{money(row.total)}</td></tr>)}</tbody></table>;
    if (view === "outstanding") return <table className="sales-report-table" style={tableStyle}><thead><tr><th>Invoice</th><th>Date</th><th>Customer code</th><th>Invoice total</th><th>Verified outstanding</th></tr></thead><tbody>{outstanding.map(row => <tr key={row.id}><td>{row.invoice_no}</td><td>{String(row.invoice_date).slice(0, 10)}</td><td>{row.partner_code}</td><td>{money(Number(row.invoice_total))}</td><td>{money(Number(row.outstanding))}</td></tr>)}</tbody></table>;
    return <table className="sales-report-table" style={tableStyle}><thead><tr><th>Sales no</th><th>Invoice no</th><th>Date</th><th>Type</th><th>Customer</th><th>Quantity</th><th>Taxable</th><th>GST</th><th>Total</th><th>Status</th></tr></thead><tbody>{filtered.map(sale => <tr key={sale.id}><td>{sale.salesNo}</td><td>{sale.invoiceNo}</td><td>{sale.salesDate}</td><td>{sale.invoiceType === "GST" ? "GST Tax Invoice" : "Without GST Invoice"}</td><td>{sale.customerCode} · {sale.customerName}</td><td>{quantity(sale.items.reduce((sum, item) => sum + item.qty, 0))}</td><td>{money(sale.taxableAmount)}</td><td>{money(sale.gstAmount)}</td><td>{money(sale.grandTotal)}</td><td>{sale.status}</td></tr>)}</tbody></table>;
  };

  const views: Array<[View, string]> = [["register", "Sales Register"], ["products", "Product-wise Sales"], ["customers", "Customer-wise Sales"], ["monthly", "Monthly Sales"], ["gst", "GST Register"], ["non-gst", "Without GST Register"], ["outstanding", "Verified Outstanding"]];
  return <section className="sales-report" style={{ maxWidth: 1540, margin: "0 auto", padding: 14, color: "#142c3d" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}>
      <div><h2 style={{ margin: 0, color: "#14532d" }}>📊 Domestic Sales Reports</h2><p style={{ margin: "5px 0 12px", color: "#64748b", fontSize: 13 }}>Authenticated company-scoped PostgreSQL records · GST and Without GST invoices remain separate</p></div>
      <div className="sales-report-no-print" style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => window.print()} style={button(false)}>Print</button><button type="button" onClick={() => downloadCsv(`uk-exim-sales-${view}.csv`, groupCsv)} disabled={!groupCsv.length} style={button(false)}>Export CSV</button></div>
    </header>
    <nav className="sales-report-no-print" aria-label="Sales reports" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{views.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} style={button(view === key)}>{label}</button>)}</nav>
    {view !== "outstanding" && <div className="sales-report-no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", padding: 10, borderRadius: 9, marginBottom: 12 }}>
      <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} style={{ display: "block", width: "100%", padding: 7, boxSizing: "border-box" }} /></label>
      <label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} style={{ display: "block", width: "100%", padding: 7, boxSizing: "border-box" }} /></label>
      <label>Customer<select value={customerCode} onChange={event => setCustomerCode(event.target.value)} style={{ display: "block", width: "100%", padding: 7 }}><option value="">All customers</option>{customers.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
      <label>Product<select value={productCode} onChange={event => setProductCode(event.target.value)} style={{ display: "block", width: "100%", padding: 7 }}><option value="">All products</option>{products.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></label>
      <label>Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={{ display: "block", width: "100%", padding: 7 }}><option value="">All statuses</option><option>Completed</option><option>Pending</option><option>Cancelled</option></select></label>
      <label>Search<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Document, customer, product, HSN" style={{ display: "block", width: "100%", padding: 7, boxSizing: "border-box" }} /></label>
      <button type="button" onClick={clearFilters} style={{ ...button(false), alignSelf: "end" }}>Clear filters</button>
    </div>}
    {error && <div role="alert" style={{ padding: 10, borderRadius: 7, background: "#fef2f2", color: "#991b1b", marginBottom: 12 }}>{error} <button type="button" onClick={() => view === "outstanding" ? void loadOutstanding() : void load()}>Retry</button></div>}
    {state === "loading" && <p role="status">Loading PostgreSQL Sales Register…</p>}
    {state === "error" && <p role="alert">Sales report unavailable; no local-storage fallback is used.</p>}
    {state === "ready" && view !== "outstanding" && <div className="sales-report-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
      {[ ["Invoices", filtered.length], ["Quantity", quantity(qty)], ["Taxable", money(taxable)], ["GST", money(tax)], ["Sales total", money(total)] ].map(([label, value]) => <div key={String(label)} style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderTop: "3px solid #15803d", borderRadius: 8, background: "#fff" }}><div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><strong style={{ display: "block", marginTop: 3, overflowWrap: "anywhere" }}>{value}</strong></div>)}
    </div>}
    {view === "outstanding" && <p style={{ color: "#854d0e", background: "#fffbeb", padding: 10, borderRadius: 7 }}>Only balances backed by verified receipt allocations are shown. Historical imported sales balances are unverified and excluded.</p>}
    {view === "outstanding" && outstandingState === "loading" && <p role="status">Loading verified outstanding invoices…</p>}
    {view === "outstanding" && outstandingState === "error" && <p role="alert">{error || "Verified outstanding report is unavailable."}</p>}
    {view === "outstanding" && outstandingState === "empty" && <p role="status">No verified outstanding invoice balances are available. Historical Pending status is not treated as a verified balance.</p>}
    {state === "empty" && view !== "outstanding" && <p role="status">No PostgreSQL Sales records match this report.</p>}
    {state === "ready" && view !== "outstanding" && <div className="sales-report-table-wrap" style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9 }}>{renderRows()}{filtered.length === 0 && <p role="status" style={{ padding: 14 }}>No sales match the selected filters.</p>}</div>}
    {view === "outstanding" && outstandingState === "ready" && <div className="sales-report-table-wrap" style={{ overflowX: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9 }}>{renderRows()}</div>}
    <style>{`.sales-report th,.sales-report td{padding:8px 9px;text-align:left;border-bottom:1px solid #e7edf0;vertical-align:top}.sales-report th{background:#f1f5f9;color:#334155;position:sticky;top:0}.sales-report tr:last-child td{border-bottom:0}@media print{body *{visibility:hidden!important}.sales-report,.sales-report *{visibility:visible!important}.sales-report{position:absolute;inset:0;width:100%;max-width:none!important;padding:0!important}.sales-report-no-print{display:none!important}.sales-report-table-wrap{overflow:visible!important;border:0!important}.sales-report-table{min-width:0!important;font-size:8px!important}.sales-report th,.sales-report td{padding:4px!important}.sales-report-summary{grid-template-columns:repeat(5,1fr)!important}}`}</style>
  </section>;
}
