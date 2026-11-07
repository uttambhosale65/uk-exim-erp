import "./env.mjs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  parseLocalDatabaseUrl,
  readMigrations,
  runMigrations,
  verifyLocalDatabaseConnection,
} from "./migrate-lib.mjs";

const connectionString = parseLocalDatabaseUrl(process.env.TEST_DATABASE_URL, "uk_exim_erp_test");
const client = new pg.Client({ connectionString: connectionString.toString() });

if (process.env.NODE_ENV === "production") {
  throw new Error("The synthetic database test is disabled when NODE_ENV=production.");
}

try {
  await client.connect();
  const server = await verifyLocalDatabaseConnection(client, "uk_exim_erp_test");
  console.log(`Connected to ${server.name} on ${server.address} (PostgreSQL ${server.version}).`);
  const migrations = await readMigrations();
  await assertFreshDatabaseGuard(client, migrations);
  await runMigrations(client, migrations);
  const repeatedMigration = await runMigrations(client, migrations);
  if (repeatedMigration.applied !== 0) {
    throw new Error("Repeated migration run attempted to apply a migration again.");
  }

  await assertSchema(client);

  await client.query("BEGIN");
  const companyId = randomUUID();
  const productId = `synthetic-${randomUUID()}`;
  try {
    await client.query("INSERT INTO companies (id, name) VALUES ($1, $2)", [companyId, "Synthetic Test Company"]);
    await client.query(
      `INSERT INTO products
       (id, company_id, code, name, category, hsn, gst, unit, net_weight, purchase, sale, mrp,
        base_cost, packing_cost, other_charges, total_cost, stock, minimum_stock, active)
       VALUES ($1, $2, 'TEST-001', 'Synthetic Product', 'Test', '0000', '0%', 'KG',
        1, 0.1, 0.3, 0.4, 0.1, 0.2, 0, 0.3, 0, 0, true)`,
      [productId, companyId],
    );

    const created = await client.query(
      "SELECT sale::text AS sale, total_cost::text AS total_cost FROM products WHERE id = $1 AND company_id = $2",
      [productId, companyId],
    );
    if (created.rows[0]?.sale !== "0.3" || created.rows[0]?.total_cost !== "0.3") {
      throw new Error("Numeric exactness check failed for synthetic product.");
    }

    await client.query("UPDATE products SET sale = 0.35 WHERE id = $1 AND company_id = $2", [productId, companyId]);
    const updated = await client.query("SELECT sale::text AS sale FROM products WHERE id = $1", [productId]);
    if (updated.rows[0]?.sale !== "0.35") throw new Error("Synthetic update check failed.");

    await client.query(
      "UPDATE products SET sale = 0.1234567890123456789 WHERE id = $1 AND company_id = $2",
      [productId, companyId],
    );
    const precise = await client.query("SELECT sale::text AS sale FROM products WHERE id = $1", [productId]);
    if (precise.rows[0]?.sale !== "0.1234567890123456789") {
      throw new Error("High-precision numeric round-trip check failed.");
    }

    await client.query("SAVEPOINT before_orphan_insert");
    let foreignKeyRejected = false;
    try {
      await client.query(
        `INSERT INTO products
         (id, company_id, code, name, category, hsn, gst, unit, net_weight, purchase, sale, mrp,
          base_cost, packing_cost, other_charges, total_cost, stock, minimum_stock, active)
         VALUES ($1, $2, 'ORPHAN', 'Orphan', 'Test', '0000', '0%', 'KG', 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, true)`,
        [`orphan-${randomUUID()}`, randomUUID()],
      );
    } catch (error) {
      if (error.code !== "23503") throw error;
      foreignKeyRejected = true;
    }
    if (!foreignKeyRejected) throw new Error("Company ownership foreign-key check failed.");
    await client.query("ROLLBACK TO SAVEPOINT before_orphan_insert");

    await assertBaselineImmutability(client, companyId);
    await assertMovementConstraints(client, companyId);

    await client.query("DELETE FROM products WHERE id = $1 AND company_id = $2", [productId, companyId]);
    const deleted = await client.query("SELECT 1 FROM products WHERE id = $1", [productId]);
    if (deleted.rowCount !== 0) throw new Error("Synthetic delete check failed.");
  } finally {
    await client.query("ROLLBACK");
  }

  console.log("Synthetic schema, migration, CRUD, numeric, company FK, baseline immutability, and stock movement checks passed (fixture transaction rolled back).");
} finally {
  await client.end();
}

