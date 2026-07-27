import { Sales } from "./SalesTypes";

const STORAGE_KEY = "uk-exim-sales";

export function loadSales(): Sales[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) return [];

    return JSON.parse(data) as Sales[];
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

// ==============================
// Auto Sales Number
// ==============================

export function getNextSalesNo(
  sales: Sales[]
): string {
  if (sales.length === 0) {
    return "SAL-0001";
  }

  const lastNumber = Math.max(
    ...sales.map((sale) => {
      const no = parseInt(
        sale.salesNo.replace("SAL-", "")
      );

      return isNaN(no) ? 0 : no;
    })
  );

  return `SAL-${String(lastNumber + 1).padStart(4, "0")}`;
}

// ==============================
// Auto Invoice Number
// ==============================

export function getNextInvoiceNo(
  sales: Sales[]
): string {
  if (sales.length === 0) {
    return "INV-0001";
  }

  const lastNumber = Math.max(
    ...sales.map((sale) => {
      const no = parseInt(
        sale.invoiceNo.replace("INV-", "")
      );

      return isNaN(no) ? 0 : no;
    })
  );

  return `INV-${String(lastNumber + 1).padStart(4, "0")}`;
}

// ==============================
// Find Sales
// ==============================

export function getSalesById(
  id: string
): Sales | undefined {
  return loadSales().find(
    (sale) => sale.id === id
  );
}

// ==============================
// Delete Sales
// ==============================

export function deleteSales(
  id: string
): Sales[] {
  const sales = loadSales().filter(
    (sale) => sale.id !== id
  );

  saveSales(sales);

  return sales;
}

// ==============================
// Clear All Sales
// ==============================

export function clearSales(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
}