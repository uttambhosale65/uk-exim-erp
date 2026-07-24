import { Customer } from "./CustomerTypes";

const STORAGE_KEY = "uk-exim-customers";

export function loadCustomers(): Customer[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCustomers(customers: Customer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export function getNextCustomerCode(customers: Customer[]): string {
  if (customers.length === 0) return "C0001";

  const maxNumber = Math.max(
    ...customers.map((c) => Number(c.code.replace("C", "")) || 0)
  );

  return `C${String(maxNumber + 1).padStart(4, "0")}`;
}