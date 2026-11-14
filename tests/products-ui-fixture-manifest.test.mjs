import assert from "node:assert/strict";
import test from "node:test";
import { validateProductsUiFixtureManifest } from "../app/product/server/products-ui-test-manifest.mjs";

const validManifest = {
  version: 1,
  database: "uk_exim_erp_test",
  companyName: "SYNTHETIC PRODUCTS UI TEST COMPANY",
  status: "ready",
  companyId: "1e7b6f9d-6b86-4f5d-8fc9-6a62ee3f8465",
  userId: "synthetic-user-id",
  userEmail: "products-ui-123e4567-e89b-12d3-a456-426614174000@example.invalid",
  username: "synthetic_1234567890abcdef12",
  productIds: ["30ac5af2-e633-4ae6-a029-f66ebf9c0e23"],
  accountIds: ["synthetic-account-id"],
  sessionIds: [],
  verificationIds: [],
  rateLimitIds: ["synthetic-rate-limit-id"],
};

test("fixture manifest accepts only the expected synthetic test fixture identifiers", () => {
  assert.deepEqual(validateProductsUiFixtureManifest(validManifest), validManifest);
  assert.throws(() => validateProductsUiFixtureManifest({
    ...validManifest,
    database: "uk_exim_erp_dev",
  }), /manifest is invalid/);
  assert.throws(() => validateProductsUiFixtureManifest({
    ...validManifest,
    companyName: "UK EXIM ENTERPRISES",
  }), /manifest is invalid/);
  assert.throws(() => validateProductsUiFixtureManifest({
    ...validManifest,
    productIds: ["30ac5af2-e633-4ae6-a029-f66ebf9c0e23", "30ac5af2-e633-4ae6-a029-f66ebf9c0e23"],
  }), /duplicate product IDs/);
  assert.throws(() => validateProductsUiFixtureManifest({
    ...validManifest,
    password: "must-never-be-stored",
  }), /manifest is invalid/);
});
