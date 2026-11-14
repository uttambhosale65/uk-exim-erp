export type ProductsUiFixtureManifest = {
  version: 1;
  database: "uk_exim_erp_test";
  companyName: "SYNTHETIC PRODUCTS UI TEST COMPANY";
  status: "preparing" | "ready";
  companyId: string;
  userId: string;
  userEmail: string;
  username: string;
  productIds: string[];
  accountIds: string[];
  sessionIds: string[];
  verificationIds: string[];
  rateLimitIds: string[];
};

export function validateProductsUiFixtureManifest(manifest: unknown): ProductsUiFixtureManifest;
export function readProductsUiFixtureManifest(): Promise<ProductsUiFixtureManifest>;
export function writeProductsUiFixtureManifest(manifest: ProductsUiFixtureManifest): Promise<void>;
export function registerProductsUiTestProduct(productId: string, companyId: string): Promise<void>;
export function recordProductsUiTestRateLimits(pool: {
  connect: () => Promise<{
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ id: string }> }>;
    release: () => void;
  }>;
}, request: Request): Promise<void>;
export function removeProductsUiFixtureManifest(): Promise<void>;
