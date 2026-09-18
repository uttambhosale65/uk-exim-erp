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
 * - Purchase-derived stock is rebuilt from RECEIVED quantities only.
 *
 * Stock rules:
 * - Draft              -> 0 stock
 * - Partially Received -> receivedQty stock
 * - Received           -> qty / receivedQty stock
 * - Cancelled          -> 0 stock
 */
export function rebuildInternationalExportStockFromPurchases(
  purchases: ExportPurchase[] = loadExportPurchases()
): InternationalExportStock[] {
  if (typeof window === "undefined") return [];

  const existing = loadInternationalExportStock();

  // Preserve manually entered Opening Stock records.
  const openingStock = existing.filter(
    (item) => item.source !== "Purchase"
  );

  const purchaseStockMap = new Map<
    string,
    {
      productCode: string;
      productName: string;
      lotBatchNo: string;
      receivedQty: number;
      unit: string;
      purchaseReference: string;
    }
  >();

  for (const purchase of purchases) {
    // Cancelled Purchase must never contribute stock.
    if (purchase.status === "Cancelled") continue;

    for (const item of purchase.items || []) {
      const qty = Number(item.qty || 0);

      // New field introduced in ExportPurchaseItem.
      const rawReceivedQty = Number(item.receivedQty || 0);

      /*
       * Safety normalization:
       * receivedQty can never be negative
       * and can never exceed ordered qty.
       */
      const receivedQty = Math.min(
        Math.max(rawReceivedQty, 0),
        Math.max(qty, 0)
      );

      if (
        !item.productCode ||
        !item.lotBatchNo ||
        qty <= 0 ||
        receivedQty <= 0
      ) {
        continue;
      }

      const lotBatchNo = item.lotBatchNo.trim();

      const key =
        `${purchase.purchaseNo}__${item.productCode}__${lotBatchNo}`.toUpperCase();

      const current = purchaseStockMap.get(key);

      if (current) {
        current.receivedQty += receivedQty;
      } else {
        purchaseStockMap.set(key, {
          productCode: item.productCode,
          productName: item.productName,
          lotBatchNo,
          receivedQty,
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

    /*
     * Do not allow reserved/packed/loaded/shipped quantities
     * to exceed the newly received stock.
     *
     * This protects stock integrity when a Purchase is edited
     * and receivedQty is reduced.
     */
    const availableQty = entry.receivedQty;

    const previousReserved = Number(
      existingPurchaseRecord?.reservedQty || 0
    );

    const previousPacked = Number(
      existingPurchaseRecord?.packedQty || 0
    );

    const previousLoaded = Number(
      existingPurchaseRecord?.loadedQty || 0
    );

    const previousShipped = Number(
      existingPurchaseRecord?.shippedQty || 0
    );

    const shippedQty = Math.min(
      Math.max(previousShipped, 0),
      availableQty
    );

    const loadedQty = Math.min(
      Math.max(previousLoaded, shippedQty),
      availableQty
    );

    const packedQty = Math.min(
      Math.max(previousPacked, loadedQty),
      availableQty
    );

    const reservedQty = Math.min(
      Math.max(previousReserved, 0),
      Math.max(availableQty - packedQty, 0)
    );

    purchaseStock.push({
      id:
        existingPurchaseRecord?.id ||
        crypto.randomUUID(),

      productCode: entry.productCode,
      productName: entry.productName,
      lotBatchNo: entry.lotBatchNo,

      availableQty,

      reservedQty,
      packedQty,
      loadedQty,
      shippedQty,

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