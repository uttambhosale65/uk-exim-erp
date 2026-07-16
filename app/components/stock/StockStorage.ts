import { Stock } from "./StockTypes";

const STORAGE_KEY = "uk-exim-stock";

export function loadStock(): Stock[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStock(stock: Stock[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(stock)
  );
}

export function getNextStockId(stock: Stock[]): string {
  if (stock.length === 0) return "STK0001";

  const max = Math.max(
    ...stock.map((s) =>
      Number(s.id.replace("STK", ""))
    )
  );

  return `STK${String(max + 1).padStart(4, "0")}`;
}

export function updateStock(
  productCode: string,
  productName: string,
  hsn: string,
  unit: string,
  qty: number
) {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) => item.productCode === productCode
  );

  if (index >= 0) {
    stock[index].purchaseQty += qty;
    stock[index].currentStock += qty;
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
) {
  const stock = loadStock();

  const index = stock.findIndex(
    (item) => item.productCode === productCode
  );

  if (index >= 0) {
    stock[index].salesQty += qty;
    stock[index].currentStock -= qty;

    if (stock[index].currentStock < 0) {
      stock[index].currentStock = 0;
    }

    saveStock(stock);
  }
}