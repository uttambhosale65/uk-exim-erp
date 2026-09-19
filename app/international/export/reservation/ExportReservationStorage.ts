import { ExportReservation } from "./ExportReservationTypes";
import {
  loadInternationalExportStock,
  saveInternationalExportStock,
} from "../stock/InternationalExportStockStorage";

import { InternationalExportStock } from "../stock/InternationalExportStockTypes";

const STORAGE_KEY = "uk-exim-export-reservations";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadExportReservations(): ExportReservation[] {
  if (!isBrowser()) return [];

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];

  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExportReservations(
  reservations: ExportReservation[]
): void {
  if (!isBrowser()) return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(reservations)
  );
}

export function getExportReservationById(
  id: string
): ExportReservation | undefined {
  return loadExportReservations().find(
    (item) => item.id === id
  );
}

export function getExportReservationByNo(
  reservationNo: string
): ExportReservation | undefined {
  return loadExportReservations().find(
    (item) => item.reservationNo === reservationNo
  );
}

export function getNextExportReservationNo(): string {
  const reservations = loadExportReservations();

  let maxNumber = 0;

  for (const reservation of reservations) {
    const match = reservation.reservationNo.match(
      /^EXP-RES-(\d+)$/i
    );

    if (!match) continue;

    const number = Number(match[1]);

    if (Number.isFinite(number)) {
      maxNumber = Math.max(maxNumber, number);
    }
  }

  return `EXP-RES-${String(maxNumber + 1).padStart(4, "0")}`;
}

/**
 * Find the International Export Stock record that will be reserved.
 */
export function getReservableStock(
  productCode: string,
  lotBatchNo: string
): InternationalExportStock | undefined {
  const stock = loadInternationalExportStock();

  return stock.find(
    (item) =>
      item.productCode === productCode &&
      item.lotBatchNo === lotBatchNo
  );
}

/**
 * Calculate the quantity that can currently be reserved.
 *
 * Physical stock is NOT reduced here.
 *
 * Reservable quantity =
 * availableQty - reservedQty - packedQty
 *
 * Loaded and shipped quantities are already downstream
 * workflow quantities and therefore are not added back.
 */
export function getReservableQuantity(
  stock: InternationalExportStock
): number {
  const availableQty = Math.max(
    Number(stock.availableQty || 0),
    0
  );

  const reservedQty = Math.max(
    Number(stock.reservedQty || 0),
    0
  );

  const packedQty = Math.max(
    Number(stock.packedQty || 0),
    0
  );

  return Math.max(
    availableQty - reservedQty - packedQty,
    0
  );
}

/**
 * Reserve stock for an Export Reservation.
 *
 * IMPORTANT:
 * - Domestic Stock is never touched.
 * - Export Purchase is never changed.
 * - availableQty is NOT reduced.
 * - reservedQty is increased only.
 */
export function reserveInternationalExportStock(
  items: ExportReservation["items"]
): void {
  if (!isBrowser()) return;

  const stock = loadInternationalExportStock();

  const updatedStock = stock.map((stockItem) => {
    const reservationItems = items.filter(
      (item) =>
        item.reservedStockId === stockItem.id
    );

    if (reservationItems.length === 0) {
      return stockItem;
    }

    const additionalReserveQty =
      reservationItems.reduce(
        (sum, item) =>
          sum + Math.max(Number(item.reserveQty || 0), 0),
        0
      );

    const reservableQty =
      getReservableQuantity(stockItem);

    if (additionalReserveQty > reservableQty) {
      throw new Error(
        `Insufficient reservable stock for ${stockItem.productName} (${stockItem.lotBatchNo}). Available to reserve: ${reservableQty} ${stockItem.unit}.`
      );
    }

    return {
      ...stockItem,
      reservedQty:
        Number(stockItem.reservedQty || 0) +
        additionalReserveQty,
      updatedAt: new Date().toISOString(),
    };
  });

  saveInternationalExportStock(updatedStock);
}

