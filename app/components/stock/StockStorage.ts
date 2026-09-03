import { Stock } from "./StockTypes";
import { loadProducts } from "../../product/components/ProductStorage";
import { loadPurchases } from "../customer/purchase/PurchaseStorage";
import { loadSales } from "../customer/sales/SalesStorage";

const STORAGE_KEY = "uk-exim-stock";

/* =========================================================
   RAW LOAD STOCK
   Internal use only.
   Does NOT rebuild.
========================================================= */

function loadStoredStock(): Stock[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error("Error loading stored stock:", error);
    return [];
  }
}

/* =========================================================
   LOAD STOCK
=========================================================

   IMPORTANT:

   Every normal Stock read is reconciled from:

   Opening Stock
   + Purchase / GRN
   - Sales

   This prevents stale uk-exim-stock data from
   becoming the source of truth.
========================================================= */

export function loadStock(): Stock[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return rebuildStockFromTransactions();
  } catch (error) {
    console.error(
      "Error rebuilding stock while loading:",
      error
    );

    /*
      Safety fallback:
      If rebuild fails, return stored stock instead
      of breaking the ERP screen.
    */
    return loadStoredStock();
  }
}

/* =========================================================
   SAVE STOCK
========================================================= */

export function saveStock(stock: Stock[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stock)
    );
  } catch (error) {
    console.error("Error saving stock:", error);
  }
}

/* =========================================================
   NEXT STOCK ID
========================================================= */

export function getNextStockId(
  stock: Stock[]
): string {
  if (!Array.isArray(stock) || stock.length === 0) {
    return "STK0001";
  }

  let maxNumber = 0;

  stock.forEach((item) => {
    const match = String(item?.id || "").match(
      /^STK(\d+)$/
    );

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > maxNumber
    ) {
      maxNumber = number;
    }
  });

  return `STK${String(maxNumber + 1).padStart(4, "0")}`;
}

/* =========================================================
   CURRENT STOCK CALCULATION
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
   PRODUCT LOOKUP
========================================================= */

function getProduct(
  productCode: string
): any | undefined {
  const products = loadProducts();

  return products.find(
    (product) =>
      String(product?.code || "").trim() ===
      String(productCode || "").trim()
  );
}

/* =========================================================
   STOCK BASE PRODUCT
========================================================= */

function getStockTargetCode(
  productCode: string
): string {
  const product = getProduct(productCode);

  if (!product) {
    return String(productCode || "").trim();
  }

  return (
    String(product.stockBaseCode || "").trim() ||
    String(product.code || "").trim()
  );
}

/* =========================================================
   PRODUCT QTY → STOCK QTY
========================================================= */

function getStockQty(
  productCode: string,
  qty: number
): number {
  const product = getProduct(productCode);

  if (!product) {
    return Number(qty) || 0;
  }

  return convertToStockQty(
    Number(qty) || 0,
    product.unit,
    Number(product.netWeight) || 0
  );
}

/* =========================================================
   CONVERT PRODUCT QTY → STOCK BASE QTY

   Pkt:
   Qty × Net Weight(g) ÷ 1000 = KG

   Gram:
   Qty ÷ 1000 = KG

   KG:
   Qty = KG
========================================================= */

export function convertToStockQty(
  qty: number,
  unit: string,
  netWeight: number
): number {
  const quantity = Number(qty) || 0;

  if (quantity <= 0) {
    return 0;
  }

  if (
    unit === "Pkt" &&
    Number(netWeight) > 0
  ) {
    return (
      quantity *
      Number(netWeight)
    ) / 1000;
  }

  if (unit === "Gram") {
    return quantity / 1000;
  }

  return quantity;
}

/* =========================================================
   PURCHASE → STOCK
=========================================================

   PurchaseMaster already saves the GRN transaction.

   Therefore this function does NOT increment stock
   independently anymore.

   It simply rebuilds stock from the saved transactions.

   This prevents double-counting.
========================================================= */

export function updateStock(
  productCode: string,
  productName: string,
  hsn: string,
  unit: string,
  qty: number
): void {
  void productCode;
  void productName;
  void hsn;
  void unit;
  void qty;

  rebuildStockFromTransactions();
}

/* =========================================================
   REVERSE PURCHASE
=========================================================

   Kept for compatibility with existing PurchaseMaster.

   Stock is rebuilt from the current transaction state.

   If the purchase is subsequently deleted,
   the next Stock read will automatically rebuild
   without that purchase.
========================================================= */

