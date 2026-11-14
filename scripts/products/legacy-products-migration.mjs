import dotenv from "dotenv";
import pg from "pg";
import { parseLocalPostgresUrl, verifyLocalPostgresConnection } from "../../app/lib/db/postgres-target.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", override: false, quiet: true });

export const EXPECTED_SHA256 = "AF869D25E81F92207818A2882A46F8A57E298A52907DC68752B9D1FF53BF3FF7";
export const EXPECTED_COMPANY = "UK EXIM ENTERPRISES";
export const EXPECTED_DATABASE = "uk_exim_erp_dev";
export const EXPECTED_CODES = Object.freeze(["P0001", "P0002", "P0003", "P0004", "P0005", "P0006", "P0007"]);
export const SOURCE_FILE = "C:\\Users\\ADMIN\\Documents\\uk-exim-products-backup-2026-11-12.json";

export const PRODUCT_COLUMNS = Object.freeze([
  ["id", "id", "text"],
  ["company_id", null, "uuid"],
  ["code", "code", "text"],
  ["name", "name", "text"],
  ["category", "category", "text"],
  ["hsn", "hsn", "text"],
  ["gst", "gst", "text"],
  ["unit", "unit", "text"],
  ["net_weight", "netWeight", "numeric"],
  ["stock_base_code", "stockBaseCode", "text"],
  ["purchase", "purchase", "numeric"],
  ["sale", "sale", "numeric"],
  ["mrp", "mrp", "numeric"],
  ["base_cost", "baseCost", "numeric"],
  ["packing_cost", "packingCost", "numeric"],
  ["other_charges", "otherCharges", "numeric"],
  ["total_cost", "totalCost", "numeric"],
  ["stock", "stock", "numeric"],
  ["minimum_stock", "minimumStock", "numeric"],
  ["active", "active", "boolean"],
]);

const EXPECTED_FIELDS = new Set(PRODUCT_COLUMNS.map(([, field]) => field).filter(Boolean));
const NUMERIC_FIELDS = new Set(PRODUCT_COLUMNS.filter(([, field, type]) => field && type === "numeric").map(([, field]) => field));
const TEXT_FIELDS = new Set(PRODUCT_COLUMNS.filter(([, field, type]) => field && type === "text").map(([, field]) => field));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseStrictDevelopmentUrl(connectionString) {
  try { return parseLocalPostgresUrl(connectionString, EXPECTED_DATABASE, "DATABASE_URL"); }
  catch { throw new Error("Refusing connection: expected exactly 127.0.0.1:5432/uk_exim_erp_dev without URL overrides."); }
}

export function inspectSource(raw, expectedHash = EXPECTED_SHA256) {
  const checksum = createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
  if (checksum !== expectedHash) throw new Error(`Backup SHA-256 mismatch (actual ${checksum}).`);
  let products;
  try {
    products = JSON.parse(raw);
  } catch {
    throw new Error("Backup is not valid JSON.");
  }
  if (!Array.isArray(products)) throw new Error("Backup root must be a JSON array.");
  if (products.length !== EXPECTED_CODES.length) throw new Error(`Expected exactly 7 products; found ${products.length}.`);

  const errors = [];
  const seenIds = new Set();
  const seenCodes = new Set();
  for (const [index, product] of products.entries()) {
    const label = `record ${index + 1}`;
    if (!product || typeof product !== "object" || Array.isArray(product)) {
      errors.push(`${label}: expected an object.`);
      continue;
    }
    const fields = Object.keys(product);
    if (fields.length !== EXPECTED_FIELDS.size || fields.some((field) => !EXPECTED_FIELDS.has(field))) {
      errors.push(`${label}: fields do not exactly match the verified legacy product contract.`);
    }
    for (const field of TEXT_FIELDS) if (typeof product[field] !== "string") errors.push(`${label}: ${field} must be text.`);
    for (const field of NUMERIC_FIELDS) if (typeof product[field] !== "number" || !Number.isFinite(product[field])) errors.push(`${label}: ${field} must be a finite JSON number.`);
    if (typeof product.active !== "boolean") errors.push(`${label}: active must be boolean.`);
    if (!UUID_PATTERN.test(product.id ?? "")) errors.push(`${label}: id is not a valid UUID.`);
    if (!product.code) errors.push(`${label}: code is empty.`);
    if (!new Set(["Gram", "KG", "Pkt"]).has(product.unit)) errors.push(`${label}: unit is not accepted by the current products schema.`);
    if (seenIds.has(product.id)) errors.push(`${label}: duplicate source ID ${product.id}.`);
    if (seenCodes.has(product.code)) errors.push(`${label}: duplicate source code ${product.code}.`);
    seenIds.add(product.id);
    seenCodes.add(product.code);
  }
  const foundCodes = products.map((product) => product?.code).filter(Boolean).sort();
  if (JSON.stringify(foundCodes) !== JSON.stringify([...EXPECTED_CODES].sort())) {
    errors.push("Source codes must contain P0001 through P0007 exactly once.");
  }
  const sourceCodes = new Set(products.map((product) => product?.code));
  for (const product of products) {
    if (product?.stockBaseCode != null && !sourceCodes.has(product.stockBaseCode)) {
      errors.push(`${product?.code ?? "unknown code"}: stockBaseCode '${product.stockBaseCode}' has no source product.`);
    }
  }
  return { checksum, products, errors };
}

