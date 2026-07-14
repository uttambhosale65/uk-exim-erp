import { Purchase } from "./PurchaseTypes";

const STORAGE_KEY = "uk-exim-purchases";

export function loadPurchases(): Purchase[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePurchases(purchases: Purchase[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

export function getNextPurchaseNo(purchases: Purchase[]): string {
  const next = purchases.length + 1;
  return "PUR" + next.toString().padStart(4, "0");
}