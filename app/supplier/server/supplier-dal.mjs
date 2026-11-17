import "server-only";
import { randomUUID } from "node:crypto";

const SUPPLIER_COLUMNS = `
  id, company_id, code, name, contact_person, mobile, email, gst, pan,
  address, city, state, country, pin_code, opening_balance, credit_limit,
  status, source_record`;
const STRING_FIELDS = [
  "name", "contactPerson", "mobile", "email", "gst", "pan", "address",
  "city", "state", "country", "pinCode", "status",
];
const AMOUNT_FIELDS = ["openingBalance", "creditLimit"];
const ALLOWED_FIELDS = new Set([...STRING_FIELDS, ...AMOUNT_FIELDS]);
const COLUMN_BY_FIELD = {
  contactPerson: "contact_person", pinCode: "pin_code",
  openingBalance: "opening_balance", creditLimit: "credit_limit",
};

export class SupplierRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SupplierRequestError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SupplierRequestError(code, message);
}

function sourceValue(row, field) {
  const source = row.source_record && typeof row.source_record === "object" ? row.source_record : {};
  return source[field];
}

function mapSupplier(row) {
  if (!row) return null;
  const mapped = {
    id: row.id,
    code: row.code,
    name: row.name,
  };
  for (const field of STRING_FIELDS.filter((item) => item !== "name")) {
    const column = COLUMN_BY_FIELD[field] ?? field;
    const value = row[column] ?? sourceValue(row, field);
    mapped[field] = value == null ? "" : value;
  }
  for (const field of AMOUNT_FIELDS) {
    const column = COLUMN_BY_FIELD[field];
    const value = row[column] ?? sourceValue(row, field);
    mapped[field] = value == null ? 0 : Number(value);
  }
  if (!Number.isFinite(mapped.openingBalance) || !Number.isFinite(mapped.creditLimit)) {
    throw new Error("Supplier record contains an invalid balance value.");
  }
  if (!['Active', 'Inactive'].includes(mapped.status)) {
    throw new Error("Supplier record has no recognized status; review its source data before using this record.");
  }
  return mapped;
}

function validateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("INVALID_SUPPLIER", "Supplier data must be an object.");
  }
  if (Object.keys(input).some((field) => !ALLOWED_FIELDS.has(field))) {
    fail("INVALID_SUPPLIER", "Supplier data contains an unsupported field.");
  }
  for (const field of STRING_FIELDS) {
    if (typeof input[field] !== "string") fail("INVALID_SUPPLIER", `Supplier ${field} must be text.`);
  }
  if (!input.name.trim()) fail("INVALID_SUPPLIER", "Supplier name is required.");
  if (!['Active', 'Inactive'].includes(input.status)) fail("INVALID_SUPPLIER", "Supplier status is invalid.");
  for (const field of AMOUNT_FIELDS) {
    if (typeof input[field] !== "number" || !Number.isFinite(input[field]) || input[field] < 0) {
      fail("INVALID_SUPPLIER", `Supplier ${field} must be a finite non-negative number.`);
    }
  }
  if (input.mobile.length > 50 || input.email.length > 254 || input.gst.length > 32 || input.pan.length > 32) {
    fail("INVALID_SUPPLIER", "Supplier contact or tax field exceeds its supported length.");
  }
  return input;
}

function toSourceRecord(input, id, code) {
  return JSON.stringify({ id, code, ...input });
}

function validateId(id) {
  if (typeof id !== "string" || !id.trim() || id.length > 200) {
    fail("INVALID_SUPPLIER_ID", "Supplier ID is invalid.");
  }
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function withTransaction(database, operation) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error?.code === "23505") fail("SUPPLIER_CODE_CONFLICT", "A supplier with this ID or code already exists.");
    throw error;
  } finally {
    client.release();
  }
}

