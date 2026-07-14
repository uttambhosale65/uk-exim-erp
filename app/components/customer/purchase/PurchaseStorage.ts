import { Purchase } from "./PurchaseTypes";

const STORAGE_KEY = "uk-exim-purchases";

export function loadPurchases(): Purchase[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function savePurchases(
  purchases: Purchase[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(purchases)
  );
}

export function getNextPurchaseNo(
  purchases: Purchase[]
) {
  if (purchases.length === 0) {
    return "PUR-0001";
  }

  const last = purchases[purchases.length - 1];

  const number =
    parseInt(last.purchaseNo.replace("PUR-", "")) + 1;

  return `PUR-${number
    .toString()
    .padStart(4, "0")}`;
}

export function clearPurchases() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
}