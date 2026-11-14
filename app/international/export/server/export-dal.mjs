import "server-only";
import { randomUUID } from "node:crypto";

const DOCUMENT_FIELDS = {
  enquiry: { number: "enquiryNo", date: "enquiryDate" },
  quotation: { number: "quotationNo", date: "quotationDate" },
  proforma_invoice: { number: "proformaInvoiceNo", date: "proformaInvoiceDate" },
  order: { number: "exportOrderNo", date: "exportOrderDate" },
  purchase: { number: "purchaseNo", date: "purchaseDate" },
  reservation: { number: "reservationNo", date: "reservationDate" },
  packing: { number: "packingNo", date: "packingDate" },
  shipment: { number: "shipmentNo", date: "shipmentDate" },
  commercial_invoice: { number: "invoiceNo", date: "invoiceDate" },
};

const DOCUMENT_REFERENCES = {
  quotation: { enquiryNo: "enquiry" },
  proforma_invoice: { quotationNo: "quotation", enquiryNo: "enquiry" },
  order: { proformaInvoiceNo: "proforma_invoice", quotationNo: "quotation", enquiryNo: "enquiry" },
  reservation: { exportOrderNo: "order" },
  packing: { exportOrderNo: "order", reservationNo: "reservation" },
  shipment: { exportOrderNo: "order", reservationNo: "reservation", packingNo: "packing", commercialInvoiceNo: "commercial_invoice" },
  commercial_invoice: { orderNo: "order", proformaInvoiceNo: "proforma_invoice", quotationNo: "quotation", enquiryNo: "enquiry", shipmentNo: "shipment" },
};

export class ExportRequestError extends Error {
  constructor(code, message) { super(message); this.name = "ExportRequestError"; this.code = code; }
}
const fail = (code, message) => { throw new ExportRequestError(code, message); };

function validateRecord(kind, record, creating) {
  if (!DOCUMENT_FIELDS[kind]) fail("INVALID_EXPORT", "Export document type is invalid.");
  if (!record || typeof record !== "object" || Array.isArray(record)) fail("INVALID_EXPORT", "Export record must be an object.");
  if (typeof record.id !== "string" || !record.id.trim() || record.id.length > 200) fail("INVALID_EXPORT", "An existing record ID is required.");
  const fields = DOCUMENT_FIELDS[kind];
  if (typeof record[fields.number] !== "string" || !record[fields.number].trim() || record[fields.number].length > 200) fail("INVALID_EXPORT", "Document number is required.");
  if (typeof record[fields.date] !== "string" || record[fields.date].length > 80) fail("INVALID_EXPORT", "Document date must be text.");
  if (record.currency !== undefined && typeof record.currency !== "string") fail("INVALID_EXPORT", "Currency must be text.");
  if (record.status !== undefined && typeof record.status !== "string") fail("INVALID_EXPORT", "Status must be text.");
  if (creating && Object.hasOwn(record, "reviewStatus")) fail("INVALID_EXPORT", "Review state is assigned by the server.");
  return { ...record };
}

function mapDocument(row) {
  if (!row) return null;
  return { ...row.source_record, id: row.id, documentNumber: row.document_number,
    documentDate: row.document_date, currency: row.currency, status: row.status,
    reviewStatus: row.review_status, documentKind: row.document_kind };
}

