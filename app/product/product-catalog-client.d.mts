import type { Product } from "./components/ProductTypes";

export function createProductCatalogClient(fetcher: typeof fetch): {
  list(): Promise<Product[]>;
  save(product: Product, editing: boolean): Promise<Product>;
  deactivate(id: string): Promise<Product>;
};
