import { Sales } from "./SalesTypes";

const STORAGE_KEY = "uk-exim-sales";

export function loadSales(): Sales[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  return data ? JSON.parse(data) : [];
}

export function saveSales(sales: Sales[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sales)
  );
}

export function getNextSalesNo(
  sales: Sales[]
): string {
  const next = sales.length + 1;

  return "SAL-" + next.toString().padStart(4, "0");
}