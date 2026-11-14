import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  PRODUCTS_UI_TEST_COMPANY_NAME,
} from "../../lib/db/products-ui-test.mjs";

const MANIFEST_PATH = path.resolve(process.cwd(), ".local-test", "products-ui-fixture.json");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MANIFEST_FIELDS = new Set([
  "version", "database", "companyName", "status", "companyId", "userId", "userEmail", "username",
  "productIds", "accountIds", "sessionIds", "verificationIds", "rateLimitIds",
]);
let writeQueue = Promise.resolve();

function enqueueManifestWrite(operation) {
  const next = writeQueue.catch(() => {}).then(operation);
  writeQueue = next;
  return next;
}

export function validateProductsUiFixtureManifest(manifest) {
  if (!manifest || typeof manifest !== "object"
    || Object.keys(manifest).some((field) => !MANIFEST_FIELDS.has(field))
    || manifest.version !== 1
    || manifest.database !== "uk_exim_erp_test"
    || manifest.companyName !== PRODUCTS_UI_TEST_COMPANY_NAME
    || !["preparing", "ready"].includes(manifest.status)
    || !UUID.test(manifest.companyId)
    || typeof manifest.userId !== "string"
    || manifest.userId.length < 1
    || manifest.userId.length > 200
    || typeof manifest.userEmail !== "string"
    || !/^products-ui-[0-9a-f-]+@example\.invalid$/i.test(manifest.userEmail)
    || typeof manifest.username !== "string"
    || !/^synthetic_[0-9a-f]{18}$/i.test(manifest.username)
    || !Array.isArray(manifest.productIds)
    || manifest.productIds.some((id) => typeof id !== "string" || !UUID.test(id))
    || !Array.isArray(manifest.accountIds)
    || manifest.accountIds.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200)
    || !Array.isArray(manifest.sessionIds)
    || manifest.sessionIds.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200)
    || !Array.isArray(manifest.verificationIds)
    || manifest.verificationIds.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200)
    || !Array.isArray(manifest.rateLimitIds)
    || manifest.rateLimitIds.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200)) {
    throw new Error("Products UI fixture manifest is invalid; refusing to use its identifiers.");
  }
  for (const [field, label] of [
    ["productIds", "product"], ["accountIds", "account"], ["sessionIds", "session"],
    ["verificationIds", "verification"], ["rateLimitIds", "rate-limit"],
  ]) {
    if (new Set(manifest[field]).size !== manifest[field].length) {
      throw new Error(`Products UI fixture manifest contains duplicate ${label} IDs.`);
    }
  }
  return manifest;
}

export async function readProductsUiFixtureManifest() {
  let raw;
  try {
    raw = await readFile(MANIFEST_PATH, "utf8");
  } catch {
    throw new Error("Products UI fixture manifest is missing.");
  }
  try {
    return validateProductsUiFixtureManifest(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Products UI fixture manifest is unreadable; refusing cleanup.");
    }
    throw error;
  }
}

export async function writeProductsUiFixtureManifest(manifest) {
  const checked = validateProductsUiFixtureManifest(manifest);
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  const temporaryPath = `${MANIFEST_PATH}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(checked, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, MANIFEST_PATH);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

export async function registerProductsUiTestProduct(productId, companyId) {
  if (typeof productId !== "string" || !UUID.test(productId)) {
    throw new Error("Test-mode product IDs must be UUIDs before they can be recorded.");
  }
  return enqueueManifestWrite(async () => {
    const manifest = await readProductsUiFixtureManifest();
    if (manifest.companyId !== companyId) {
      throw new Error("Authenticated company does not match the Products UI fixture.");
    }
    if (manifest.status !== "ready") {
      throw new Error("Products UI fixture is not ready to accept product records.");
    }
    if (!manifest.productIds.includes(productId)) {
      manifest.productIds.push(productId);
      await writeProductsUiFixtureManifest(manifest);
    }
  });
}

export async function recordProductsUiTestRateLimits() {
  // Better Auth rate limits are shared by IP and path, so they cannot be attributed to a fixture user.
}

export async function removeProductsUiFixtureManifest() {
  const { unlink } = await import("node:fs/promises");
  await unlink(MANIFEST_PATH);
}