export function reversePurchaseStock(
  productCode: string,
  qty: number
): void {
  void productCode;
  void qty;

  rebuildStockFromTransactions();
}

/* =========================================================
   SALES → STOCK
=========================================================

   Kept for compatibility with existing Sales code.

   Stock is transaction-driven, so we rebuild rather than
   manually adding another sales quantity.

   After the Sale record is saved, the next Stock read
   automatically reflects that Sale.
========================================================= */

export function reduceStock(
  productCode: string,
  qty: number
): void {
  void productCode;
  void qty;

  rebuildStockFromTransactions();
}

/* =========================================================
   DELETE STOCK BY ID
========================================================= */

export function deleteStock(
  id: string
): Stock[] {
  const updatedStock =
    loadStoredStock().filter(
      (item) => item.id !== id
    );

  saveStock(updatedStock);

  return updatedStock;
}

/* =========================================================
   DELETE STOCK BY PRODUCT CODE

   Kept for compatibility.

   Product Master should NOT normally call this.

   Historical transaction stock should not be removed
   merely because a Product Master item is deactivated.
========================================================= */

export function deleteStockByProductCode(
  productCode: string
): void {
  const stock = loadStoredStock();

  const updatedStock =
    stock.filter(
      (item) =>
        item.productCode !==
        productCode
    );

  saveStock(updatedStock);
}

/* =========================================================
   FIND STOCK
========================================================= */

export function findStockById(
  id: string
): Stock | undefined {
  return loadStock().find(
    (item) => item.id === id
  );
}

/* =========================================================
   CURRENT STOCK
========================================================= */

export function getCurrentStock(
  productCode: string
): number {
  const stock = loadStock();

  const stockProductCode =
    getStockTargetCode(productCode);

  const item = stock.find(
    (s) =>
      s.productCode ===
      stockProductCode
  );

  return item
    ? Number(item.currentStock || 0)
    : 0;
}

/* =========================================================
   SET OPENING STOCK
========================================================= */