async function assertFreshDatabaseGuard(db, migrations) {
  const migrationTable = await db.query(
    "SELECT to_regclass('public._schema_migrations') AS migration_table",
  );
  if (migrationTable.rows[0]?.migration_table) return;

  await db.query("BEGIN");
  try {
    await db.query("CREATE TABLE __stage1_guard_fixture (id integer PRIMARY KEY)");
    let refused = false;
    try {
      await runMigrations(db, migrations);
    } catch (error) {
      if (!String(error.message).includes("non-empty database")) throw error;
      refused = true;
    }
    if (!refused) throw new Error("Migration runner accepted a synthetic non-empty database.");
  } finally {
    await db.query("ROLLBACK");
  }
}

async function assertSchema(db) {
  const expectedTables = [
    "_schema_migrations",
    "companies",
    "products",
    "customers",
    "suppliers",
    "purchases",
    "purchase_items",
    "sales",
    "sales_items",
    "stock_baselines",
    "stock_movement_transactions",
    "stock_movements",
  ];
  const tableResult = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  const actualTables = new Set(tableResult.rows.map(({ table_name }) => table_name));
  const missingTables = expectedTables.filter((name) => !actualTables.has(name));
  if (missingTables.length) throw new Error(`Schema tables missing: ${missingTables.join(", ")}`);

  const expectedIndexes = [
    "products_company_code_idx",
    "customers_company_code_idx",
    "suppliers_company_code_idx",
    "purchases_company_date_idx",
    "sales_company_date_idx",
    "stock_movements_company_stock_idx",
  ];
  const indexResult = await db.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'",
  );
  const actualIndexes = new Set(indexResult.rows.map(({ indexname }) => indexname));
  const missingIndexes = expectedIndexes.filter((name) => !actualIndexes.has(name));
  if (missingIndexes.length) throw new Error(`Schema indexes missing: ${missingIndexes.join(", ")}`);

  const foreignKeyResult = await db.query(
    `SELECT conname, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace`,
  );
  if (foreignKeyResult.rowCount < 10) throw new Error("Expected company and document foreign keys are missing.");
  const productCompanyFk = foreignKeyResult.rows.find(
    ({ conname }) => conname === "products_company_id_fkey",
  );
  if (!productCompanyFk?.definition.includes("REFERENCES companies(id)")) {
    throw new Error("Product company ownership foreign key is missing.");
  }

  const constraintResult = await db.query(
    `SELECT conname, contype, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE conrelid = 'stock_movement_transactions'::regclass`,
  );
  const cutoverConstraint = constraintResult.rows.find(({ conname, contype }) =>
    conname === "stock_movement_transactions_posted_at_check" && contype === "c",
  );
  const transactionPrimaryKey = constraintResult.rows.find(({ conname, definition }) =>
    conname === "stock_movement_transactions_pkey"
      && definition.includes("PRIMARY KEY (company_id, transaction_type, transaction_id)"),
  );
  // The timestamp instant is verified behaviorally below; pg_get_constraintdef() formats it
  // using the session timezone, so its text is not a stable representation for comparison.
  if (!cutoverConstraint) throw new Error("Post-cutover timestamp check constraint is missing.");
  if (!transactionPrimaryKey) throw new Error("Stock movement transaction uniqueness constraint is missing.");

  const triggerResult = await db.query(
    `SELECT tgname FROM pg_trigger
     WHERE tgrelid = 'stock_baselines'::regclass AND NOT tgisinternal AND tgenabled <> 'D'`,
  );
  const triggerNames = new Set(triggerResult.rows.map(({ tgname }) => tgname));
  if (!triggerNames.has("stock_baselines_no_update")) {
    throw new Error("Stock baseline immutability trigger is missing or disabled.");
  }
}

