const STORAGE_KEY = "uk-exim-products";

import { Product } from "./ProductTypes";

export function loadProducts(): Product[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(products)
  );
}

export function clearProducts() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
}