export function setOpeningStock(
  productCode: string,
  openingStock: number
): void {
  if (!productCode) {
    return;
  }

  const stock =
    loadStoredStock();

  const stockProductCode =
    getStockTargetCode(productCode);

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        stockProductCode
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
========================================================= */

export function setOpeningStockBulk(
  openingStockMap: Record<string, number>
): void {
  const stock =
    loadStoredStock();

  stock.forEach((item) => {
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
  });

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
=========================================================

   IMPORTANT:

   Product Master is MASTER DATA only.

   It must NOT create a Stock record.

   This function remains only for compatibility
   with older imports.

   Existing stock metadata may be updated.

   Opening / Purchase / Sales quantities are untouched.
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
    loadStoredStock();

  const stockProductCode =
    getStockTargetCode(product.code);

  const index =
    stock.findIndex(
      (item) =>
        item.productCode ===
        stockProductCode
    );

  /*
    IMPORTANT:
    Product Master must never create stock.
  */
  if (index === -1) {
    return;
  }

  const targetProduct =
    getProduct(stockProductCode);

  stock[index].productName =
    targetProduct?.name ||
    product.name;

  stock[index].hsn =
    targetProduct?.hsn ||
    product.hsn;

  stock[index].unit =
    targetProduct?.unit ||
    product.unit;

  stock[index].currentStock =
    calculateCurrentStock(
      stock[index]
    );

  saveStock(stock);
}

/* =========================================================
   REBUILD STOCK FROM TRANSACTIONS
=========================================================

   SOURCE OF TRUTH:

   Opening Stock
   + Purchase / GRN
   - Sales

   Existing stored Purchase Qty and Sales Qty
   are NOT trusted.

   Only Opening Stock is preserved from existing
   stock records.

   This is what removes stale stock such as the old
   15.73 KG when it is not present in transactions.
========================================================= */

export function rebuildStockFromTransactions(): Stock[] {
  if (typeof window === "undefined") {
    return [];
  }

  const existingStock =
    loadStoredStock();

  /* -------------------------------------------------------
     PRESERVE ONLY OPENING STOCK
  ------------------------------------------------------- */

  const openingMap =
    new Map<string, number>();

  existingStock.forEach((item) => {
    const code =
      String(
        item?.productCode || ""
      ).trim();

    if (!code) {
      return;
    }

    openingMap.set(
      code,
      Number(
        item.openingStock || 0
      )
    );
  });

  /* -------------------------------------------------------
     PURCHASE TOTALS
  ------------------------------------------------------- */

  const purchaseMap =
    new Map<string, number>();

  const purchases =
    loadPurchases();

  purchases.forEach((purchase: any) => {
    const items =
      Array.isArray(purchase?.items)
        ? purchase.items
        : [];

    items.forEach((item: any) => {
      const productCode =
        String(
          item?.productCode || ""
        ).trim();

      if (!productCode) {
        return;
      }

      const qty =
        Number(item?.qty || 0);

      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        return;
      }

      const stockCode =
        getStockTargetCode(
          productCode
        );

      const stockQty =
        getStockQty(
          productCode,
          qty
        );

      if (stockQty <= 0) {
        return;
      }

      purchaseMap.set(
        stockCode,
        (purchaseMap.get(stockCode) || 0) +
          stockQty
      );
    });
  });

  /* -------------------------------------------------------
     SALES TOTALS
  ------------------------------------------------------- */

  const salesMap =
    new Map<string, number>();

  const sales =
    loadSales();

  sales.forEach((sale: any) => {
    const items =
      Array.isArray(sale?.items)
        ? sale.items
        : [];

    items.forEach((item: any) => {
      const productCode =
        String(
          item?.productCode || ""
        ).trim();

      if (!productCode) {
        return;
      }

      const qty =
        Number(item?.qty || 0);

      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        return;
      }

      const stockCode =
        getStockTargetCode(
          productCode
        );

      const stockQty =
        getStockQty(
          productCode,
          qty
        );

      if (stockQty <= 0) {
        return;
      }

      salesMap.set(
        stockCode,
        (salesMap.get(stockCode) || 0) +
          stockQty
      );
    });
  });

  /* -------------------------------------------------------
     BASE PRODUCT MAP
  ------------------------------------------------------- */

  const productMap =
    new Map<string, any>();

  const products =
    loadProducts();

  products.forEach((product: any) => {
    const code =
      String(
        product?.code || ""
      ).trim();

    if (!code) {
      return;
    }

    const stockCode =
      getStockTargetCode(code);

    /*
      Prefer actual base product as Stock product.
    */
    if (
      stockCode === code ||
      !productMap.has(stockCode)
    ) {
      productMap.set(
        stockCode,
        product
      );
    }
  });

  /* -------------------------------------------------------
     ALL REQUIRED STOCK CODES
  ------------------------------------------------------- */

  const stockCodes =
    new Set<string>();

  productMap.forEach(
    (_product, code) => {
      stockCodes.add(code);
    }
  );

  openingMap.forEach(
    (_value, code) => {
      stockCodes.add(code);
    }
  );

  purchaseMap.forEach(
    (_value, code) => {
      stockCodes.add(code);
    }
  );

  salesMap.forEach(
    (_value, code) => {
      stockCodes.add(code);
    }
  );

  /* -------------------------------------------------------
     BUILD FINAL STOCK
  ------------------------------------------------------- */

  const rebuiltStock: Stock[] = [];

  stockCodes.forEach((stockCode) => {
    const product =
      productMap.get(stockCode);

    const oldStock =
      existingStock.find(
        (item) =>
          item.productCode ===
          stockCode
      );

    const opening =
      Number(
        openingMap.get(stockCode) || 0
      );

    const purchaseQty =
      Number(
        purchaseMap.get(stockCode) || 0
      );

    const salesQty =
      Number(
        salesMap.get(stockCode) || 0
      );

    const currentStock =
      opening +
      purchaseQty -
      salesQty;

    const newItem: Stock = {
      id:
        oldStock?.id ||
        getNextStockId(
          rebuiltStock
        ),

      productCode:
        stockCode,

      productName:
        product?.name ||
        oldStock?.productName ||
        stockCode,

      hsn:
        product?.hsn ||
        oldStock?.hsn ||
        "",

      unit:
        product?.unit ||
        oldStock?.unit ||
        "KG",

      openingStock:
        opening,

      purchaseQty:
        purchaseQty,

      salesQty:
        salesQty,

      currentStock:
        currentStock,
    };

    rebuiltStock.push(
      newItem
    );
  });

  /* -------------------------------------------------------
     STABLE PRODUCT CODE ORDER
  ------------------------------------------------------- */

  rebuiltStock.sort(
    (a, b) =>
      String(a.productCode).localeCompare(
        String(b.productCode),
        undefined,
        {
          numeric: true,
        }
      )
  );

  saveStock(
    rebuiltStock
  );

  return rebuiltStock;
}

/* =========================================================
   RECALCULATE CURRENT STOCK
========================================================= */

export function recalculateAllStock(): Stock[] {
  return rebuildStockFromTransactions();
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