async function expectConstraintError(db, savepoint, expectedCode, statement, values) {
  await db.query(`SAVEPOINT ${savepoint}`);
  try {
    await db.query(statement, values);
  } catch (error) {
    await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    if (error.code !== expectedCode) {
      throw new Error(`Expected PostgreSQL error ${expectedCode}; received ${error.code || "unknown"}.`);
    }
    return;
  }
  await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  throw new Error(`Expected PostgreSQL constraint error ${expectedCode}, but the statement succeeded.`);
}

async function assertBaselineImmutability(db, companyId) {
  const baselineId = `synthetic-baseline-${randomUUID()}`;
  await db.query(
    `INSERT INTO stock_baselines
     (id, company_id, product_code, product_name, hsn, unit, opening_stock, purchase_qty, sales_qty, current_stock, captured_at)
     VALUES ($1, $2, 'TEST-001', 'Synthetic Product', '0000', 'KG', 10, 0, 0, 10, now())`,
    [baselineId, companyId],
  );
  await expectConstraintError(
    db,
    "baseline_update_check",
    "P0001",
    "UPDATE stock_baselines SET current_stock = 9 WHERE id = $1",
    [baselineId],
  );
  await expectConstraintError(
    db,
    "baseline_delete_check",
    "P0001",
    "DELETE FROM stock_baselines WHERE id = $1",
    [baselineId],
  );
}

async function assertMovementConstraints(db, companyId) {
  const transactionId = `synthetic-sale-${randomUUID()}`;
  const validTimestamp = "2026-11-05T18:30:00.000Z";
  const istTimestamp = "2026-11-06T00:00:00.000+05:30";
  const equivalentInstants = await db.query(
    "SELECT $1::timestamptz = $2::timestamptz AS same_instant",
    [validTimestamp, istTimestamp],
  );
  if (!equivalentInstants.rows[0]?.same_instant) {
    throw new Error("UTC and Asia/Calcutta cutover timestamps do not resolve to the same instant.");
  }

  await db.query(
    `INSERT INTO stock_movement_transactions
     (company_id, transaction_type, transaction_id, posted_at, state)
     VALUES ($1, 'sale', $2, $3, 'posted')`,
    [companyId, transactionId, validTimestamp],
  );

  await db.query(
    `INSERT INTO stock_movement_transactions
     (company_id, transaction_type, transaction_id, posted_at, state)
     VALUES ($1, 'sale', $2, $3, 'posted')`,
    [companyId, `${transactionId}-ist`, istTimestamp],
  );

  await expectConstraintError(
    db,
    "movement_duplicate_check",
    "23505",
    `INSERT INTO stock_movement_transactions
     (company_id, transaction_type, transaction_id, posted_at, state)
     VALUES ($1, 'sale', $2, $3, 'posted')`,
    [companyId, transactionId, validTimestamp],
  );

  const tooEarlyId = `synthetic-too-early-${randomUUID()}`;
  await expectConstraintError(
    db,
    "movement_cutover_check",
    "23514",
    `INSERT INTO stock_movement_transactions
     (company_id, transaction_type, transaction_id, posted_at, state)
     VALUES ($1, 'sale', $2, '2026-11-05T18:29:59.999Z', 'posted')`,
    [companyId, tooEarlyId],
  );

  const movementResult = await db.query(
    `INSERT INTO stock_movements
     (company_id, transaction_type, transaction_id, line_id, product_code, stock_code, direction,
      quantity_kg, unit, source_quantity, net_weight_grams)
     VALUES ($1, 'sale', $2, 'line-1', 'TEST-001', 'P0006', 'out', 0.05, 'Pkt', 1, 50)
     RETURNING quantity_kg::text AS quantity_kg`,
    [companyId, transactionId],
  );
  if (movementResult.rows[0]?.quantity_kg !== "0.05") {
    throw new Error("Stock movement numeric quantity did not round-trip exactly.");
  }
}
