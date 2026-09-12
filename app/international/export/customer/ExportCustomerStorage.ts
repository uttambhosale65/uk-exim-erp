import { ExportCustomer } from "./ExportCustomerTypes";

const STORAGE_KEY = "uk-exim-export-customers";

export function loadExportCustomers(): ExportCustomer[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExportCustomers(
  customers: ExportCustomer[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(customers)
  );
}

export function getNextExportCustomerCode(
  customers: ExportCustomer[]
): string {
  if (customers.length === 0) {
    return "EXP-CUST-0001";
  }

  const maxNumber = Math.max(
    ...customers.map((customer) => {
      const match = customer.code.match(
        /EXP-CUST-(\d+)/
      );

      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-CUST-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}