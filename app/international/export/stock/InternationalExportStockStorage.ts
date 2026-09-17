import { ExportPurchase } from "../purchase/ExportPurchaseTypes";
import { loadExportPurchases } from "../purchase/ExportPurchaseStorage";
import { InternationalExportStock } from "./InternationalExportStockTypes";

const STORAGE_KEY = "uk-exim-international-export-stock";

export function loadInternationalExportStock(): InternationalExportStock[] {
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

export function saveInternationalExportStock(
  stock: InternationalExportStock[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

export function getInternationalExportStockById(
  id: string
): InternationalExportStock | undefined {
  return loadInternationalExportStock().find(
    (item) => item.id === id
  );
}

export function getInternationalExportStockByProductCode(
  productCode: string
): InternationalExportStock[] {
  return loadInternationalExportStock().filter(
    (item) => item.productCode === productCode
  );
}

/**
 * Rebuild International Export Stock from Export Purchase transactions.
 *
 * IMPORTANT:
 * - This function touches only uk-exim-international-export-stock.
 * - Domestic Stock (uk-exim-stock) is never read or written here.
 * - Opening Stock records are preserved.
 * - Purchase-derived stock is rebuilt from the supplied purchase list.
 */
export function rebuildInternationalExportStockFromPurchases(
  purchases: ExportPurchase[] = loadExportPurchases()
): InternationalExportStock[] {
  if (typeof window === "undefined") return [];

  const existing = loadInternationalExportStock();

  const openingStock = existing.filter(
    (item) => item.source !== "Purchase"
  );

  const purchaseStockMap = new Map<
    string,
    {
      productCode: string;
      productName: string;
      lotBatchNo: string;
      qty: number;
      unit: string;
      purchaseReference: string;
    }
  >();

  for (const purchase of purchases) {
    if (purchase.status === "Cancelled") continue;

    for (const item of purchase.items || []) {
      const qty = Number(item.qty || 0);
      if (!item.productCode || !item.lotBatchNo || qty <= 0) continue;

      const lotBatchNo = item.lotBatchNo.trim();
      const key = `${purchase.purchaseNo}__${item.productCode}__${lotBatchNo}`.toUpperCase();

      const current = purchaseStockMap.get(key);

      if (current) {
        current.qty += qty;
      } else {
        purchaseStockMap.set(key, {
          productCode: item.productCode,
          productName: item.productName,
          lotBatchNo,
          qty,
          unit: item.unit || "KG",
          purchaseReference: purchase.purchaseNo,
        });
      }
    }
  }

  const purchaseStock: InternationalExportStock[] = [];

  for (const entry of purchaseStockMap.values()) {
    const existingPurchaseRecord = existing.find(
      (item) =>
        item.source === "Purchase" &&
        item.purchaseReference === entry.purchaseReference &&
        item.productCode === entry.productCode &&
        item.lotBatchNo === entry.lotBatchNo
    );

    const now = new Date().toISOString();

    purchaseStock.push({
      id:
        existingPurchaseRecord?.id ||
        crypto.randomUUID(),
      productCode: entry.productCode,
      productName: entry.productName,
      lotBatchNo: entry.lotBatchNo,
      availableQty: entry.qty,
      reservedQty: existingPurchaseRecord?.reservedQty || 0,
      packedQty: existingPurchaseRecord?.packedQty || 0,
      loadedQty: existingPurchaseRecord?.loadedQty || 0,
      shippedQty: existingPurchaseRecord?.shippedQty || 0,
      unit: entry.unit,
      source: "Purchase",
      purchaseReference: entry.purchaseReference,
      createdAt:
        existingPurchaseRecord?.createdAt || now,
      updatedAt: now,
    });
  }

  const rebuilt = [
    ...openingStock,
    ...purchaseStock,
  ];

  saveInternationalExportStock(rebuilt);

  return rebuilt;
}