export function buildInsertValues(product, companyId) {
  return [
    product.id, companyId, product.code, product.name, product.category, product.hsn, product.gst,
    product.unit, String(product.netWeight), product.stockBaseCode ?? null, String(product.purchase),
    String(product.sale), String(product.mrp), String(product.baseCost), String(product.packingCost),
    String(product.otherCharges), String(product.totalCost), String(product.stock),
    String(product.minimumStock), product.active,
  ];
}

function pgTypeMatches(expected, actual) {
  if (expected === "numeric") return actual === "numeric" || actual === "decimal";
  return expected === actual;
}

function validateSchema(columns) {
  const byName = new Map(columns.map((column) => [column.column_name, column]));
  const problems = [];
  for (const [name, , type] of PRODUCT_COLUMNS) {
    const column = byName.get(name);
    if (!column) problems.push(`Missing products.${name}.`);
    else if (!pgTypeMatches(type, column.data_type)) problems.push(`products.${name}: expected ${type}, found ${column.data_type}.`);
    if (column && name !== "stock_base_code" && column.is_nullable !== "NO") {
      problems.push(`products.${name} must be NOT NULL for exact source preservation.`);
    }
  }
  return problems;
}

async function verifyIdentity(client) {
  try { return await verifyLocalPostgresConnection(client, EXPECTED_DATABASE); }
  catch { throw new Error("Connected PostgreSQL identity is not exactly 127.0.0.1:5432/uk_exim_erp_dev."); }
}

