import { Purchase } from "./PurchaseTypes";

const STORAGE_KEY = "uk-exim-purchases";

export function loadPurchases(): Purchase[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  return JSON.parse(data);
}

export function savePurchases(
  purchases: Purchase[]
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(purchases)
  );
}

export function addPurchase(
  purchase: Purchase
): void {
  const purchases = loadPurchases();

  purchases.push(purchase);

  savePurchases(purchases);
}

export function deletePurchase(
  id: string
): void {
  const purchases = loadPurchases().filter(
    (purchase) => purchase.id !== id
  );

  savePurchases(purchases);
}

export function updatePurchase(
  updatedPurchase: Purchase
): void {
  const purchases = loadPurchases().map((purchase) =>
    purchase.id === updatedPurchase.id
      ? updatedPurchase
      : purchase
  );

  savePurchases(purchases);
}

export function getNextPurchaseNo(): string {
  const purchases = loadPurchases();

  const next = purchases.length + 1;

  return `PUR-${next
    .toString()
    .padStart(4, "0")}`;
}