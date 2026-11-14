import type { Product } from "../components/ProductTypes";

type ProductDatabase = {
  query: (sql: string, parameters?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
  connect: () => Promise<{
    query: (sql: string, parameters?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
    release: () => void;
  }>;
};

type OwnerContext = { company?: { company_id?: string } } | null;

export class ProductRequestError extends Error {
  code: string;
}

export function createProductDAL(options: {
  getOwnerContext: () => Promise<OwnerContext>;
  database: ProductDatabase;
  onProductCreate?: (productId: string, companyId: string) => Promise<void>;
}): {
  listProducts: () => Promise<Product[]>;
  getProduct: (id: string) => Promise<Product | null>;
  createProduct: (input: unknown) => Promise<Product>;
  updateProduct: (id: string, input: unknown) => Promise<Product | null>;
  deactivateProduct: (id: string) => Promise<Product | null>;
};
