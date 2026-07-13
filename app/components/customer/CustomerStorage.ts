import { Customer } from "./CustomerTypes";

const STORAGE_KEY = "uk-exim-customers";

export function loadCustomers(): Customer[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveCustomers(customers: Customer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export function getNextCustomerCode(customers: Customer[]): string {
  const next = customers.length + 1;
  return `C${next.toString().padStart(4, "0")}`;
}