async function inspectDatabase(client, source, { apply }) {
  if (apply) await client.query("BEGIN");
  else await client.query("BEGIN READ ONLY");
  try {
    const identity = await verifyIdentity(client);
    const companyResult = await client.query(
      "SELECT id::text AS id, name FROM public.companies WHERE name = $1 ORDER BY created_at, id",
      [EXPECTED_COMPANY],
    );
    if (companyResult.rowCount !== 1) throw new Error(`Expected exactly one '${EXPECTED_COMPANY}' company; found ${companyResult.rowCount}.`);
    const company = companyResult.rows[0];

    const schemaResult = await client.query(
      `SELECT column_name, data_type, is_nullable, numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'products'
       ORDER BY ordinal_position`,
    );
    if (!schemaResult.rowCount) throw new Error("public.products table is not available.");
    const schemaProblems = validateSchema(schemaResult.rows);
    const constraintResult = await client.query(
      `SELECT con.conname AS name, con.contype AS type, pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace ns ON ns.oid = rel.relnamespace
       WHERE ns.nspname = 'public' AND rel.relname = 'products'
       ORDER BY con.conname`,
    );
    const indexResult = await client.query(
      `SELECT indexname AS name, indexdef AS definition
       FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'products'
       ORDER BY indexname`,
    );
    if (!constraintResult.rows.some((constraint) => constraint.type === "p" && /\(id\)/.test(constraint.definition))) {
      schemaProblems.push("products.id primary key is missing.");
    }
    if (!constraintResult.rows.some((constraint) => constraint.type === "f" && /company_id/.test(constraint.definition) && /companies/.test(constraint.definition))) {
      schemaProblems.push("products.company_id foreign key to companies is missing.");
    }
    if (!constraintResult.rows.some((constraint) => constraint.type === "c" && /unit/.test(constraint.definition) && /Gram/.test(constraint.definition) && /KG/.test(constraint.definition) && /Pkt/.test(constraint.definition))) {
      schemaProblems.push("products.unit check constraint does not match the verified supported units.");
    }
    const ids = source.products.map((product) => product.id);
    const codes = source.products.map((product) => product.code);
    const idResult = await client.query("SELECT id FROM public.products WHERE id = ANY($1::text[]) ORDER BY id", [ids]);
    const codeResult = await client.query(
      "SELECT code FROM public.products WHERE company_id = $1 AND code = ANY($2::text[]) ORDER BY code",
      [company.id, codes],
    );
    const allowedStockBaseCodes = new Set(source.products.map((product) => product.code));
    const referenceErrors = source.products
      .filter((product) => product.stockBaseCode != null && !allowedStockBaseCodes.has(product.stockBaseCode))
      .map((product) => `${product.code} references missing source code ${product.stockBaseCode}`);

    const conflicts = {
      id: idResult.rows.map((row) => row.id),
      code: codeResult.rows.map((row) => row.code),
    };
    const report = {
      mode: apply ? "apply" : "dry-run",
      identity,
      company: { id: company.id, name: company.name, companyRows: companyResult.rowCount },
      productSchemaColumns: schemaResult.rows,
      productConstraints: constraintResult.rows,
      productIndexes: indexResult.rows,
      schemaProblems,
      sourceCount: source.products.length,
      validCount: source.errors.length === 0 && schemaProblems.length === 0 ? source.products.length : 0,
      sourceErrors: source.errors,
      referenceErrors,
      conflicts,
    };
    const collisionCount = conflicts.id.length + conflicts.code.length;
    if (source.errors.length || schemaProblems.length || referenceErrors.length || collisionCount) {
      throw Object.assign(new Error("Preflight failed; no products were inserted."), { report });
    }

    if (apply) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('products:' || $1::text, 0))", [company.id]);
      // Recheck under the same company lock used by the Product DAL before insert-only import.
      const recheckIds = await client.query("SELECT id FROM public.products WHERE id = ANY($1::text[])", [ids]);
      const recheckCodes = await client.query(
        "SELECT code FROM public.products WHERE company_id = $1 AND code = ANY($2::text[])",
        [company.id, codes],
      );
      if (recheckIds.rowCount || recheckCodes.rowCount) throw new Error("A product ID or code conflict appeared after preflight; import aborted.");

      const columns = PRODUCT_COLUMNS.map(([name]) => name);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const insert = `INSERT INTO public.products (${columns.join(", ")}) VALUES (${placeholders})`;
      for (const product of source.products) await client.query(insert, buildInsertValues(product, company.id));
      const verify = await client.query(
        `SELECT ${columns.join(", ")}
         FROM public.products WHERE company_id = $1 AND id = ANY($2::text[]) ORDER BY code`,
        [company.id, ids],
      );
      if (verify.rowCount !== source.products.length) throw new Error("Post-insert verification failed; transaction will be rolled back.");
      const sourceById = new Map(source.products.map((product) => [product.id, product]));
      for (const row of verify.rows) {
        const product = sourceById.get(row.id);
        const expected = buildInsertValues(product, company.id);
        for (const [index, [column]] of PRODUCT_COLUMNS.entries()) {
          const actual = row[column] == null ? null : String(row[column]);
          const wanted = expected[index] == null ? null : String(expected[index]);
          if (actual !== wanted) throw new Error(`Post-insert verification mismatch in products.${column}; transaction will be rolled back.`);
        }
      }
      report.insertedCount = verify.rowCount;
      await client.query("COMMIT");
      return report;
    }

    await client.query("ROLLBACK");
    return report;
  } catch (error) {
    await client.query(apply ? "ROLLBACK" : "ROLLBACK").catch(() => {});
    if (error.report) throw error;
    throw error;
  }
}

export async function runMigration({ apply = false, connectionString = process.env.DATABASE_URL, sourceFile = SOURCE_FILE, clientFactory } = {}) {
  const url = parseStrictDevelopmentUrl(connectionString);
  const raw = await readFile(sourceFile, "utf8");
  const source = inspectSource(raw);
  const client = clientFactory ? clientFactory(url.toString()) : new pg.Client({ connectionString: url.toString() });
  try {
    await client.connect();
    const report = await inspectDatabase(client, source, { apply });
    return { ...report, checksum: source.checksum, sourceProducts: source.products };
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply") || args.filter((arg) => arg === "--apply").length > 1) {
    console.error("Usage: node scripts/products/legacy-products-migration.mjs [--apply]");
    process.exitCode = 2;
  } else {
    try {
      const report = await runMigration({ apply: args.includes("--apply") });
      console.log(JSON.stringify(report, null, 2));
    } catch (error) {
      console.error(error.message);
      if (error.report) console.error(JSON.stringify(error.report, null, 2));
      process.exitCode = 1;
    }
  }
}
