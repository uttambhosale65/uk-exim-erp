import { ExportOrder } from "./ExportOrderTypes";

const STORAGE_KEY = "uk-exim-export-orders";

export function loadExportOrders(): ExportOrder[] {
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

export function saveExportOrders(
  orders: ExportOrder[]
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(orders)
  );
}

export function getNextExportOrderNo(
  orders: ExportOrder[]
): string {
  if (orders.length === 0) {
    return "EXP-ORD-0001";
  }

  const maxNumber = Math.max(
    ...orders.map((order) => {
      const match = order.exportOrderNo.match(
        /EXP-ORD-(\d+)/
      );

      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-ORD-${String(maxNumber + 1).padStart(
    4,
    "0"
  )}`;
}

export function getExportOrderById(
  id: string
): ExportOrder | undefined {
  const orders = loadExportOrders();

  return orders.find(
    (order) => order.id === id
  );
}

export function getExportOrderByNo(
  exportOrderNo: string
): ExportOrder | undefined {
  const orders = loadExportOrders();

  return orders.find(
    (order) =>
      order.exportOrderNo === exportOrderNo
  );
}