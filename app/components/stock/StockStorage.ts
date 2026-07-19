import { Stock } from "./StockTypes";

const STORAGE_KEY = "uk-exim-stock";

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

export function saveStock(stock: Stock[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
  } catch (error) {
    console.error("Error saving stock:", error);
  }
}

export function getNextStockId(stock: Stock[]): string {
  if (stock.length === 0) return "STK0001";

  const maxId = Math.max(
    ...stock.map((item) => {
      const number = Number(item.id.replace("STK", ""));
      return isNaN(number) ? 0 : number;
    })
  );

  return `STK${String(maxId + 1).padStart(4, "0")}`;
}

export function updateStock(
  productCode: string,
  productName: string,
  hsn: string,
  unit: string,
  qty: number
): void {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) => item.productCode === productCode
  );

  if (index >= 0) {
    stock[index].purchaseQty += qty;
    stock[index].currentStock =
      stock[index].openingStock +
      stock[index].purchaseQty -
      stock[index].salesQty;
  } else {
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
  }

  saveStock(stock);
}

export function reduceStock(
  productCode: string,
  qty: number
): void {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) => item.productCode === productCode
  );

  if (index === -1) return;

  stock[index].salesQty += qty;

  stock[index].currentStock =
    stock[index].openingStock +
    stock[index].purchaseQty -
    stock[index].salesQty;

  if (stock[index].currentStock < 0) {
    stock[index].currentStock = 0;
  }

  saveStock(stock);
}

export function deleteStock(id: string): Stock[] {
  const updatedStock = loadStock().filter(
    (item) => item.id !== id
  );

  saveStock(updatedStock);

  return updatedStock;
}

export function findStockById(
  id: string
): Stock | undefined {
  return loadStock().find(
    (item) => item.id === id
  );
}
export function getCurrentStock(
  productCode: string
): number {
  const stock = loadStock();

  const item = stock.find(
    (s) => s.productCode === productCode
  );

  return item ? item.currentStock : 0;
}