export function createExportDAL({ getOwnerContext, database, idFactory = randomUUID }) {
  if (typeof getOwnerContext !== "function" || !database?.connect) throw new Error("Export DAL requires owner context and a PostgreSQL pool.");
  async function companyId() {
    const owner = await getOwnerContext();
    const id = owner?.company?.company_id;
    if (!id) fail("UNAUTHENTICATED", "Sign in is required.");
    return id;
  }
  async function transaction(work) {
    const client = await database.connect();
    try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
    finally { client.release(); }
  }
  async function linksFor(client, company, kind, id, record) {
    const refs = DOCUMENT_REFERENCES[kind] ?? {};
    for (const [field, targetKind] of Object.entries(refs)) {
      const number = record[field];
      if (number === undefined || number === null || number === "") continue;
      if (typeof number !== "string") fail("INVALID_EXPORT", `Reference ${field} must be text.`);
      const found = await client.query(
        "SELECT id FROM public.export_documents WHERE company_id=$1 AND document_kind=$2 AND document_number=$3 AND review_status='owner_verified'",
        [company, targetKind, number],
      );
      if (!found.rowCount) fail("EXPORT_REFERENCE_NOT_FOUND", `The referenced ${targetKind} document is not available in this company.`);
      await client.query(
        "INSERT INTO public.export_document_references(company_id,source_id,source_kind,target_id,target_kind,source_field) VALUES($1,$2,$3,$4,$5,$6)",
        [company, id, kind, found.rows[0].id, targetKind, field],
      );
    }
    if (typeof record.customerCode === "string" && record.customerCode) {
      const customer = await client.query("SELECT id FROM public.export_customers WHERE company_id=$1 AND code=$2 AND status='Active' AND review_status='owner_verified'", [company, record.customerCode]);
      if (!customer.rowCount) fail("EXPORT_REFERENCE_NOT_FOUND", "The referenced export customer is not available in this company.");
      await client.query("INSERT INTO public.export_customer_document_references(company_id,document_id,customer_id,customer_code,source_field) VALUES($1,$2,$3,$4,'customerCode')", [company, id, customer.rows[0].id, record.customerCode]);
    }
  }

  return {
    async listDocuments(kind, { q = "", reviewStatus = null, limit = 100, offset = 0 } = {}) {
      if (!DOCUMENT_FIELDS[kind] || typeof q !== "string" || q.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) fail("INVALID_QUERY", "Export query is invalid.");
      if (reviewStatus && !["review_required", "owner_verified"].includes(reviewStatus)) fail("INVALID_QUERY", "Review filter is invalid.");
      const company = await companyId();
      const search = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
      const { rows } = await database.query(
        "SELECT * FROM public.export_documents WHERE company_id=$1 AND document_kind=$2 AND ($3::text IS NULL OR document_number ILIKE $3 OR source_record::text ILIKE $3) AND ($4::text IS NULL OR review_status=$4) ORDER BY document_date DESC,document_number LIMIT $5 OFFSET $6",
        [company, kind, search, reviewStatus, limit, offset],
      );
      return rows.map(mapDocument);
    },
    async getDocument(kind, id) {
      if (!DOCUMENT_FIELDS[kind] || typeof id !== "string" || !id.trim() || id.length > 200) fail("INVALID_EXPORT_ID", "Export record ID is invalid.");
      const company = await companyId();
      const result = await database.query("SELECT * FROM public.export_documents WHERE company_id=$1 AND document_kind=$2 AND id=$3", [company, kind, id]);
      return mapDocument(result.rows[0]);
    },
    async createDocument(kind, input) {
      const record = validateRecord(kind, input, true);
      const fields = DOCUMENT_FIELDS[kind]; const company = await companyId();
      return transaction(async client => {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1 || ':export:' || $2,0))", [company, kind]);
        const id = record.id || idFactory();
        const result = await client.query(
          "INSERT INTO public.export_documents(id,company_id,document_kind,document_number,document_date,currency,status,review_status,source_record) VALUES($1,$2,$3,$4,$5,$6,$7,'owner_verified',$8::jsonb) RETURNING *",
          [id, company, kind, record[fields.number], record[fields.date], record.currency ?? "", record.status ?? "", JSON.stringify(record)],
        );
        await linksFor(client, company, kind, id, record);
        return mapDocument(result.rows[0]);
      });
    },
    async updateDocument(kind, id, input) {
      const record = validateRecord(kind, input, false); const fields = DOCUMENT_FIELDS[kind]; const company = await companyId();
      return transaction(async client => {
        const current = await client.query("SELECT * FROM public.export_documents WHERE company_id=$1 AND document_kind=$2 AND id=$3 FOR UPDATE", [company, kind, id]);
        if (!current.rowCount) return null;
        if (current.rows[0].review_status !== "owner_verified") fail("EXPORT_REVIEW_REQUIRED", "A record awaiting owner review cannot be edited as an operational document.");
        await client.query("DELETE FROM public.export_document_references WHERE company_id=$1 AND source_id=$2", [company, id]);
        await client.query("DELETE FROM public.export_customer_document_references WHERE company_id=$1 AND document_id=$2", [company, id]);
        const result = await client.query(
          "UPDATE public.export_documents SET document_number=$4,document_date=$5,currency=$6,status=$7,source_record=$8::jsonb,updated_at=now() WHERE company_id=$1 AND document_kind=$2 AND id=$3 RETURNING *",
          [company, kind, id, record[fields.number], record[fields.date], record.currency ?? "", record.status ?? "", JSON.stringify(record)],
        );
        await linksFor(client, company, kind, id, record);
        return mapDocument(result.rows[0]);
      });
    },
    async setDocumentReviewStatus(kind, id, reviewStatus) {
      if (!DOCUMENT_FIELDS[kind] || !["review_required", "owner_verified"].includes(reviewStatus)) fail("INVALID_EXPORT", "Review status is invalid.");
      const company = await companyId();
      return transaction(async client => {
        const result = await client.query("UPDATE public.export_documents SET review_status=$4,updated_at=now() WHERE company_id=$1 AND document_kind=$2 AND id=$3 RETURNING *", [company, kind, id, reviewStatus]);
        return mapDocument(result.rows[0]);
      });
    },
    async listCustomers({ q = "", limit = 100, offset = 0 } = {}) {
      if (typeof q !== "string" || q.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) fail("INVALID_QUERY", "Export customer query is invalid.");
      const company = await companyId(); const search = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
      const { rows } = await database.query("SELECT id,code,name,status,review_status,source_record FROM public.export_customers WHERE company_id=$1 AND ($2::text IS NULL OR code ILIKE $2 OR name ILIKE $2 OR source_record::text ILIKE $2) ORDER BY name,code LIMIT $3 OFFSET $4", [company, search, limit, offset]);
      return rows.map(row => ({ ...row.source_record, id: row.id, code: row.code, name: row.name, status: row.status, reviewStatus: row.review_status }));
    },
    async createCustomer(input) {
      if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.id !== "string" || !input.id.trim() || typeof input.code !== "string" || !input.code.trim() || typeof input.name !== "string" || !input.name.trim() || !["Active", "Inactive"].includes(input.status)) fail("INVALID_EXPORT", "Export customer ID, code, name and status are required.");
      if (Object.hasOwn(input, "reviewStatus")) fail("INVALID_EXPORT", "Review state is assigned by the server.");
      const company = await companyId();
      let rows;
      try {
        ({ rows } = await database.query("INSERT INTO public.export_customers(id,company_id,code,name,status,review_status,source_record) VALUES($1,$2,$3,$4,$5,'owner_verified',$6::jsonb) RETURNING id,code,name,status,review_status,source_record", [input.id, company, input.code, input.name, input.status, JSON.stringify(input)]));
      } catch (error) {
        if (error?.code === "23505") fail("EXPORT_CUSTOMER_CONFLICT", "An Export Customer with this ID or code already exists in this company.");
        throw error;
      }
      const row = rows[0]; return { ...row.source_record, id: row.id, code: row.code, name: row.name, status: row.status, reviewStatus: row.review_status };
    },
    async getCustomer(id) {
      if (typeof id !== "string" || !id.trim() || id.length > 200) fail("INVALID_EXPORT_ID", "Export customer ID is invalid.");
      const company = await companyId();
      const { rows } = await database.query("SELECT id,code,name,status,review_status,source_record FROM public.export_customers WHERE company_id=$1 AND id=$2", [company, id]);
      const row = rows[0]; return row ? { ...row.source_record, id: row.id, code: row.code, name: row.name, status: row.status, reviewStatus: row.review_status } : null;
    },
    async updateCustomer(id, input) {
      if (typeof id !== "string" || !id.trim() || !input || typeof input !== "object" || Array.isArray(input) || input.id !== id || typeof input.code !== "string" || !input.code.trim() || typeof input.name !== "string" || !input.name.trim() || !["Active", "Inactive"].includes(input.status)) fail("INVALID_EXPORT", "Export customer ID, code, name and status are required.");
      if (Object.hasOwn(input, "reviewStatus")) fail("INVALID_EXPORT", "Review state cannot be changed through customer edit.");
      const company = await companyId();
      let rows;
      try {
        ({ rows } = await database.query("UPDATE public.export_customers SET code=$3,name=$4,status=$5,source_record=$6::jsonb,updated_at=now() WHERE company_id=$1 AND id=$2 AND review_status='owner_verified' RETURNING id,code,name,status,review_status,source_record", [company, id, input.code, input.name, input.status, JSON.stringify(input)]));
      } catch (error) {
        if (error?.code === "23505") fail("EXPORT_CUSTOMER_CONFLICT", "An Export Customer with this code already exists in this company.");
        throw error;
      }
      const row = rows[0]; return row ? { ...row.source_record, id: row.id, code: row.code, name: row.name, status: row.status, reviewStatus: row.review_status } : null;
    },
    async listStock() {
      const company = await companyId();
      const { rows } = await database.query("SELECT * FROM public.export_stock WHERE company_id=$1 ORDER BY product_code,lot_batch_no,id", [company]);
      return rows.map(row => ({ ...row.source_record, id: row.id, productCode: row.product_code,
        lotBatchNo: row.lot_batch_no, availableQty: row.available_qty, reservedQty: row.reserved_qty,
        packedQty: row.packed_qty, loadedQty: row.loaded_qty, shippedQty: row.shipped_qty,
        unit: row.unit, stockSource: row.stock_source, purchaseReference: row.purchase_reference,
        reviewStatus: row.review_status }));
    },
  };
}
