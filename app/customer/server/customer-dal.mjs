import "server-only";
import { randomUUID } from "node:crypto";

const CUSTOMER_COLUMNS = `
  id, company_id, code, name, contact_person, mobile, email, gst, pan,
  address, city, state, country, pin_code, opening_balance, credit_limit,
  status, whatsapp, payment_terms, remarks`;

const STRING_FIELDS = [
  "name", "contactPerson", "mobile", "email", "gst", "pan", "address",
  "city", "state", "country", "pinCode", "status",
];
const OPTIONAL_STRING_FIELDS = ["whatsapp", "paymentTerms", "remarks"];
const ALLOWED_INPUT_FIELDS = new Set([...STRING_FIELDS, ...OPTIONAL_STRING_FIELDS, "openingBalance", "creditLimit"]);

export class CustomerRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CustomerRequestError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new CustomerRequestError(code, message);
}

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person,
    mobile: row.mobile,
    email: row.email,
    gst: row.gst,
    pan: row.pan,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    pinCode: row.pin_code,
    openingBalance: Number(row.opening_balance),
    creditLimit: Number(row.credit_limit),
    status: row.status,
    ...(row.whatsapp == null ? {} : { whatsapp: row.whatsapp }),
    ...(row.payment_terms == null ? {} : { paymentTerms: row.payment_terms }),
    ...(row.remarks == null ? {} : { remarks: row.remarks }),
  };
}

function validateInput(input, { creating }) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("INVALID_CUSTOMER", "Customer data must be an object.");
  }
  if (Object.keys(input).some((field) => !ALLOWED_INPUT_FIELDS.has(field))) {
    fail("INVALID_CUSTOMER", "Customer data contains an unsupported field.");
  }
  for (const field of STRING_FIELDS) {
    if (typeof input[field] !== "string") fail("INVALID_CUSTOMER", `Customer ${field} must be text.`);
  }
  for (const field of OPTIONAL_STRING_FIELDS) {
    if (input[field] !== undefined && input[field] !== null && typeof input[field] !== "string") {
      fail("INVALID_CUSTOMER", `Customer ${field} must be text.`);
    }
  }
  if (!input.name.trim()) fail("INVALID_CUSTOMER", "Customer name is required.");
  if (!["Active", "Inactive"].includes(input.status)) fail("INVALID_CUSTOMER", "Customer status is invalid.");
  for (const field of ["openingBalance", "creditLimit"]) {
    if (typeof input[field] !== "number" || !Number.isFinite(input[field])) {
      fail("INVALID_CUSTOMER", `Customer ${field} must be a finite number.`);
    }
    if (creating && input[field] < 0) fail("INVALID_CUSTOMER", `Customer ${field} cannot be negative.`);
  }
  if (creating && input.mobile !== "" && !/^\d{10}$/.test(input.mobile)) {
    fail("INVALID_CUSTOMER", "Mobile number must contain 10 digits when provided.");
  }
  return input;
}

function toSourceRecord(customer, id, code) {
  const record = { id, code };
  for (const field of [...STRING_FIELDS, ...OPTIONAL_STRING_FIELDS, "openingBalance", "creditLimit"]) {
    if (Object.hasOwn(customer, field) && customer[field] !== undefined && customer[field] !== null) {
      record[field] = customer[field];
    }
  }
  return JSON.stringify(record);
}

