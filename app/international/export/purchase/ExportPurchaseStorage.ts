import { ExportPurchase } from "./ExportPurchaseTypes";

const STORAGE_KEY = "uk-exim-export-purchases";

export function loadExportPurchases(): ExportPurchase[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];

  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExportPurchases(purchases: ExportPurchase[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

export function getNextExportPurchaseNo(
  purchases: ExportPurchase[]
): string {
  if (purchases.length === 0) return "EXP-PUR-0001";

  const maxNumber = Math.max(
    ...purchases.map((purchase) => {
      const match = purchase.purchaseNo.match(/EXP-PUR-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-PUR-${String(maxNumber + 1).padStart(4, "0")}`;
}

export function getExportPurchaseById(
  id: string
): ExportPurchase | undefined {
  return loadExportPurchases().find(
    (purchase) => purchase.id === id
  );
}

export function getExportPurchaseByNo(
  purchaseNo: string
): ExportPurchase | undefined {
  return loadExportPurchases().find(
    (purchase) => purchase.purchaseNo === purchaseNo
  );
}
