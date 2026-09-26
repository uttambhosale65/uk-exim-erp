import { ExportPacking } from "./PackingTypes";

const STORAGE_KEY =
  "uk-exim-export-packings";

const RESERVATION_KEY =
  "uk-exim-export-reservations";

/* =========================================
   SAFE ARRAY LOADER
========================================= */

function loadArray<T>(
  key: string
): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = JSON.parse(
      window.localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value)
      ? value
      : [];
  } catch {
    return [];
  }
}

/* =========================================
   LOAD PACKINGS
========================================= */

export function loadPackings(): ExportPacking[] {
  return loadArray<ExportPacking>(
    STORAGE_KEY
  );
}

/* =========================================
   SAVE PACKINGS
========================================= */

export function savePackings(
  packings: ExportPacking[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(packings)
  );
}

/* =========================================
   NEXT PACKING NUMBER
========================================= */

export function getNextPackingNo(
  packings: ExportPacking[] =
    loadPackings()
): string {
  let maxNumber = 0;

  for (const packing of packings) {
    const match = String(
      packing.packingNo || ""
    ).match(/^EXP-PKG-(\d+)$/);

    if (match) {
      maxNumber = Math.max(
        maxNumber,
        Number(match[1])
      );
    }
  }

  return `EXP-PKG-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

/* =========================================
   GET ALREADY PACKED QTY

   Reservation-wise + Product-wise
========================================= */

export function getPackedQuantity(
  reservationNo: string,
  productCode: string,
  excludePackingId?: string
): number {
  return loadPackings()
    .filter(
      (packing) =>
        packing.reservationNo ===
          reservationNo &&
        packing.id !== excludePackingId &&
        packing.status !== "Cancelled"
    )
    .reduce((total, packing) => {
      const item = packing.items.find(
        (entry) =>
          entry.productCode ===
          productCode
      );

      return (
        total +
        Number(item?.packedQty || 0)
      );
    }, 0);
}

/* =========================================
   GET PACKING BY ID
========================================= */

export function getPackingById(
  id: string
): ExportPacking | undefined {
  return loadPackings().find(
    (packing) =>
      packing.id === id
  );
}

/* =========================================
   CANCEL PACKING
========================================= */

export function cancelPacking(
  id: string
): ExportPacking[] {
  const updatedPackings =
    loadPackings().map(
      (packing) =>
        packing.id === id
          ? {
              ...packing,
              status:
                "Cancelled" as const,
              updatedAt:
                new Date().toISOString(),
            }
          : packing
    );

  savePackings(updatedPackings);

  syncReservationStatuses();

  return updatedPackings;
}

/* =========================================
   DELETE PACKING

   Only cancelled records should
   be deleted from Master.
========================================= */

export function deletePacking(
  id: string
): ExportPacking[] {
  const updatedPackings =
    loadPackings().filter(
      (packing) =>
        packing.id !== id
    );

  savePackings(updatedPackings);

  syncReservationStatuses();

  return updatedPackings;
}

/* =========================================
   SYNC RESERVATION STATUS

   Packing does NOT reduce stock.

   It only updates Reservation status:

   Reserved
      ↓
   Partially Packed
      ↓
   Packed
========================================= */

export function syncReservationStatuses(): void {
  if (typeof window === "undefined") {
    return;
  }

  const reservations =
    loadArray<any>(
      RESERVATION_KEY
    );

  const packings =
    loadPackings();

  const updatedReservations =
    reservations.map(
      (reservation) => {
        if (
          reservation.status ===
          "Cancelled"
        ) {
          return reservation;
        }

        let hasPackedQuantity =
          false;

        let fullyPacked = true;

        for (const reservationItem of
          reservation.items || []) {
          const packedQuantity =
            packings
              .filter(
                (packing) =>
                  packing.reservationNo ===
                    reservation.reservationNo &&
                  packing.status !==
                    "Cancelled"
              )
              .reduce(
                (sum, packing) => {
                  const packingItem =
                    packing.items.find(
                      (item) =>
                        item.productCode ===
                        reservationItem.productCode
                    );

                  return (
                    sum +
                    Number(
                      packingItem?.packedQty ||
                        0
                    )
                  );
                },
                0
              );

          const reservedQuantity =
            Number(
              reservationItem.reserveQty ||
                0
            );

          if (
            packedQuantity > 0
          ) {
            hasPackedQuantity =
              true;
          }

          if (
            packedQuantity + 0.000001 <
            reservedQuantity
          ) {
            fullyPacked = false;
          }
        }

        let status =
          reservation.status;

        if (
          fullyPacked &&
          (reservation.items || [])
            .length > 0
        ) {
          status = "Packed";
        } else if (
          hasPackedQuantity
        ) {
          status =
            "Partially Packed";
        } else if (
          status === "Packed" ||
          status ===
            "Partially Packed"
        ) {
          status = "Reserved";
        }

        return {
          ...reservation,
          status,
          updatedAt:
            new Date().toISOString(),
        };
      }
    );

  window.localStorage.setItem(
    RESERVATION_KEY,
    JSON.stringify(
      updatedReservations
    )
  );
}