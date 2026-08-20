import {
  Purchase,
  PurchaseItem,
} from "./PurchaseTypes";

const STORAGE_KEY = "uk-exim-purchases";

/* =========================================================
   NORMALIZE PURCHASE
   Old Single Product data → New Multi Product structure

   यामुळे आधीचे GRN data शक्य तितके सुरक्षित राहतील.
========================================================= */

function normalizePurchase(
  purchase: any
): Purchase {
  /* -------------------------------------------------------
     Already New Multi Product Structure
  ------------------------------------------------------- */

  if (
    Array.isArray(purchase.items) &&
    purchase.items.length > 0
  ) {
    const items: PurchaseItem[] =
      purchase.items.map(
        (item: PurchaseItem) => ({
          productCode:
            item.productCode ?? "",

          productName:
            item.productName ?? "",

          hsn:
            item.hsn ?? "",

          unit:
            item.unit ?? "KG",

          qty:
            Number(item.qty) || 0,

          rate:
            Number(item.rate) || 0,

          amount:
            Number(item.amount) || 0,

          gst:
            Number(item.gst) || 0,

          gstAmount:
            Number(item.gstAmount) || 0,

          netAmount:
            Number(item.netAmount) || 0,
        })
      );

    return {
      id:
        purchase.id ??
        crypto.randomUUID(),

      purchaseNo:
        purchase.purchaseNo ?? "",

      purchaseDate:
        purchase.purchaseDate ?? "",

      invoiceNo:
        purchase.invoiceNo ?? "",

      supplierCode:
        purchase.supplierCode ?? "",

      supplierName:
        purchase.supplierName ?? "",

      items,

      totalQty:
        Number(
          purchase.totalQty ??
          items.reduce(
            (total, item) =>
              total + item.qty,
            0
          )
        ) || 0,

      totalAmount:
        Number(
          purchase.totalAmount ??
          items.reduce(
            (total, item) =>
              total + item.amount,
            0
          )
        ) || 0,

      totalGstAmount:
        Number(
          purchase.totalGstAmount ??
          items.reduce(
            (total, item) =>
              total + item.gstAmount,
            0
          )
        ) || 0,

      totalNetAmount:
        Number(
          purchase.totalNetAmount ??
          items.reduce(
            (total, item) =>
              total + item.netAmount,
            0
          )
        ) || 0,

      remarks:
        purchase.remarks ?? "",
    };
  }

  /* -------------------------------------------------------
     OLD Single Product Structure
     Convert old record into one-item GRN
  ------------------------------------------------------- */

  const oldItem: PurchaseItem = {
    productCode:
      purchase.productCode ?? "",

    productName:
      purchase.productName ?? "",

    hsn:
      purchase.hsn ?? "",

    unit:
      purchase.unit ?? "KG",

    qty:
      Number(purchase.qty) || 0,

    rate:
      Number(purchase.rate) || 0,

    amount:
      Number(purchase.amount) || 0,

    gst:
      Number(purchase.gst) || 0,

    gstAmount:
      Number(purchase.gstAmount) || 0,

    netAmount:
      Number(purchase.netAmount) || 0,
  };

  return {
    id:
      purchase.id ??
      crypto.randomUUID(),

    purchaseNo:
      purchase.purchaseNo ?? "",

    purchaseDate:
      purchase.purchaseDate ?? "",

    invoiceNo:
      purchase.invoiceNo ?? "",

    supplierCode:
      purchase.supplierCode ?? "",

    supplierName:
      purchase.supplierName ?? "",

    items:
      oldItem.productCode ||
      oldItem.productName
        ? [oldItem]
        : [],

    totalQty:
      oldItem.qty,

    totalAmount:
      oldItem.amount,

    totalGstAmount:
      oldItem.gstAmount,

    totalNetAmount:
      oldItem.netAmount,

    remarks:
      purchase.remarks ?? "",
  };
}

/* =========================================================
   LOAD PURCHASES
========================================================= */

export function loadPurchases(): Purchase[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  const data =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(
      normalizePurchase
    );
  } catch (error) {
    console.error(
      "Failed to load purchases:",
      error
    );

    return [];
  }
}

/* =========================================================
   SAVE PURCHASES
========================================================= */

export function savePurchases(
  purchases: Purchase[]
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(purchases)
  );
}

/* =========================================================
   ADD PURCHASE
========================================================= */

export function addPurchase(
  purchase: Purchase
): void {
  const purchases =
    loadPurchases();

  purchases.push(
    normalizePurchase(purchase)
  );

  savePurchases(purchases);
}

/* =========================================================
   UPDATE PURCHASE
========================================================= */

export function updatePurchase(
  updatedPurchase: Purchase
): void {
  const purchases =
    loadPurchases().map(
      (purchase) =>
        purchase.id ===
        updatedPurchase.id
          ? normalizePurchase(
              updatedPurchase
            )
          : purchase
    );

  savePurchases(purchases);
}

/* =========================================================
   DELETE PURCHASE
========================================================= */

export function deletePurchase(
  id: string
): void {
  const purchases =
    loadPurchases().filter(
      (purchase) =>
        purchase.id !== id
    );

  savePurchases(purchases);
}

/* =========================================================
   CLEAR ALL PURCHASES
========================================================= */

export function clearPurchases(): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );
}

/* =========================================================
   GET NEXT GRN NUMBER

   Example:
   GRN-0001
   GRN-0002
   GRN-0003

   Delete केल्यानंतर duplicate number होणार नाही.
========================================================= */

export function getNextPurchaseNo(
  purchases: Purchase[]
): string {
  let maxNumber = 0;

  purchases.forEach(
    (purchase) => {
      const match =
        purchase.purchaseNo?.match(
          /GRN-(\d+)/
        );

      if (match) {
        const number =
          Number(match[1]);

        if (
          Number.isFinite(number) &&
          number > maxNumber
        ) {
          maxNumber = number;
        }
      }
    }
  );

  const next =
    maxNumber + 1;

  return `GRN-${next
    .toString()
    .padStart(4, "0")}`;
}