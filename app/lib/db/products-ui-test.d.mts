export const PRODUCTS_UI_TEST_FLAG: "UKEXIM_PRODUCTS_UI_TEST_MODE";
export const PRODUCTS_UI_TEST_COMPANY_NAME: "SYNTHETIC PRODUCTS UI TEST COMPANY";

export function isProductsUiTestMode(env?: NodeJS.ProcessEnv): boolean;
export function resolveProductsUiDatabaseTarget(env?: NodeJS.ProcessEnv):
  | { mode: "development" }
  | { mode: "products-ui-test"; connectionString: string }
  | { mode: "products-ui-e2e-disposable"; databaseName: string; connectionString: string };
export function createSharedDatabaseTargetResolver(
  resolveTarget: () => { mode: "development" } | { mode: "products-ui-test"; connectionString: string } | { mode: "products-ui-e2e-disposable"; databaseName: string; connectionString: string },
  getDevelopmentUrl: () => string,
): () => Readonly<
  | { mode: "development"; connectionString: string }
  | { mode: "products-ui-test"; connectionString: string }
  | { mode: "products-ui-e2e-disposable"; databaseName: string; connectionString: string }
>;
export function parseProductsUiTestDatabaseUrl(connectionString: string | undefined): URL;
export function parseProductsUiE2EDatabaseUrl(connectionString: string | undefined, expectedDatabase: string): URL;
export function verifyProductsUiTestDatabase(client: {
  query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
}): Promise<void>;
export function verifyConfiguredProductsUiPool(pool: {
  connect: () => Promise<{
    query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
    release: () => void;
  }>;
}, target: { mode: string; databaseName?: string }): Promise<void>;
export function verifyProductsUiTestPool(pool: {
  connect: () => Promise<{
    query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
    release: () => void;
  }>;
}): Promise<void>;
