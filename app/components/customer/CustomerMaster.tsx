"use client";

import { useCallback, useEffect, useState } from "react";
import CustomerForm from "./CustomerForm";
import CustomerTable from "./CustomerTable";
import { Customer } from "./CustomerTypes";
import { CUSTOMER_DATA_CHANGED_EVENT } from "../../customer/customer-events";

type CustomerListResponse = { customers: Customer[]; nextCode: string };

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "(missing content-type)";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Customer API returned ${contentType} (HTTP ${response.status}); expected JSON.`);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new Error(`Customer API returned invalid JSON (HTTP ${response.status}).`);
  }
}

async function readError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "(missing content-type)";
  if (!contentType.toLowerCase().includes("application/json")) {
    return `Customer API returned ${contentType} (HTTP ${response.status}); expected a JSON error response.`;
  }
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : `The customer request failed (HTTP ${response.status}).`;
}

function inputPayload(customer: Customer) {
  return Object.fromEntries(
    Object.entries(customer).filter(([field]) => field !== "id" && field !== "code"),
  );
}

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCode, setCustomerCode] = useState("C0001");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshCustomers = useCallback(async (query = search, status = statusFilter) => {
    const params = new URLSearchParams({ q: query, status });
    const response = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    const data = await readJson<CustomerListResponse>(response);
    setCustomers(data.customers);
    setCustomerCode(data.nextCode);
  }, [search, statusFilter]);

  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: search, status: statusFilter });
        const response = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(await readError(response));
        const data = await readJson<CustomerListResponse>(response);
        if (current) {
          setCustomers(data.customers);
          setCustomerCode(data.nextCode);
        }
      } catch (loadError) {
        if (current) setError(loadError instanceof Error ? loadError.message : "Customers could not be loaded.");
      } finally {
        if (current) setLoading(false);
      }
    }, search ? 200 : 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [search, statusFilter]);

  const handleSave = async (customer: Customer): Promise<boolean> => {
    setError("");
    const payload = inputPayload(customer);
    const duplicateResponse = await fetch("/api/customers/duplicate-check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: editingCustomer?.id ?? null, mobile: customer.mobile, email: customer.email, gst: customer.gst }),
    });
    if (!duplicateResponse.ok) throw new Error(await readError(duplicateResponse));
    const duplicateData = await readJson<{ warnings: string[] }>(duplicateResponse);
    if (duplicateData.warnings.length > 0) {
      const labels = duplicateData.warnings.map((field) => ({ mobile: "mobile", email: "email", gst: "GST" }[field] ?? field));
      if (!window.confirm(`Possible same-company matches were found for ${labels.join(", ")}. Review for duplicates; no records will be merged. Save anyway?`)) {
        return false;
      }
    }

    const editing = Boolean(editingCustomer);
    const response = await fetch(editing ? `/api/customers/${encodeURIComponent(customer.id)}` : "/api/customers", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await readError(response));
    window.dispatchEvent(new Event(CUSTOMER_DATA_CHANGED_EVENT));
    setEditingCustomer(null);
    await refreshCustomers();
    return true;
  };

  const handleSetStatus = async (customer: Customer) => {
    const nextStatus = customer.status === "Active" ? "Inactive" : "Active";
    if (!window.confirm(`${nextStatus === "Inactive" ? "Deactivate" : "Reactivate"} customer ${customer.code}? Existing records will be retained.`)) return;
    setError("");
    const response = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
      method: nextStatus === "Inactive" ? "DELETE" : "POST",
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    window.dispatchEvent(new Event(CUSTOMER_DATA_CHANGED_EVENT));
    await refreshCustomers();
  };

  return (
    <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <h2 style={{ marginTop: 0, marginBottom: "20px" }}>👥 Customer Master</h2>
      {error && <p role="alert" style={{ color: "#b91c1c", background: "#fef2f2", padding: "10px", borderRadius: "6px" }}>{error}</p>}

      <CustomerForm
        key={editingCustomer?.id ?? `new:${customerCode}`}
        customerCode={customerCode}
        editingCustomer={editingCustomer}
        onSave={handleSave}
        onCancelEdit={() => setEditingCustomer(null)}
      />

      <hr style={{ margin: "25px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#374151", fontSize: "12px" }}>
        Status
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      {loading && <p role="status">Loading customers…</p>}
      {!loading && !error && customers.length === 0 && <p role="status">No customers found in PostgreSQL.</p>}
      {!loading && !error && <CustomerTable
        customers={customers}
        search={search}
        onSearch={setSearch}
        onEdit={setEditingCustomer}
        onView={setViewingCustomer}
        onSetStatus={(customer) => void handleSetStatus(customer)}
      />}

      {viewingCustomer && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingCustomer(null); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: "20px" }}>
          <section role="dialog" aria-modal="true" aria-labelledby="customer-details-title" style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "min(720px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <h2 id="customer-details-title">Customer details</h2>
              <button type="button" onClick={() => setViewingCustomer(null)}>Close</button>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px 18px" }}>
              {[
                ["Code", viewingCustomer.code], ["Name", viewingCustomer.name], ["Contact person", viewingCustomer.contactPerson],
                ["Mobile", viewingCustomer.mobile], ["Email", viewingCustomer.email], ["GST", viewingCustomer.gst],
                ["PAN", viewingCustomer.pan], ["Address", viewingCustomer.address], ["City", viewingCustomer.city],
                ["State", viewingCustomer.state], ["Country", viewingCustomer.country], ["PIN code", viewingCustomer.pinCode],
                ["Opening balance", String(viewingCustomer.openingBalance)], ["Credit limit", String(viewingCustomer.creditLimit)],
                ["Status", viewingCustomer.status], ["WhatsApp", viewingCustomer.whatsapp ?? ""],
                ["Payment terms", viewingCustomer.paymentTerms ?? ""], ["Remarks", viewingCustomer.remarks ?? ""],
              ].map(([label, value]) => <div key={label}><dt style={{ fontWeight: 700 }}>{label}</dt><dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</dd></div>)}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
