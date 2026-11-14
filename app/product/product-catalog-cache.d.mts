import type { Product } from "./components/ProductTypes";

export function getProductCatalogSnapshot(): Product[];
export function setProductCatalogSnapshot(products: Product[]): void;
