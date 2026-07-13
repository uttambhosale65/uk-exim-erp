import { Supplier } from "./SupplierTypes";

const STORAGE_KEY = "uk-exim-suppliers";

export function loadSuppliers(): Supplier[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSuppliers(suppliers: Supplier[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

export function getNextSupplierCode(suppliers: Supplier[]): string {
  if (suppliers.length === 0) return "SUP0001";

  const max = Math.max(
    ...suppliers.map((s) => Number(s.code.replace("SUP", "")))
  );

  return `SUP${String(max + 1).padStart(4, "0")}`;
}