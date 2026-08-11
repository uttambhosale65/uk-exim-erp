import { Sales } from "./SalesTypes";

const STORAGE_KEY = "uk-exim-sales";

export function loadSales(): Sales[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error loading sales:", error);
    return [];
  }
}

export function saveSales(sales: Sales[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sales)
    );
  } catch (error) {
    console.error("Error saving sales:", error);
  }
}

export function getNextSalesNo(
  sales: Sales[]
): string {
  if (!sales || sales.length === 0) {
    return "SAL-0001";
  }

  let maxNumber = 0;

  sales.forEach((sale) => {
    const match = sale.salesNo?.match(
      /SAL-(\d+)/
    );

    if (match) {
      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  return `SAL-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

export function getNextInvoiceNo(
  sales: Sales[]
): string {
  if (!sales || sales.length === 0) {
    return "INV-0001";
  }

  let maxNumber = 0;

  sales.forEach((sale) => {
    const match = sale.invoiceNo?.match(
      /INV-(\d+)/
    );

    if (match) {
      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  return `INV-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}