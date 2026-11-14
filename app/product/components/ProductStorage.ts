import type { Product } from "./ProductTypes";
import { getProductCatalogSnapshot } from "../product-catalog-cache.mjs";

/** Synchronous compatibility reader for legacy calculations.
 * The snapshot is populated only from the authenticated PostgreSQL Product API.
 */
export function loadProducts(): Product[] {
  return getProductCatalogSnapshot();
}

/** Product writes must go through the authenticated Product API. */
export function saveProducts(_products: Product[]): never {
  void _products;
  throw new Error("Products are managed through the authenticated PostgreSQL Product API.");
}

/** Product deletion must use the API's deactivation operation. */
export function clearProducts(): never {
  throw new Error("Products cannot be cleared from the legacy browser catalog.");
}

export function getNextProductCode(products: Product[]): string {
  if (!products || products.length === 0) return "P0001";

  const maxNumber = products.reduce((max, product) => {
    const number = Number.parseInt(product.code.replace("P", ""), 10);
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);

  return `P${String(maxNumber + 1).padStart(4, "0")}`;
}