/**
 * Release previously reserved stock.
 *
 * This is used when a Reservation is cancelled
 * or when an existing Reservation is reduced.
 *
 * availableQty is never changed.
 */
export function releaseInternationalExportStock(
  items: ExportReservation["items"]
): void {
  if (!isBrowser()) return;

  const stock = loadInternationalExportStock();

  const updatedStock = stock.map((stockItem) => {
    const reservationItems = items.filter(
      (item) =>
        item.reservedStockId === stockItem.id
    );

    if (reservationItems.length === 0) {
      return stockItem;
    }

    const releaseQty =
      reservationItems.reduce(
        (sum, item) =>
          sum + Math.max(Number(item.reserveQty || 0), 0),
        0
      );

    const currentReservedQty = Math.max(
      Number(stockItem.reservedQty || 0),
      0
    );

    return {
      ...stockItem,
      reservedQty: Math.max(
        currentReservedQty - releaseQty,
        0
      ),
      updatedAt: new Date().toISOString(),
    };
  });

  saveInternationalExportStock(updatedStock);
}

/**
 * Replace one existing reservation's stock quantities
 * with the new reservation quantities.
 *
 * This performs:
 *
 * Old Reservation release
 *        ↓
 * New Reservation reserve
 *
 * The physical stock quantity remains untouched.
 */
export function replaceInternationalExportReservationStock(
  oldItems: ExportReservation["items"],
  newItems: ExportReservation["items"]
): void {
  if (!isBrowser()) return;

  const stockBeforeRelease =
    loadInternationalExportStock();

  const releasedStock = stockBeforeRelease.map(
    (stockItem) => {
      const oldReservationItems = oldItems.filter(
        (item) =>
          item.reservedStockId === stockItem.id
      );

      if (oldReservationItems.length === 0) {
        return stockItem;
      }

      const releaseQty =
        oldReservationItems.reduce(
          (sum, item) =>
            sum +
            Math.max(
              Number(item.reserveQty || 0),
              0
            ),
          0
        );

      const currentReservedQty = Math.max(
        Number(stockItem.reservedQty || 0),
        0
      );

      return {
        ...stockItem,
        reservedQty: Math.max(
          currentReservedQty - releaseQty,
          0
        ),
        updatedAt: new Date().toISOString(),
      };
    }
  );

  const finalStock = releasedStock.map(
    (stockItem) => {
      const newReservationItems =
        newItems.filter(
          (item) =>
            item.reservedStockId ===
            stockItem.id
        );

      if (newReservationItems.length === 0) {
        return stockItem;
      }

      const additionalReserveQty =
        newReservationItems.reduce(
          (sum, item) =>
            sum +
            Math.max(
              Number(item.reserveQty || 0),
              0
            ),
          0
        );

      const availableToReserve =
        getReservableQuantity(stockItem);

      if (
        additionalReserveQty >
        availableToReserve
      ) {
        throw new Error(
          `Insufficient reservable stock for ${stockItem.productName} (${stockItem.lotBatchNo}). Available to reserve: ${availableToReserve} ${stockItem.unit}.`
        );
      }

      return {
        ...stockItem,
        reservedQty:
          Number(stockItem.reservedQty || 0) +
          additionalReserveQty,
        updatedAt: new Date().toISOString(),
      };
    }
  );

  saveInternationalExportStock(finalStock);
}

/**
 * Release reservation quantities and save the
 * Reservation document as Cancelled.
 */
export function cancelExportReservation(
  reservation: ExportReservation
): ExportReservation {
  if (!isBrowser()) {
    return {
      ...reservation,
      status: "Cancelled",
    };
  }

  releaseInternationalExportStock(
    reservation.items
  );

  const reservations =
    loadExportReservations();

  const updatedReservation: ExportReservation = {
    ...reservation,
    status: "Cancelled",
    updatedAt: new Date().toISOString(),
  };

  const updatedReservations =
    reservations.map((item) =>
      item.id === reservation.id
        ? updatedReservation
        : item
    );

  saveExportReservations(
    updatedReservations
  );

  return updatedReservation;
}