export function createSupplierDAL({ getOwnerContext, database, idFactory = randomUUID }) {
  if (typeof getOwnerContext !== "function" || typeof database?.connect !== "function" || typeof database?.query !== "function") {
    throw new Error("Supplier DAL requires server authorization and a PostgreSQL pool.");
  }

  async function ownerCompanyId() {
    const owner = await getOwnerContext();
    const companyId = owner?.company?.company_id;
    if (!companyId) fail("UNAUTHENTICATED", "Sign in is required.");
    return companyId;
  }

  async function nextCode(databaseOrClient, companyId) {
    const result = await databaseOrClient.query(
      `SELECT 'SUP' || lpad((coalesce(max((regexp_match(code, '^SUP([0-9]+)$'))[1]::bigint), 0) + 1)::text, 4, '0') AS next_code
       FROM public.suppliers WHERE company_id = $1`,
      [companyId],
    );
    return result.rows[0].next_code;
  }

  async function duplicateWarnings(databaseOrClient, companyId, input, excludeId = null) {
    const result = await databaseOrClient.query(
      `SELECT
         count(*) FILTER (WHERE nullif(btrim($2), '') IS NOT NULL AND regexp_replace(coalesce(mobile, source_record->>'mobile', ''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g'))::int AS mobile_matches,
         count(*) FILTER (WHERE nullif(btrim($3), '') IS NOT NULL AND lower(btrim(coalesce(email, source_record->>'email', ''))) = lower(btrim($3)))::int AS email_matches,
         count(*) FILTER (WHERE nullif(btrim($4), '') IS NOT NULL AND upper(btrim(coalesce(gst, source_record->>'gst', ''))) = upper(btrim($4)))::int AS gst_matches
       FROM public.suppliers
       WHERE company_id = $1 AND ($5::text IS NULL OR id <> $5)` ,
      [companyId, input.mobile ?? "", input.email ?? "", input.gst ?? "", excludeId],
    );
    const row = result.rows[0];
    return [
      ...(Number(row.mobile_matches) > 0 ? ["mobile"] : []),
      ...(Number(row.email_matches) > 0 ? ["email"] : []),
      ...(Number(row.gst_matches) > 0 ? ["gst"] : []),
    ];
  }

  return {
    async listSuppliers({ q = "", status = null, limit = 200, offset = 0 } = {}) {
      const companyId = await ownerCompanyId();
      if (typeof q !== "string" || q.length > 100) fail("INVALID_QUERY", "Search text is invalid.");
      if (status !== null && !["Active", "Inactive"].includes(status)) fail("INVALID_QUERY", "Supplier status filter is invalid.");
      if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) {
        fail("INVALID_QUERY", "Supplier pagination is invalid.");
      }
      const search = q ? `%${escapeLike(q)}%` : null;
      const result = await database.query(
        `SELECT ${SUPPLIER_COLUMNS}
         FROM public.suppliers
         WHERE company_id = $1
           AND ($2::text IS NULL OR coalesce(status, source_record->>'status') = $2)
           AND ($3::text IS NULL OR name ILIKE $3 ESCAPE E'\\\\'
             OR code ILIKE $3 ESCAPE E'\\\\'
             OR coalesce(contact_person, source_record->>'contactPerson', '') ILIKE $3 ESCAPE E'\\\\'
             OR coalesce(mobile, source_record->>'mobile', '') ILIKE $3 ESCAPE E'\\\\'
             OR coalesce(email, source_record->>'email', '') ILIKE $3 ESCAPE E'\\\\'
             OR coalesce(city, source_record->>'city', '') ILIKE $3 ESCAPE E'\\\\'
             OR coalesce(gst, source_record->>'gst', '') ILIKE $3 ESCAPE E'\\\\')
         ORDER BY NULLIF(to_jsonb(suppliers)->>'created_at', '')::timestamptz DESC NULLS LAST, code DESC, id DESC LIMIT $4 OFFSET $5`,
        [companyId, status, search, limit, offset],
      );
      return { suppliers: result.rows.map(mapSupplier), nextCode: await nextCode(database, companyId) };
    },

    async getSupplier(id) {
      validateId(id);
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `SELECT ${SUPPLIER_COLUMNS} FROM public.suppliers WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [companyId, id],
      );
      return mapSupplier(result.rows[0]);
    },

    async checkDuplicateWarnings(input, excludeId = null) {
      if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_SUPPLIER", "Supplier data must be an object.");
      for (const field of ["mobile", "email", "gst"]) {
        if (input[field] !== undefined && input[field] !== null && typeof input[field] !== "string") {
          fail("INVALID_SUPPLIER", `Supplier ${field} must be text.`);
        }
      }
      if (excludeId !== null) validateId(excludeId);
      return duplicateWarnings(database, await ownerCompanyId(), input, excludeId);
    },

    async createSupplier(input) {
      const supplier = validateInput(input);
      const companyId = await ownerCompanyId();
      return withTransaction(database, async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended('suppliers:' || $1::text, 0))", [companyId]);
        const id = idFactory();
        const code = await nextCode(client, companyId);
        const columns = ["contact_person", "mobile", "email", "gst", "pan", "address", "city", "state", "country", "pin_code", "opening_balance", "credit_limit", "status"];
        const values = [
          supplier.contactPerson, supplier.mobile, supplier.email, supplier.gst, supplier.pan,
          supplier.address, supplier.city, supplier.state, supplier.country, supplier.pinCode,
          String(supplier.openingBalance), String(supplier.creditLimit), supplier.status,
        ];
        const names = ["id", "company_id", "code", "name", ...columns, "source_record"];
        const params = [id, companyId, code, supplier.name, ...values, toSourceRecord(supplier, id, code)];
        const placeholders = params.map((_, index) => `$${index + 1}${index === params.length - 1 ? "::jsonb" : ""}`);
        const result = await client.query(
          `INSERT INTO public.suppliers (${names.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING ${SUPPLIER_COLUMNS}`,
          params,
        );
        return mapSupplier(result.rows[0]);
      });
    },

    async updateSupplier(id, input) {
      validateId(id);
      const supplier = validateInput(input);
      const companyId = await ownerCompanyId();
      return withTransaction(database, async (client) => {
        const exists = await client.query("SELECT id FROM public.suppliers WHERE company_id = $1 AND id = $2 FOR UPDATE", [companyId, id]);
        if (!exists.rowCount) return null;
        const result = await client.query(
          `UPDATE public.suppliers SET
             name=$3, contact_person=$4, mobile=$5, email=$6, gst=$7, pan=$8,
             address=$9, city=$10, state=$11, country=$12, pin_code=$13,
             opening_balance=$14, credit_limit=$15, status=$16,
             source_record=coalesce(source_record, '{}'::jsonb) || $17::jsonb
           WHERE company_id=$1 AND id=$2 RETURNING ${SUPPLIER_COLUMNS}`,
          [
            companyId, id, supplier.name, supplier.contactPerson, supplier.mobile, supplier.email,
            supplier.gst, supplier.pan, supplier.address, supplier.city, supplier.state, supplier.country,
            supplier.pinCode, String(supplier.openingBalance), String(supplier.creditLimit), supplier.status,
            toSourceRecord(supplier, id, undefined),
          ],
        );
        return mapSupplier(result.rows[0]);
      });
    },

    async setSupplierStatus(id, status) {
      validateId(id);
      if (!["Active", "Inactive"].includes(status)) fail("INVALID_SUPPLIER", "Supplier status is invalid.");
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `UPDATE public.suppliers SET status=$3, source_record=coalesce(source_record, '{}'::jsonb) || jsonb_build_object('status', $3::text)
         WHERE company_id=$1 AND id=$2 RETURNING ${SUPPLIER_COLUMNS}`,
        [companyId, id, status],
      );
      return mapSupplier(result.rows[0]);
    },
  };
}
