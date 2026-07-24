import { Product } from "./ProductTypes";

const STORAGE_KEY = "uk-exim-products";

export function loadProducts(): Product[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data) as Product[];
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(products)
  );
}

export function clearProducts() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export function getNextProductCode(
  products: Product[]
): string {
  if (products.length === 0) {
    return "P0001";
  }

  const maxNumber = products.reduce((max, product) => {
    const number = parseInt(
      product.code.replace("P", "")
    );

    if (isNaN(number)) {
      return max;
    }

    return Math.max(max, number);
  }, 0);

  return `P${String(maxNumber + 1).padStart(4, "0")}`;
}