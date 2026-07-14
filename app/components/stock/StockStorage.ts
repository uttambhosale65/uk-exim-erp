import { Stock } from "./StockTypes";

const STORAGE_KEY = "uk-exim-stock";

export function loadStock(): Stock[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveStock(stock: Stock[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

export function getNextStockId(stock: Stock[]): string {
  const next = stock.length + 1;
  return "STK" + next.toString().padStart(4, "0");
}