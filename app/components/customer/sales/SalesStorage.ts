import { Sales } from "./SalesTypes";

const STORAGE_KEY = "uk-exim-sales";

export function loadSales(): Sales[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) return [];

    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading sales:", error);
    return [];
  }
}

export function saveSales(sales: Sales[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sales)
  );
}

export function getNextSalesNo(
  sales: Sales[]
): string {
  if (sales.length === 0) {
    return "SAL-0001";
  }

  const lastSales = sales[sales.length - 1];

  const lastNumber = parseInt(
    lastSales.salesNo.replace("SAL-", "")
  );

  const nextNumber = isNaN(lastNumber)
    ? sales.length + 1
    : lastNumber + 1;

  return `SAL-${nextNumber
    .toString()
    .padStart(4, "0")}`;
}

export function getSalesById(
  id: string
): Sales | undefined {
  return loadSales().find(
    (sale) => sale.id === id
  );
}

export function deleteSales(
  id: string
): Sales[] {
  const sales = loadSales().filter(
    (sale) => sale.id !== id
  );

  saveSales(sales);

  return sales;
}