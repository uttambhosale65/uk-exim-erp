"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import StockTable from "@/app/components/stock/StockTable";
import type { Stock } from "@/app/components/stock/StockTypes";
import type { Product } from "@/app/product/components/ProductTypes";

type EventRow = { transactionType: string; transactionId: string; revision: number; eventType: string; lineId: string; productCode: string; stockCode: string; quantityDeltaKg: string; sourceQuantity: string; unit: string; netWeightGrams: string; postedAt: string };
type ViewState = "loading" | "ready" | "empty" | "error";
const control: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d7e1e7", borderRadius: 7, background: "#fff", color: "#243746", font: "inherit" };

async function readJson(url: string) {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new Error(`Stock API returned ${response.status} with a non-JSON response.`);
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Stock data could not be loaded.");
  return body;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[=+@\-]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
  const csv = [columns.map(cell).join(","), ...rows.map(row => columns.map(key => cell(row[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function StockPostgresMaster() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [state, setState] = useState<ViewState>("loading");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const refresh = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const [stockBody, productBody, ledgerBody] = await Promise.all([
        readJson("/api/stock/current"), readJson("/api/products"), readJson("/api/stock/ledger?limit=500&offset=0"),
      ]);
      if (!Array.isArray(stockBody.stock) || !Array.isArray(productBody.products) || !Array.isArray(ledgerBody.events)) throw new Error("Stock API response was invalid.");
      const rows = (stockBody.stock as Array<Record<string, string>>).map(row => ({
        id: row.id, productCode: row.productCode, productName: row.productName, hsn: row.hsn, unit: row.unit,
        openingStock: Number(row.openingStock), purchaseQty: Number(row.purchaseQty), salesQty: Number(row.salesQty),
        grossPurchaseMovementQty: Number(row.grossPurchaseMovementQty), grossSalesMovementQty: Number(row.grossSalesMovementQty), currentStock: Number(row.currentStock),
      }));
      setStock(rows); setProducts(productBody.products as Product[]); setEvents(ledgerBody.events as EventRow[]); setState(rows.length ? "ready" : "empty");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Stock data could not be loaded."); setState("error"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  const filteredStock = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return stock.filter(row => !q || [row.productCode, row.productName, row.hsn].some(value => String(value ?? "").toLocaleLowerCase().includes(q)));
  }, [stock, search]);
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return events.filter(event => {
      const day = event.postedAt.slice(0, 10);
      return (!from || day >= from) && (!to || day <= to)
        && (!q || [event.transactionType, event.transactionId, event.eventType, event.lineId, event.productCode, event.stockCode, event.unit].some(value => String(value ?? "").toLocaleLowerCase().includes(q)));
    });
  }, [events, search, from, to]);
  const low = filteredStock.filter(row => { const minimum = Number(products.find(product => product.code === row.productCode)?.minimumStock || 0); return minimum > 0 && row.currentStock < minimum; });
  const clearFilters = () => { setSearch(""); setFrom(""); setTo(""); };

  return <section className="postgres-stock-report" style={{ maxWidth: 1500, margin: "0 auto", padding: 12, color: "#233746" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}><div><h2 style={{ color: "#14532d", margin: "0 0 5px" }}>📦 Stock Register & Report</h2><p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>Authenticated company-scoped PostgreSQL balances and immutable movement ledger</p></div><div className="stock-report-no-print" style={{ display: "flex", gap: 7 }}><button type="button" style={control} onClick={() => window.print()}>Print</button><button type="button" style={control} onClick={() => downloadCsv("uk-exim-current-stock.csv", filteredStock.map(row => ({ "Product code": row.productCode, "Product name": row.productName, HSN: row.hsn, Unit: row.unit, "Opening baseline": row.openingStock, "Net purchase": row.purchaseQty, "Net sales": row.salesQty, "Current stock": row.currentStock })))} disabled={!filteredStock.length}>Export stock CSV</button><button type="button" style={control} onClick={() => downloadCsv("uk-exim-stock-ledger.csv", filteredEvents.map(event => ({ "Posted at": event.postedAt, Transaction: event.transactionType, ID: event.transactionId, Event: event.eventType, Revision: event.revision, Line: event.lineId, Product: event.productCode, "Stock code": event.stockCode, "Quantity delta KG": event.quantityDeltaKg, Unit: event.unit })))} disabled={!filteredEvents.length}>Export ledger CSV</button></div></header>
    <p style={{ margin: "10px 0", padding: 10, background: "#fffbeb", borderRadius: 6, color: "#854d0e", fontSize: 12 }}>Opening balances are protected and read-only. Current stock is the verified baseline plus company-scoped PostgreSQL movement events. Ledger quantities show posted movement events; no historical monthly movement is inferred.</p>
    <div className="stock-report-no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, padding: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 12 }}>
      <label>Search product, document or stock code<input aria-label="Search stock report" value={search} onChange={event => setSearch(event.target.value)} style={{ ...control, display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
      <label>Movement from<input type="date" value={from} onChange={event => setFrom(event.target.value)} style={{ ...control, display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
      <label>Movement to<input type="date" value={to} onChange={event => setTo(event.target.value)} style={{ ...control, display: "block", width: "100%", boxSizing: "border-box", marginTop: 4 }} /></label>
      <button type="button" style={{ ...control, alignSelf: "end" }} onClick={clearFilters}>Clear filters</button>
    </div>
    {error && <div role="alert" style={{ padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 6 }}>{error} <button type="button" onClick={() => void refresh()}>Retry</button></div>}
    {state === "loading" && <p role="status">Loading PostgreSQL stock…</p>}
    {state === "error" && <p role="alert">Stock report unavailable; no LocalStorage fallback is used.</p>}
    {state === "empty" && <p role="status">No verified stock baseline is available. Stock posting remains blocked until an approved baseline is verified.</p>}
    {state === "ready" && <>
      {low.length > 0 && <div role="alert" style={{ padding: 10, background: "#fff7ed", color: "#9a3412", marginBottom: 10 }}><strong>Minimum stock alerts:</strong> {low.map(row => row.productCode).join(", ")}</div>}
      <h3 style={{ margin: "10px 0 6px", color: "#14532d" }}>Current stock & verified opening baseline</h3>
      <StockTable stock={filteredStock} />
      {filteredStock.length === 0 && <p role="status">No stock rows match the current search.</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}><h3 style={{ marginTop: 20, color: "#14532d" }}>Post-cutover Stock Movement Ledger</h3><span style={{ color: "#64748b", fontSize: 11 }}>{filteredEvents.length} shown · ledger events are retained as recorded</span></div>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}><table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}><thead><tr>{["Posted at", "Transaction", "Transaction ID", "Revision", "Line", "Product", "Stock code", "Qty delta (kg)"].map(title => <th key={title} style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #14532d", background: "#f8fafc" }}>{title}</th>)}</tr></thead><tbody>{filteredEvents.length ? filteredEvents.map(event => <tr key={`${event.transactionType}-${event.transactionId}-${event.revision}-${event.eventType}-${event.lineId}`}><td>{new Date(event.postedAt).toLocaleString()}</td><td>{event.transactionType} / {event.eventType}</td><td>{event.transactionId}</td><td>{event.revision}</td><td>{event.lineId}</td><td>{event.productCode}</td><td>{event.stockCode}</td><td>{Number(event.quantityDeltaKg).toFixed(6)}</td></tr>) : <tr><td colSpan={8} style={{ padding: 18, textAlign: "center", color: "#64748b" }}>No ledger events match these filters. This does not imply missing historical stock movement.</td></tr>}</tbody></table></div>
    </>}
    <style>{`@media print{.stock-report-no-print{display:none!important}.postgres-stock-report{max-width:none!important;padding:0!important}.postgres-stock-report>div{overflow:visible!important}.postgres-stock-report table{font-size:8px!important;min-width:0!important}.postgres-stock-report th,.postgres-stock-report td{padding:4px!important}}`}</style>
  </section>;
}
