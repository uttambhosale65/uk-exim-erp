import "../db/env.mjs";
import { randomBytes, randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { createAuthInstance } from "../../app/lib/auth/factory.mjs";
import {
  isProductsUiTestMode,
  parseProductsUiTestDatabaseUrl,
  PRODUCTS_UI_TEST_COMPANY_NAME,
  resolveProductsUiDatabaseTarget,
  verifyProductsUiTestDatabase,
} from "../../app/lib/db/products-ui-test.mjs";
import {
  readProductsUiFixtureManifest,
  removeProductsUiFixtureManifest,
  validateProductsUiFixtureManifest,
  writeProductsUiFixtureManifest,
} from "../../app/product/server/products-ui-test-manifest.mjs";
import {
  captureProductsUiFixtureArtifactIds,
  cleanupFailedProductsUiFixture,
  cleanupProductsUiFixture,
} from "./products-ui-fixture-cleanup.mjs";

const MANIFEST_PATH = path.resolve(process.cwd(), ".local-test", "products-ui-fixture.json");
const EMAIL_DOMAIN = "example.invalid";

function assertTestOnlyEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Products UI fixture operations are disabled in production.");
  }
  if (!isProductsUiTestMode()) {
    throw new Error("Set UKEXIM_PRODUCTS_UI_TEST_MODE=1 for this test-only command.");
  }
  const target = resolveProductsUiDatabaseTarget();
  if (target.mode !== "products-ui-test") {
    throw new Error("Products UI fixture command did not resolve the approved test database.");
  }
  return parseProductsUiTestDatabaseUrl(process.env.TEST_DATABASE_URL);
}