function validateId(id) {
  if (typeof id !== "string" || !id.trim() || id.length > 200) {
    fail("INVALID_CUSTOMER_ID", "Customer ID is invalid.");
  }
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
    if (error?.code === "23505") fail("CUSTOMER_CODE_CONFLICT", "A customer with this ID or code already exists.");
    throw error;
  } finally {
    client.release();
  }
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function createCustomerDAL({ getOwnerContext, database, idFactory = randomUUID }) {
  if (typeof getOwnerContext !== "function" || typeof database?.connect !== "function" || typeof database?.query !== "function") {
    throw new Error("Customer DAL requires server authorization and a PostgreSQL pool.");
  }

  async function ownerCompanyId() {
    const owner = await getOwnerContext();
    const companyId = owner?.company?.company_id;
    if (!companyId) fail("UNAUTHENTICATED", "Sign in is required.");
    return companyId;
  }

  async function nextCode(databaseOrClient, companyId) {
    const result = await databaseOrClient.query(
      `SELECT 'C' || lpad((coalesce(max((regexp_match(code, '^C([0-9]+)$'))[1]::bigint), 0) + 1)::text, 4, '0') AS next_code
       FROM public.customers WHERE company_id = $1`,
      [companyId],
    );
    return result.rows[0].next_code;
  }

  async function duplicateWarnings(databaseOrClient, companyId, input, excludeId = null) {
    const result = await databaseOrClient.query(
      `SELECT
         count(*) FILTER (WHERE nullif(btrim($2), '') IS NOT NULL AND regexp_replace(mobile, '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g'))::int AS mobile_matches,
         count(*) FILTER (WHERE nullif(btrim($3), '') IS NOT NULL AND lower(btrim(email)) = lower(btrim($3)))::int AS email_matches,
         count(*) FILTER (WHERE nullif(btrim($4), '') IS NOT NULL AND upper(btrim(gst)) = upper(btrim($4)))::int AS gst_matches
       FROM public.customers
       WHERE company_id = $1 AND ($5::text IS NULL OR id <> $5)`,
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
    async countCustomers() {
      const companyId = await ownerCompanyId();
      const result = await database.query(
        "SELECT count(*)::int AS count FROM public.customers WHERE company_id = $1",
        [companyId],
      );
      return Number(result.rows[0].count);
    },

    async listCustomers({ q = "", status = null, limit = 200, offset = 0 } = {}) {
      const companyId = await ownerCompanyId();
      if (typeof q !== "string" || q.length > 100) fail("INVALID_QUERY", "Search text is invalid.");
      if (status !== null && !["Active", "Inactive"].includes(status)) fail("INVALID_QUERY", "Customer status filter is invalid.");
      if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) {
        fail("INVALID_QUERY", "Customer pagination is invalid.");
      }
      const search = q ? `%${escapeLike(q)}%` : null;
      const result = await database.query(
        `SELECT ${CUSTOMER_COLUMNS}
         FROM public.customers
         WHERE company_id = $1
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR name ILIKE $3 ESCAPE E'\\\\'
             OR code ILIKE $3 ESCAPE E'\\\\'
             OR contact_person ILIKE $3 ESCAPE E'\\\\'
             OR mobile ILIKE $3 ESCAPE E'\\\\'
             OR email ILIKE $3 ESCAPE E'\\\\'
             OR city ILIKE $3 ESCAPE E'\\\\'
             OR gst ILIKE $3 ESCAPE E'\\\\'
             OR pan ILIKE $3 ESCAPE E'\\\\')
         ORDER BY NULLIF(to_jsonb(customers)->>'created_at', '')::timestamptz DESC NULLS LAST, code DESC, id DESC LIMIT $4 OFFSET $5`,
        [companyId, status, search, limit, offset],
      );
      const previewCode = await nextCode(database, companyId);
      return { customers: result.rows.map(mapCustomer), nextCode: previewCode };
    },

    async getCustomer(id) {
      validateId(id);
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `SELECT ${CUSTOMER_COLUMNS} FROM public.customers WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [companyId, id],
      );
      return mapCustomer(result.rows[0]);
    },

    async checkDuplicateWarnings(input, excludeId = null) {
      if (!input || typeof input !== "object" || Array.isArray(input)) fail("INVALID_CUSTOMER", "Customer data must be an object.");
      for (const field of ["mobile", "email", "gst"]) {
        if (input[field] !== undefined && input[field] !== null && typeof input[field] !== "string") {
          fail("INVALID_CUSTOMER", `Customer ${field} must be text.`);
        }
      }
      if (excludeId !== null) validateId(excludeId);
      const companyId = await ownerCompanyId();
      return duplicateWarnings(database, companyId, input, excludeId);
    },

    async createCustomer(input) {
      const customer = validateInput(input, { creating: true });
      const companyId = await ownerCompanyId();
      return withTransaction(database, async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended('customers:' || $1::text, 0))", [companyId]);
        const id = idFactory();
        const code = await nextCode(client, companyId);
        const result = await client.query(
          `INSERT INTO public.customers (
             id, company_id, code, name, contact_person, mobile, email, gst, pan,
             address, city, state, country, pin_code, opening_balance, credit_limit,
             status, whatsapp, payment_terms, remarks, source_record
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb
           ) RETURNING ${CUSTOMER_COLUMNS}`,
          [
            id, companyId, code, customer.name, customer.contactPerson, customer.mobile,
            customer.email, customer.gst, customer.pan, customer.address, customer.city,
            customer.state, customer.country, customer.pinCode, String(customer.openingBalance),
            String(customer.creditLimit), customer.status, customer.whatsapp ?? null,
            customer.paymentTerms ?? null, customer.remarks ?? null, toSourceRecord(customer, id, code),
          ],
        );
        return mapCustomer(result.rows[0]);
      });
    },

    async updateCustomer(id, input) {
      validateId(id);
      const customer = validateInput(input, { creating: false });
      const companyId = await ownerCompanyId();
      return withTransaction(database, async (client) => {
        const current = await client.query(
          `SELECT mobile, opening_balance, credit_limit FROM public.customers WHERE company_id = $1 AND id = $2 FOR UPDATE`,
          [companyId, id],
        );
        if (!current.rowCount) return null;
        if (customer.mobile !== current.rows[0].mobile && customer.mobile !== "" && !/^\d{10}$/.test(customer.mobile)) {
          fail("INVALID_CUSTOMER", "Changed mobile number must contain 10 digits when provided.");
        }
        for (const field of ["openingBalance", "creditLimit"]) {
          const column = field === "openingBalance" ? "opening_balance" : "credit_limit";
          if (customer[field] < 0 && Number(current.rows[0][column]) !== customer[field]) {
            fail("INVALID_CUSTOMER", `Changed ${field} cannot be negative.`);
          }
        }
        const result = await client.query(
          `UPDATE public.customers SET
             name = $3, contact_person = $4, mobile = $5, email = $6, gst = $7, pan = $8,
             address = $9, city = $10, state = $11, country = $12, pin_code = $13,
             opening_balance = $14, credit_limit = $15, status = $16, whatsapp = $17,
             payment_terms = $18, remarks = $19
           WHERE company_id = $1 AND id = $2 RETURNING ${CUSTOMER_COLUMNS}`,
          [
            companyId, id, customer.name, customer.contactPerson, customer.mobile, customer.email,
            customer.gst, customer.pan, customer.address, customer.city, customer.state,
            customer.country, customer.pinCode, String(customer.openingBalance), String(customer.creditLimit),
            customer.status, customer.whatsapp ?? null, customer.paymentTerms ?? null, customer.remarks ?? null,
          ],
        );
        return mapCustomer(result.rows[0]);
      });
    },

    async deactivateCustomer(id) {
      validateId(id);
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `UPDATE public.customers SET status = 'Inactive' WHERE company_id = $1 AND id = $2 RETURNING ${CUSTOMER_COLUMNS}`,
        [companyId, id],
      );
      return mapCustomer(result.rows[0]);
    },

    async reactivateCustomer(id) {
      validateId(id);
      const companyId = await ownerCompanyId();
      const result = await database.query(
        `UPDATE public.customers SET status = 'Active' WHERE company_id = $1 AND id = $2 RETURNING ${CUSTOMER_COLUMNS}`,
        [companyId, id],
      );
      return mapCustomer(result.rows[0]);
    },
  };
}
