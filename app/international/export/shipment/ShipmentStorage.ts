import { Shipment } from "./ShipmentTypes";

export const SHIPMENT_STORAGE_KEY = "uk-exim-export-shipments";

export function loadShipments(): Shipment[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(SHIPMENT_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load export shipments:", error);
    return [];
  }
}

export function saveShipments(shipments: Shipment[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      SHIPMENT_STORAGE_KEY,
      JSON.stringify(shipments)
    );
  } catch (error) {
    console.error("Failed to save export shipments:", error);
  }
}

export function addShipment(shipment: Shipment): Shipment[] {
  const currentShipments = loadShipments();

  const updatedShipments = [
    ...currentShipments,
    shipment,
  ];

  saveShipments(updatedShipments);

  return updatedShipments;
}

export function updateShipment(
  shipment: Shipment
): Shipment[] {
  const currentShipments = loadShipments();

  const updatedShipments = currentShipments.map(
    (item) =>
      item.id === shipment.id
        ? shipment
        : item
  );

  saveShipments(updatedShipments);

  return updatedShipments;
}

export function deleteShipment(
  shipmentId: string
): Shipment[] {
  const currentShipments = loadShipments();

  const updatedShipments = currentShipments.filter(
    (item) => item.id !== shipmentId
  );

  saveShipments(updatedShipments);

  return updatedShipments;
}

export function getShipmentById(
  shipmentId: string
): Shipment | undefined {
  const shipments = loadShipments();

  return shipments.find(
    (item) => item.id === shipmentId
  );
}

export function generateShipmentNo(): string {
  const shipments = loadShipments();

  let maxNumber = 0;

  shipments.forEach((shipment) => {
    const match = shipment.shipmentNo.match(
      /SHP-(\d+)/
    );

    if (match) {
      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  return `SHP-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}