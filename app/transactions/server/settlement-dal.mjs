import "server-only";
import { randomUUID } from "node:crypto";

const ERR = (code, message) => Object.assign(new Error(message), { code });
const METHODS = new Set(["Cash", "UPI", "Bank"]);
const DECIMAL = /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
function toCents(value) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(`${whole}${fraction.padEnd(2, "0")}`);
}

export function validateSettlementInput(kind, input) {
  const customer = kind === "receipt";
  if (!customer && kind !== "supplierPayment") throw ERR("INVALID_SETTLEMENT", "Settlement type is invalid.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw ERR("INVALID_SETTLEMENT", "Settlement data must be an object.");
  const partnerField = customer ? "customerCode" : "supplierCode";
  const dateField = customer ? "receivedOn" : "paidOn";
  const invoiceIdField = customer ? "salesId" : "purchaseId";
  const allowed = new Set(["requestKey", partnerField, dateField, "paymentMode", "amount", "referenceNo", "notes", "allocations"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw ERR("INVALID_SETTLEMENT", "Settlement data contains unsupported fields.");
  if (typeof input.requestKey !== "string" || !/^[A-Za-z0-9_-]{16,100}$/.test(input.requestKey)) throw ERR("INVALID_SETTLEMENT", "A stable settlement request key is required.");
  if (typeof input[partnerField] !== "string" || !input[partnerField].trim() || input[partnerField].length > 100) {
    throw ERR("INVALID_SETTLEMENT", "A valid customer or supplier is required.");
  }
  const parsedDate = typeof input[dateField] === "string" && DATE.test(input[dateField]) ? new Date(`${input[dateField]}T00:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input[dateField]) {
    throw ERR("INVALID_SETTLEMENT", "Payment date must use YYYY-MM-DD.");
  }
  if (!METHODS.has(input.paymentMode)) throw ERR("INVALID_SETTLEMENT", "Payment mode must be Cash, UPI, or Bank.");
  if (typeof input.amount !== "string" || !DECIMAL.test(input.amount) || toCents(input.amount) <= 0n) {
    throw ERR("INVALID_SETTLEMENT", "Amount must be a positive value with at most two decimal places.");
  }
  if (input.referenceNo !== undefined && (typeof input.referenceNo !== "string" || input.referenceNo.length > 120)) {
    throw ERR("INVALID_SETTLEMENT", "Reference number is invalid.");
  }
  if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 2000)) throw ERR("INVALID_SETTLEMENT", "Notes are invalid.");
  if (!Array.isArray(input.allocations) || input.allocations.length < 1 || input.allocations.length > 100) {
    throw ERR("INVALID_SETTLEMENT", "At least one invoice allocation is required.");
  }
  const ids = new Set();
  let allocationCents = 0n;
  for (const allocation of input.allocations) {
    if (!allocation || typeof allocation !== "object" || Array.isArray(allocation) || Object.keys(allocation).some((key) => ![invoiceIdField, "amount"].includes(key)) || typeof allocation[invoiceIdField] !== "string" || !allocation[invoiceIdField].trim() || allocation[invoiceIdField].length > 200 || ids.has(allocation[invoiceIdField])) {
      throw ERR("INVALID_SETTLEMENT", "Invoice allocations must have unique valid invoice IDs.");
    }
    ids.add(allocation[invoiceIdField]);
    if (typeof allocation.amount !== "string" || !DECIMAL.test(allocation.amount)) throw ERR("INVALID_SETTLEMENT", "Allocation amounts must be positive values with at most two decimal places.");
    const cents = toCents(allocation.amount);
    if (cents <= 0n) throw ERR("INVALID_SETTLEMENT", "Allocation amounts must be positive.");
    allocationCents += cents;
  }
  const amountCents = toCents(input.amount);
  if (allocationCents > amountCents) throw ERR("INVALID_SETTLEMENT", "Allocations cannot exceed the payment amount.");
  return input;
}

function mapPayment(row, allocations = []) {
  return {
    id: row.id,
    number: row.receipt_no ?? row.payment_no,
    date: String(row.received_on ?? row.paid_on).slice(0, 10),
    partnerCode: row.customer_code ?? row.supplier_code,
    paymentMode: row.payment_mode,
    referenceNo: row.reference_no,
    amount: row.amount,
    notes: row.notes,
    createdAt: row.created_at,
    voidedAt: row.voided_at,
    allocations: allocations.map((item) => ({ invoiceId: item.invoice_id, invoiceNo: item.invoice_no, amount: item.amount })),
  };
}

export function createSettlementDAL({ getOwnerContext, database, idFactory = randomUUID, clock = () => new Date() }) {
  if (typeof getOwnerContext !== "function" || !database?.connect || !database?.query) throw new Error("Settlement DAL requires owner authorization and a PostgreSQL pool.");
  async function companyId() {
    const owner = await getOwnerContext();
    if (!owner?.company?.company_id) throw ERR("UNAUTHENTICATED", "Sign in is required.");
    return owner.company.company_id;
  }
  async function transaction(fn) {
    const client = await database.connect();
    try { await client.query("BEGIN"); const value = await fn(client); await client.query("COMMIT"); return value; }
    catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error?.code === "23505") throw ERR("DUPLICATE_SETTLEMENT", "A settlement number or invoice allocation already exists.");
      if (error?.code === "23503") throw ERR("REFERENCE_NOT_FOUND", "The selected invoice or party is unavailable in this company.");
      if (error?.code === "23514" || error?.code === "P0001") throw ERR("SETTLEMENT_CONFLICT", "The settlement could not be allocated. Check company, invoice status and available invoice balance.");
      throw error;
    }
    finally { client.release(); }
  }
  function spec(kind) {
    if (kind === "receipt") return { table: "customer_receipts", allocations: "customer_receipt_allocations", parent: "receipt_id", invoice: "sales", invoiceId: "sales_id", invoiceNumber: "invoice_no", partner: "customer_code", date: "received_on", invoiceDate: "sales_date", number: "receipt_no", prefix: "RCT", total: "grand_total" };
    if (kind === "supplierPayment") return { table: "supplier_payments", allocations: "supplier_payment_allocations", parent: "payment_id", invoice: "purchases", invoiceId: "purchase_id", invoiceNumber: "invoice_no", partner: "supplier_code", date: "paid_on", invoiceDate: "purchase_date", number: "payment_no", prefix: "SPY", total: "total_net_amount" };
    throw ERR("INVALID_SETTLEMENT", "Settlement type is invalid.");
  }
  async function allocationsFor(client, s, company, id) {
    const { rows } = await client.query(`SELECT a.${s.invoiceId} AS invoice_id,i.${s.invoiceNumber} AS invoice_no,a.amount::text AS amount FROM public.${s.allocations} a JOIN public.${s.invoice} i ON i.company_id=a.company_id AND i.id=a.${s.invoiceId} WHERE a.company_id=$1 AND a.${s.parent}=$2 ORDER BY i.${s.invoiceNumber}`, [company, id]);
    return rows;
  }
  async function list(kind, { q = "", limit = 200, offset = 0 } = {}) {
    const s = spec(kind);
    if (typeof q !== "string" || q.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) throw ERR("INVALID_QUERY", "Settlement query is invalid.");
    const company = await companyId();
    const search = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
    const { rows } = await database.query(`SELECT * FROM public.${s.table} WHERE company_id=$1 AND ($2::text IS NULL OR ${s.number} ILIKE $2 OR ${s.partner} ILIKE $2 OR reference_no ILIKE $2) ORDER BY created_at DESC,${s.date} DESC,${s.number} DESC LIMIT $3 OFFSET $4`, [company, search, limit, offset]);
    return Promise.all(rows.map(async (row) => mapPayment(row, await allocationsFor(database, s, company, row.id))));
  }
  async function create(kind, input) {
    const s = spec(kind), customer = kind === "receipt", partnerKey = customer ? "customerCode" : "supplierCode", dateKey = customer ? "receivedOn" : "paidOn", inputInvoiceKey = customer ? "salesId" : "purchaseId";
    validateSettlementInput(kind, input);
    const company = await companyId(), id = idFactory();
    return transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2,0))", [s.table, company]);
      const partnerTable = customer ? "customers" : "suppliers";
      const partner = await client.query(`SELECT code,status FROM public.${partnerTable} WHERE company_id=$1 AND code=$2`, [company, input[partnerKey]]);
      if (!partner.rowCount || partner.rows[0].status === "Inactive") throw ERR("REFERENCE_NOT_FOUND", "The selected customer or supplier is unavailable in this company.");
      const numberResult = await client.query(`SELECT coalesce(max((regexp_match(${s.number},$2))[1]::bigint),0)+1 AS n FROM public.${s.table} WHERE company_id=$1`, [company, `^${s.prefix}-(\\d+)$`]);
      const number = `${s.prefix}-${String(numberResult.rows[0].n).padStart(4, "0")}`;
      const { rows } = await client.query(`INSERT INTO public.${s.table}(id,company_id,request_key,${s.number},${s.date},${s.partner},payment_mode,reference_no,amount,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [id, company, input.requestKey, number, input[dateKey], input[partnerKey], input.paymentMode, input.referenceNo ?? "", input.amount, input.notes ?? ""]);
      const sorted = [...input.allocations].sort((a, b) => a[inputInvoiceKey].localeCompare(b[inputInvoiceKey]));
      for (const allocation of sorted) {
        await client.query(`INSERT INTO public.${s.allocations}(id,company_id,${s.parent},${s.invoiceId},amount) VALUES($1,$2,$3,$4,$5)`, [idFactory(), company, id, allocation[inputInvoiceKey], allocation.amount]);
      }
      return mapPayment(rows[0], await allocationsFor(client, s, company, id));
    });
  }
  async function get(kind, id) {
    const s = spec(kind), company = await companyId();
    if (typeof id !== "string" || !id.trim() || id.length > 200) throw ERR("INVALID_SETTLEMENT", "Settlement ID is invalid.");
    const { rows } = await database.query(`SELECT * FROM public.${s.table} WHERE company_id=$1 AND id=$2`, [company, id]);
    return rows[0] ? mapPayment(rows[0], await allocationsFor(database, s, company, id)) : null;
  }
  async function voidPayment(kind, id) {
    const s = spec(kind), company = await companyId();
    return transaction(async (client) => {
      const { rows } = await client.query(`UPDATE public.${s.table} SET voided_at=$3 WHERE company_id=$1 AND id=$2 AND voided_at IS NULL RETURNING *`, [company, id, clock()]);
      return rows[0] ? mapPayment(rows[0], await allocationsFor(client, s, company, id)) : null;
    });
  }
  async function outstanding(kind, { limit = 200, offset = 0 } = {}) {
    const s = spec(kind), company = await companyId();
    if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) throw ERR("INVALID_QUERY", "Outstanding query is invalid.");
    const settlementTable = kind === "receipt" ? "customer_receipt_allocations" : "supplier_payment_allocations";
    const parentTable = kind === "receipt" ? "customer_receipts" : "supplier_payments";
    const { rows } = await database.query(`SELECT i.id,i.${s.invoiceNumber} AS invoice_no,i.${s.invoiceDate} AS invoice_date,i.${s.partner} AS partner_code,i.${s.total}::text AS invoice_total,(i.${s.total}-coalesce(sum(a.amount) FILTER (WHERE p.voided_at IS NULL),0))::text AS outstanding FROM public.${s.invoice} i LEFT JOIN public.${settlementTable} a ON a.company_id=i.company_id AND a.${s.invoiceId}=i.id LEFT JOIN public.${parentTable} p ON p.company_id=a.company_id AND p.id=a.${s.parent} WHERE i.company_id=$1 AND i.deleted_at IS NULL AND NOT i.historical_imported ${kind === "receipt" ? "AND i.status <> 'Cancelled'" : ""} GROUP BY i.id HAVING i.${s.total}-coalesce(sum(a.amount) FILTER (WHERE p.voided_at IS NULL),0)>0 ORDER BY i.${s.invoiceDate},i.${s.invoiceNumber} LIMIT $2 OFFSET $3`, [company, limit, offset]);
    return rows;
  }
  return { list, create, get, voidPayment, outstanding };
}
