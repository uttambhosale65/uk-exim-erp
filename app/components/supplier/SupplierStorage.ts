import { Supplier } from "./SupplierTypes";

const STORAGE_KEY = "uk-exim-suppliers";

export function loadSuppliers(): Supplier[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data) as Supplier[];
  } catch {
    return [];
  }
}

export function saveSuppliers(suppliers: Supplier[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(suppliers)
  );
}

export function getNextSupplierCode(
  suppliers: Supplier[]
): string {
  if (suppliers.length === 0) {
    return "SUP0001";
  }

  const max = Math.max(
    ...suppliers.map((supplier) => {
      const number = Number(
        supplier.code.replace("SUP", "")
      );

      return isNaN(number) ? 0 : number;
    })
  );

  return `SUP${String(max + 1).padStart(4, "0")}`;
}