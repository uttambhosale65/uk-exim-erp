import { Stock } from "./StockTypes";

const STORAGE_KEY = "uk-exim-stock";

/* =========================================================
   LOAD STOCK
========================================================= */

export function loadStock(): Stock[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data =
      localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error(
      "Error loading stock:",
      error
    );

    return [];
  }
}

/* =========================================================
   SAVE STOCK
========================================================= */

export function saveStock(
  stock: Stock[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stock)
    );
  } catch (error) {
    console.error(
      "Error saving stock:",
      error
    );
  }
}

/* =========================================================
   NEXT STOCK ID
========================================================= */

export function getNextStockId(
  stock: Stock[]
): string {
  if (
    !Array.isArray(stock) ||
    stock.length === 0
  ) {
    return "STK0001";
  }

  let maxNumber = 0;

  stock.forEach((item) => {
    const match =
      String(item?.id || "").match(
        /^STK(\d+)$/
      );

    if (!match) {
      return;
    }

    const number =
      Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > maxNumber
    ) {
      maxNumber = number;
    }
  });

  return `STK${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

/* =========================================================
   RECALCULATE CURRENT STOCK
=========================================================

   Current Stock =
   Opening Stock
   + Purchase Qty
   - Sales Qty

   IMPORTANT:
   We do NOT hide negative values here.

   Negative stock should be visible so that
   incorrect/missing purchase entries can be identified.
========================================================= */

function calculateCurrentStock(
  item: Stock
): number {
  return (
    Number(item.openingStock || 0) +
    Number(item.purchaseQty || 0) -
    Number(item.salesQty || 0)
  );
}

/* =========================================================
   PURCHASE → STOCK
========================================================= */

export function updateStock(
  productCode: string,
  productName: string,
  hsn: string,
  unit: string,
  qty: number
): void {
  if (!productCode) {
    return;
  }

  const purchaseQty =
    Number(qty) || 0;

  if (purchaseQty <= 0) {
    return;
  }

  const stock =
    loadStock();

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        productCode
    );

  /* -------------------------------------------------------
     EXISTING PRODUCT
  ------------------------------------------------------- */

  if (index >= 0) {
    stock[index].productName =
      productName;

    stock[index].hsn =
      hsn;

    stock[index].unit =
      unit;

    stock[index].purchaseQty =
      Number(
        stock[index].purchaseQty || 0
      ) + purchaseQty;

    stock[index].currentStock =
      calculateCurrentStock(
        stock[index]
      );

    saveStock(stock);

    return;
  }

  /* -------------------------------------------------------
     NEW PRODUCT

     If product does not yet exist in Stock,
     create it with Opening Stock = 0.
  ------------------------------------------------------- */

  const newStock: Stock = {
    id:
      getNextStockId(stock),

    productCode,

    productName,

    hsn,

    unit,

    openingStock: 0,

    purchaseQty,

    salesQty: 0,

    currentStock:
      purchaseQty,
  };

  stock.push(newStock);

  saveStock(stock);
}

/* =========================================================
   DELETE PURCHASE
   → REVERSE STOCK
========================================================= */

export function reversePurchaseStock(
  productCode: string,
  qty: number
): void {
  const stock =
    loadStock();

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        productCode
    );

  if (index === -1) {
    return;
  }

  const reverseQty =
    Number(qty) || 0;

  if (reverseQty <= 0) {
    return;
  }

  stock[index].purchaseQty =
    Math.max(
      0,
      Number(
        stock[index].purchaseQty || 0
      ) - reverseQty
    );

  stock[index].currentStock =
    calculateCurrentStock(
      stock[index]
    );

  saveStock(stock);
}

/* =========================================================
   SALES → STOCK
========================================================= */

export function reduceStock(
  productCode: string,
  qty: number
): void {
  const stock =
    loadStock();

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        productCode
    );

  if (index === -1) {
    return;
  }

  const salesQty =
    Number(qty) || 0;

  if (salesQty <= 0) {
    return;
  }

  stock[index].salesQty =
    Number(
      stock[index].salesQty || 0
    ) + salesQty;

  /*
    IMPORTANT:
    Do not force negative stock to zero.

    If Sales > available Stock,
    ERP should show the real negative balance.
    This helps identify missing purchase entries.
  */

  stock[index].currentStock =
    calculateCurrentStock(
      stock[index]
    );

  saveStock(stock);
}

/* =========================================================
   DELETE STOCK BY ID
========================================================= */

export function deleteStock(
  id: string
): Stock[] {
  const updatedStock =
    loadStock().filter(
      (item) =>
        item.id !== id
    );

  saveStock(
    updatedStock
  );

  return updatedStock;
}

/* =========================================================
   DELETE STOCK BY PRODUCT CODE

   PRODUCT DELETE → STOCK DELETE
========================================================= */

export function deleteStockByProductCode(
  productCode: string
): void {
  const stock =
    loadStock();

  const updatedStock =
    stock.filter(
      (item) =>
        item.productCode !==
        productCode
    );

  saveStock(
    updatedStock
  );
}

/* =========================================================
   FIND STOCK
========================================================= */

export function findStockById(
  id: string
): Stock | undefined {
  return loadStock().find(
    (item) =>
      item.id === id
  );
}

/* =========================================================
   CURRENT STOCK
========================================================= */

export function getCurrentStock(
  productCode: string
): number {
  const stock =
    loadStock();

  const item =
    stock.find(
      (s) =>
        s.productCode ===
        productCode
    );

  return item
    ? Number(
        item.currentStock || 0
      )
    : 0;
}

/* =========================================================
   SET OPENING / CUT-OFF STOCK

   This is the IMPORTANT new function.

   Use this only when intentionally setting
   the opening stock / cut-off balance.

   Example:

   Current physical stock on ERP start date:
   P0001 = 5
   P0002 = 100
   P0003 = 20

   These become the Opening Stock.
========================================================= */

export function setOpeningStock(
  productCode: string,
  openingStock: number
): void {
  if (!productCode) {
    return;
  }

  const stock =
    loadStock();

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        productCode
    );

  if (index === -1) {
    return;
  }

  const opening =
    Number(openingStock);

  stock[index].openingStock =
    Number.isFinite(opening)
      ? opening
      : 0;

  stock[index].currentStock =
    calculateCurrentStock(
      stock[index]
    );

  saveStock(stock);
}

/* =========================================================
   SET COMPLETE OPENING STOCK

   Useful for first ERP setup / cut-off.

   Does NOT change:
   Purchase Qty
   Sales Qty

   Only changes Opening Stock.
========================================================= */

export function setOpeningStockBulk(
  openingStockMap: Record<
    string,
    number
  >
): void {
  const stock =
    loadStock();

  stock.forEach(
    (item) => {
      if (
        Object.prototype.hasOwnProperty.call(
          openingStockMap,
          item.productCode
        )
      ) {
        const value =
          Number(
            openingStockMap[
              item.productCode
            ]
          );

        item.openingStock =
          Number.isFinite(value)
            ? value
            : 0;

        item.currentStock =
          calculateCurrentStock(
            item
          );
      }
    }
  );

  saveStock(stock);
}

/* =========================================================
   RESET STOCK
========================================================= */

export function resetStock(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(
      STORAGE_KEY
    );
  } catch (error) {
    console.error(
      "Error resetting stock:",
      error
    );
  }
}

/* =========================================================
   PRODUCT MASTER → STOCK
   OPENING STOCK SYNC
=========================================================

   IMPORTANT NEW LOGIC:

   NEW PRODUCT:
   Product Master stock becomes Opening Stock.

   EXISTING PRODUCT:
   Product Master stock does NOT overwrite
   the existing Opening Stock.

   This prevents accidental changes to
   historical / cut-off stock.

   Product details are still synchronized:
   Name
   HSN
   Unit
========================================================= */

export function syncProductToStock(
  product: {
    id: string;
    code: string;
    name: string;
    hsn: string;
    unit: string;
    stock: number;
  }
): void {
  if (!product?.code) {
    return;
  }

  const stock =
    loadStock();

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        product.code
    );

  /* =======================================================
     EXISTING PRODUCT

     IMPORTANT:
     DO NOT overwrite Opening Stock.

     Opening Stock is now a controlled
     Stock Master / Cut-off value.
  ======================================================= */

  if (index >= 0) {
    stock[index].productName =
      product.name;

    stock[index].hsn =
      product.hsn;

    stock[index].unit =
      product.unit;

    /*
      Existing openingStock is intentionally preserved.
    */

    stock[index].currentStock =
      calculateCurrentStock(
        stock[index]
      );

    saveStock(stock);

    return;
  }

  /* =======================================================
     NEW PRODUCT

     Product Master stock becomes initial
     Opening Stock.
  ======================================================= */

  const opening =
    Number(product.stock) || 0;

  const newStock: Stock = {
    id:
      getNextStockId(stock),

    productCode:
      product.code,

    productName:
      product.name,

    hsn:
      product.hsn,

    unit:
      product.unit,

    openingStock:
      opening,

    purchaseQty: 0,

    salesQty: 0,

    currentStock:
      opening,
  };

  stock.push(
    newStock
  );

  saveStock(stock);
}

/* =========================================================
   REBUILD CURRENT STOCK

   Useful after correcting data.

   Does NOT change Opening / Purchase / Sales.

   Only recalculates Current Stock.
========================================================= */

export function recalculateAllStock(): Stock[] {
  const stock =
    loadStock();

  stock.forEach(
    (item) => {
      item.currentStock =
        calculateCurrentStock(
          item
        );
    }
  );

  saveStock(stock);

  return stock;
}

/* =========================================================
   GET STOCK SUMMARY
========================================================= */

export function getStockSummary(): {
  totalOpening: number;
  totalPurchase: number;
  totalSales: number;
  totalCurrent: number;
} {
  const stock =
    loadStock();

  return {
    totalOpening:
      stock.reduce(
        (total, item) =>
          total +
          Number(
            item.openingStock || 0
          ),
        0
      ),

    totalPurchase:
      stock.reduce(
        (total, item) =>
          total +
          Number(
            item.purchaseQty || 0
          ),
        0
      ),

    totalSales:
      stock.reduce(
        (total, item) =>
          total +
          Number(
            item.salesQty || 0
          ),
        0
      ),

    totalCurrent:
      stock.reduce(
        (total, item) =>
          total +
          Number(
            item.currentStock || 0
          ),
        0
      ),
  };
}