async function verifiedClient(pool) {
  const client = await pool.connect();
  try {
    await verifyProductsUiTestDatabase(client);
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

async function askMasked(label) {
  stdout.write(`${label} (input hidden): `);
  return new Promise((resolve, reject) => {
    const value = [];
    const previousRawMode = stdin.isRaw;
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(Boolean(previousRawMode));
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Fixture setup cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          const answer = value.join("");
          cleanup();
          resolve(answer);
          return;
        }
        if (char === "\u007f" || char === "\b") value.pop();
        else if (char >= " ") value.push(char);
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function setupFixture() {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Fixture setup requires an interactive local terminal.");
  }
  const target = assertTestOnlyEnvironment();
  if (existsSync(MANIFEST_PATH)) {
    throw new Error("A Products UI fixture manifest already exists; clean it before creating another.");
  }
  if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
    throw new Error("Local Better Auth settings are required; values are not displayed.");
  }

  const companyId = randomUUID();
  const userId = randomUUID();
  const username = `synthetic_${randomBytes(9).toString("hex")}`;
  const email = `products-ui-${randomUUID()}@${EMAIL_DOMAIN}`;
  const name = "Synthetic Products UI Owner";
  const password = await askMasked("Unique synthetic-only password (do not reuse a real account password; 12–128 chars)");
  const confirmation = await askMasked("Confirm synthetic test password");
  if (password.length < 12 || password.length > 128 || password !== confirmation) {
    throw new Error("Synthetic test passwords must match and contain 12 to 128 characters.");
  }

  const connectionString = target.toString();
  const productPool = new Pool({ connectionString, max: 2 });
  const authPool = new Pool({ connectionString, options: "-c search_path=auth,public", max: 2 });
  let manifestWritten = false;
  try {
    const productClient = await verifiedClient(productPool);
    try {
      const schema = await productClient.query(
        `SELECT to_regclass('public.companies') AS companies,
                to_regclass('auth."user"') AS users,
                to_regclass('auth.company_memberships') AS memberships`,
      );
      if (!schema.rows[0]?.companies || !schema.rows[0]?.users || !schema.rows[0]?.memberships) {
        throw new Error("Test database migrations are incomplete; refusing fixture setup.");
      }
      const existing = await productClient.query(
        `SELECT
           (SELECT count(*)::int FROM public.companies) AS companies,
           (SELECT count(*)::int FROM public.products) AS products,
           (SELECT count(*)::int FROM public.customers) AS customers,
           (SELECT count(*)::int FROM public.suppliers) AS suppliers,
           (SELECT count(*)::int FROM public.purchases) AS purchases,
           (SELECT count(*)::int FROM public.purchase_items) AS purchase_items,
           (SELECT count(*)::int FROM public.sales) AS sales,
           (SELECT count(*)::int FROM public.sales_items) AS sales_items,
           (SELECT count(*)::int FROM public.stock_baselines) AS stock_baselines,
           (SELECT count(*)::int FROM public.stock_movement_transactions) AS stock_transactions,
           (SELECT count(*)::int FROM public.stock_movements) AS stock_movements,
           (SELECT count(*)::int FROM auth."user") AS users,
           (SELECT count(*)::int FROM auth."session") AS sessions,
           (SELECT count(*)::int FROM auth."account") AS accounts,
           (SELECT count(*)::int FROM auth."verification") AS verifications,
           (SELECT count(*)::int FROM auth.company_memberships) AS memberships,
           (SELECT count(*)::int FROM auth."rateLimit") AS rate_limits`,
      );
      if (Object.values(existing.rows[0]).some((count) => count !== 0)) {
        throw new Error("Test DB contains existing records; fixture setup requires an otherwise empty test database.");
      }
      const duplicateCompany = await productClient.query(
        "SELECT id FROM public.companies WHERE name = $1 LIMIT 1",
        [PRODUCTS_UI_TEST_COMPANY_NAME],
      );
      if (duplicateCompany.rowCount !== 0) {
        throw new Error("Synthetic Products UI company already exists; refusing to reuse it.");
      }
      await writeProductsUiFixtureManifest({
        version: 1,
        database: "uk_exim_erp_test",
        companyName: PRODUCTS_UI_TEST_COMPANY_NAME,
        status: "preparing",
        companyId,
        userId,
        userEmail: email,
        username,
        productIds: [],
        accountIds: [],
        sessionIds: [],
        verificationIds: [],
        rateLimitIds: [],
      });
      manifestWritten = true;
      await productClient.query(
        "INSERT INTO public.companies (id, name) VALUES ($1, $2)",
        [companyId, PRODUCTS_UI_TEST_COMPANY_NAME],
      );
    } finally {
      productClient.release();
    }

    const authClient = await verifiedClient(authPool);
    authClient.release();
    const fixtureAuth = createAuthInstance({
      database: authPool,
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      allowSignUp: true,
      generateId: ({ model }) => model === "user" ? userId : randomUUID(),
    });
    const created = await fixtureAuth.api.signUpEmail({
      body: { name, email, username, password },
    });
    if (created.user.id !== userId) {
      throw new Error("Better Auth did not use the pre-recorded synthetic user ID.");
    }
    const artifactClient = await verifiedClient(authPool);
    let artifactIds;
    try {
      const preparingManifest = await readProductsUiFixtureManifest();
      artifactIds = await captureProductsUiFixtureArtifactIds(artifactClient, preparingManifest);
    } finally {
      artifactClient.release();
    }
    const preparingManifest = await readProductsUiFixtureManifest();
    Object.assign(preparingManifest, artifactIds);
    await writeProductsUiFixtureManifest(preparingManifest);

    const membershipClient = await verifiedClient(productPool);
    try {
      await membershipClient.query("BEGIN");
      const membership = await membershipClient.query(
        `INSERT INTO auth.company_memberships (company_id, user_id, role)
         SELECT $1, $2, 'owner'
         WHERE EXISTS (
           SELECT 1 FROM public.companies WHERE id = $1 AND name = $3
         )
         RETURNING user_id`,
        [companyId, userId, PRODUCTS_UI_TEST_COMPANY_NAME],
      );
      if (membership.rowCount !== 1) throw new Error("Synthetic owner membership could not be created.");
      await membershipClient.query("COMMIT");
    } catch (error) {
      await membershipClient.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      membershipClient.release();
    }

    await writeProductsUiFixtureManifest({
      version: 1,
      database: "uk_exim_erp_test",
      companyName: PRODUCTS_UI_TEST_COMPANY_NAME,
      status: "ready",
      companyId,
      userId,
      userEmail: email,
      username,
      productIds: [],
      ...artifactIds,
    });
    console.log(`Synthetic Products UI owner created. Login ID: ${username}; email: ${email}. Password was not saved or displayed.`);
  } catch {
    if (manifestWritten) {
      try {
        await cleanupFailedProductsUiFixture(productPool, await readProductsUiFixtureManifest(), removeProductsUiFixtureManifest);
      } catch {
        throw new Error("Synthetic fixture setup failed. Automatic cleanup did not finish; the manifest was retained for safe recovery.");
      }
    }
    throw new Error("Synthetic fixture setup failed. Check the safe local CLI output; secrets are not included here.");
  } finally {
    await authPool.end();
    await productPool.end();
  }
}

async function cleanupFixture() {
  assertTestOnlyEnvironment();
  const connectionString = process.env.TEST_DATABASE_URL;
  const productPool = new Pool({ connectionString, max: 2 });
  try {
    const manifest = validateProductsUiFixtureManifest(await readProductsUiFixtureManifest());
    const client = await verifiedClient(productPool);
    try {
      const outcome = await cleanupProductsUiFixture(client, manifest);
      await removeProductsUiFixtureManifest();
      const summary = outcome.alreadyAbsent
        ? "Synthetic Products UI fixture was already absent; manifest removed after verification."
        : "Synthetic Products UI fixture IDs were removed and verified in uk_exim_erp_test.";
      const preservedRateLimits = outcome.preservedUnattributedRateLimitCount ?? 0;
      console.log(`${summary}${preservedRateLimits
        ? ` Preserved ${preservedRateLimits} unattributed TEST rate-limit record(s).`
        : ""}`);
    } finally {
      client.release();
    }
  } finally {
    await productPool.end();
  }
}

const operation = process.argv[2];
if (operation === "setup") await setupFixture();
else if (operation === "cleanup") await cleanupFixture();
else throw new Error("Choose exactly one operation: setup or cleanup.");
