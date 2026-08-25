import { Stock } from "./StockTypes";

const STORAGE_KEY = "uk-exim-stock";

/* =========================
   LOAD STOCK
========================= */

export function loadStock(): Stock[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);

    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading stock:", error);
    return [];
  }
}

/* =========================
   SAVE STOCK
========================= */

export function saveStock(stock: Stock[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stock)
    );
  } catch (error) {
    console.error("Error saving stock:", error);
  }
}

/* =========================
   NEXT STOCK ID
========================= */

export function getNextStockId(
  stock: Stock[]
): string {
  if (stock.length === 0) {
    return "STK0001";
  }

  const maxId = Math.max(
    ...stock.map((item) => {
      const number = Number(
        item.id.replace("STK", "")
      );

      return isNaN(number) ? 0 : number;
    })
  );

  return `STK${String(
    maxId + 1
  ).padStart(4, "0")}`;
}

/* =========================
   PURCHASE → STOCK
========================= */

export function updateStock(
  productCode: string,
  productName: string,
  hsn: string,
  unit: string,
  qty: number
): void {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) =>
      item.productCode === productCode
  );

  if (index >= 0) {
    stock[index].purchaseQty += qty;

    stock[index].currentStock =
      Number(stock[index].openingStock || 0) +
      Number(stock[index].purchaseQty || 0) -
      Number(stock[index].salesQty || 0);

    saveStock(stock);
    return;
  }

  stock.push({
    id: getNextStockId(stock),
    productCode,
    productName,
    hsn,
    unit,
    openingStock: 0,
    purchaseQty: qty,
    salesQty: 0,
    currentStock: qty,
  });

  saveStock(stock);
}

/* =========================
   DELETE PURCHASE
   → REVERSE STOCK
========================= */

export function reversePurchaseStock(
  productCode: string,
  qty: number
): void {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) =>
      item.productCode === productCode
  );

  if (index === -1) return;

  stock[index].purchaseQty =
    Math.max(
      0,
      Number(stock[index].purchaseQty || 0) -
        Number(qty || 0)
    );

  stock[index].currentStock =
    Math.max(
      0,
      Number(stock[index].openingStock || 0) +
        Number(stock[index].purchaseQty || 0) -
        Number(stock[index].salesQty || 0)
    );

  saveStock(stock);
}

/* =========================
   SALES → STOCK
========================= */

export function reduceStock(
  productCode: string,
  qty: number
): void {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) =>
      item.productCode === productCode
  );

  if (index === -1) return;

  stock[index].salesQty =
    Number(stock[index].salesQty || 0) +
    Number(qty || 0);

  stock[index].currentStock =
    Number(stock[index].openingStock || 0) +
    Number(stock[index].purchaseQty || 0) -
    Number(stock[index].salesQty || 0);

  if (stock[index].currentStock < 0) {
    stock[index].currentStock = 0;
  }

  saveStock(stock);
}

/* =========================
   DELETE STOCK BY ID
========================= */

export function deleteStock(
  id: string
): Stock[] {
  const updatedStock =
    loadStock().filter(
      (item) => item.id !== id
    );

  saveStock(updatedStock);

  return updatedStock;
}

/* =========================
   DELETE STOCK BY PRODUCT CODE
   PRODUCT DELETE → STOCK DELETE
========================= */

export function deleteStockByProductCode(
  productCode: string
): void {
  const stock = loadStock();

  const updatedStock =
    stock.filter(
      (item) =>
        item.productCode !== productCode
    );

  saveStock(updatedStock);
}

/* =========================
   FIND STOCK
========================= */

export function findStockById(
  id: string
): Stock | undefined {
  return loadStock().find(
    (item) => item.id === id
  );
}

/* =========================
   CURRENT STOCK
========================= */

export function getCurrentStock(
  productCode: string
): number {
  const stock = loadStock();

  const item = stock.find(
    (s) =>
      s.productCode === productCode
  );

  return item
    ? Number(item.currentStock || 0)
    : 0;
}

/* =========================
   RESET STOCK
========================= */

export function resetStock(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error(
      "Error resetting stock:",
      error
    );
  }
}

/* =========================
   PRODUCT MASTER → STOCK
   OPENING STOCK SYNC
========================= */

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
  const stock = loadStock();

  const index = stock.findIndex(
    (item) =>
      item.productCode === product.code
  );

  /* =========================
     PRODUCT ALREADY EXISTS
     UPDATE PRODUCT DETAILS
     + OPENING STOCK
  ========================= */

  if (index >= 0) {
    stock[index].productName =
      product.name;

    stock[index].hsn =
      product.hsn;

    stock[index].unit =
      product.unit;

    /*
      Product Master Opening Stock
      becomes Stock Master Opening Stock.
    */

    stock[index].openingStock =
      Number(product.stock) || 0;

    /*
      IMPORTANT:
      Current Stock is always:

      Opening
      + Purchase
      - Sales
    */

    stock[index].currentStock =
      Math.max(
        0,
        Number(stock[index].openingStock || 0) +
          Number(stock[index].purchaseQty || 0) -
          Number(stock[index].salesQty || 0)
      );

    saveStock(stock);

    return;
  }

  /* =========================
     NEW PRODUCT
  ========================= */

  const opening =
    Number(product.stock) || 0;

  stock.push({
    id: getNextStockId(stock),

    productCode: product.code,

    productName: product.name,

    hsn: product.hsn,

    unit: product.unit,

    openingStock: opening,

    purchaseQty: 0,

    salesQty: 0,

    currentStock: opening,
  });

  saveStock(stock);
}