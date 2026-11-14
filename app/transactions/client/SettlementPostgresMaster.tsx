"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Kind = "receipt" | "supplierPayment";
type Invoice = { id: string; invoice_no: string; invoice_date: string; partner_code: string; invoice_total: string; outstanding: string };
type Payment = { id: string; number: string; date: string; partnerCode: string; paymentMode: string; referenceNo: string; amount: string; voidedAt: string | null; allocations: Array<{ invoiceId: string; invoiceNo: string; amount: string }> };
type Party = { id: string; code: string; name: string; status: string };

export default function SettlementPostgresMaster({ kind }: { kind: Kind }) {
  const receipt = kind === "receipt";
  const basePath = receipt ? "/api/receipts" : "/api/supplier-payments";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [partyCode, setPartyCode] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("Bank");
  const [referenceNo, setReferenceNo] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submissionLock = useRef(false);
  const requestKeyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [invoiceResponse, paymentResponse, partyResponse] = await Promise.all([
        fetch(`${basePath}?outstanding=1`, { cache: "no-store" }),
        fetch(`${basePath}?q=${encodeURIComponent(query)}`, { cache: "no-store" }),
        fetch(receipt ? "/api/customers" : "/api/suppliers", { cache: "no-store" }),
      ]);
      const [invoiceBody, paymentBody, partyBody] = await Promise.all([invoiceResponse.json(), paymentResponse.json(), partyResponse.json()]) as Array<Record<string, unknown>>;
      for (const [response, body] of [[invoiceResponse, invoiceBody], [paymentResponse, paymentBody], [partyResponse, partyBody]] as const) {
        if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Payment data could not be loaded.");
      }
      const invoiceList = invoiceBody.invoices;
      const paymentList = paymentBody.payments;
      const partyList = receipt ? partyBody.customers : partyBody.suppliers;
      if (!Array.isArray(invoiceList) || !Array.isArray(paymentList) || !Array.isArray(partyList)) throw new Error("The payment service returned invalid data.");
      setInvoices(invoiceList as Invoice[]); setPayments(paymentList as Payment[]); setParties(partyList as Party[]);
      setStatus("ready"); setMessage("");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Payment data could not be loaded."); }
  }, [basePath, query, receipt]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const availableInvoices = useMemo(() => invoices.filter(invoice => invoice.partner_code === partyCode), [invoices, partyCode]);
  const selectedInvoice = availableInvoices.find(invoice => invoice.id === invoiceId);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    if (submissionLock.current) return;
    if (!selectedInvoice) { setMessage("Select a verified invoice with an outstanding balance."); return; }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > Number(selectedInvoice.outstanding)) { setMessage("Amount must be positive and cannot exceed the verified outstanding amount."); return; }
    const fingerprint = JSON.stringify({
      [receipt ? "customerCode" : "supplierCode"]: partyCode,
      [receipt ? "receivedOn" : "paidOn"]: paymentDate, paymentMode, amount,
      referenceNo, allocations: [{ [receipt ? "salesId" : "purchaseId"]: invoiceId, amount }],
    });
    if (!requestKeyRef.current || requestKeyRef.current.fingerprint !== fingerprint) {
      requestKeyRef.current = { fingerprint, key: crypto.randomUUID() };
    }
    const payload = { ...JSON.parse(fingerprint) as Record<string, unknown>, requestKey: requestKeyRef.current.key };
    submissionLock.current = true;
    setSaving(true);
    try {
      const response = await fetch(basePath, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Payment could not be saved.");
      requestKeyRef.current = null;
      setAmount(""); setReferenceNo(""); setMessage("Payment saved and allocated.");
      window.dispatchEvent(new Event("ukexim:settlement-data-changed"));
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment could not be saved."); }
    finally { submissionLock.current = false; setSaving(false); }
  };
  const voidPayment = async (payment: Payment) => {
    if (payment.voidedAt || !window.confirm(`Void ${payment.number}? The immutable record will be retained.`)) return;
    try {
      const response = await fetch(`${basePath}/${encodeURIComponent(payment.id)}/void`, { method: "POST" });
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Payment could not be voided.");
      window.dispatchEvent(new Event("ukexim:settlement-data-changed"));
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment could not be voided."); }
  };

  return <section style={{ background: "white", padding: 18, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,.07)" }}>
    <h2 style={{ color: "#14532d", marginTop: 0 }}>{receipt ? "Customer Receipts" : "Supplier Payments"}</h2>
    <p style={{ color: "#6b7280", fontSize: 12 }}>Verified invoice balances only. Historical imported invoice balances remain unverified and are excluded.</p>
    {status === "loading" && <p role="status">Loading PostgreSQL payment records…</p>}
    {status === "error" && <p role="alert">{message}</p>}
    {status === "ready" && <>
      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, padding: 14, background: "#f9fafb", borderRadius: 8 }}>
        <label>{receipt ? "Customer" : "Supplier"}<select required value={partyCode} onChange={event => { setPartyCode(event.target.value); setInvoiceId(""); }} style={{ display: "block", width: "100%", padding: 8 }}><option value="">Select…</option>{parties.filter(party => party.status === "Active").map(party => <option key={party.id} value={party.code}>{party.code} · {party.name}</option>)}</select></label>
        <label>Verified invoice<select required value={invoiceId} onChange={event => setInvoiceId(event.target.value)} style={{ display: "block", width: "100%", padding: 8 }}><option value="">Select…</option>{availableInvoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.invoice_no} · outstanding ₹{invoice.outstanding}</option>)}</select></label>
        <label>Payment date<input required type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} style={{ display: "block", width: "100%", padding: 8 }} /></label>
        <label>Amount<input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} max={selectedInvoice?.outstanding} style={{ display: "block", width: "100%", padding: 8 }} /></label>
        <label>Mode<select value={paymentMode} onChange={event => setPaymentMode(event.target.value)} style={{ display: "block", width: "100%", padding: 8 }}><option>Cash</option><option>UPI</option><option>Bank</option></select></label>
        <label>Reference number<input value={referenceNo} onChange={event => setReferenceNo(event.target.value)} maxLength={120} style={{ display: "block", width: "100%", padding: 8 }} /></label>
        <button type="submit" disabled={saving} style={{ alignSelf: "end", padding: 10, background: "#14532d", color: "white", border: 0, borderRadius: 6 }}>{saving ? "Saving…" : "Save payment"}</button>
      </form>
      {message && <p role="status">{message}</p>}
      <h3>Payment Register</h3>
      <input aria-label="Search payments" placeholder="Search number, party or reference" value={query} onChange={event => setQuery(event.target.value)} style={{ padding: 8, width: "min(100%,420px)" }} />
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}><thead><tr>{["Number", "Date", "Party", "Mode", "Reference", "Amount", "Invoice allocations", "Status", "Action"].map(title => <th key={title} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>{title}</th>)}</tr></thead><tbody>{payments.map(payment => <tr key={payment.id}><td>{payment.number}</td><td>{payment.date}</td><td>{payment.partnerCode}</td><td>{payment.paymentMode}</td><td>{payment.referenceNo || "—"}</td><td>₹{payment.amount}</td><td>{payment.allocations.map(allocation => `${allocation.invoiceNo}: ₹${allocation.amount}`).join(" · ")}</td><td>{payment.voidedAt ? "Voided" : "Posted"}</td><td>{!payment.voidedAt && <button type="button" onClick={() => void voidPayment(payment)}>Void</button>}</td></tr>)}</tbody></table></div>
      {!payments.length && <p role="status">No payment records are available.</p>}
    </>}
  </section>;
}
