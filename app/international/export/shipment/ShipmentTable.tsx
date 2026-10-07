"use client";

import React from "react";
import { Shipment } from "./ShipmentTypes";

interface ShipmentTableProps {
  shipments: Shipment[];
  onView: (shipment: Shipment) => void;
  onEdit: (shipment: Shipment) => void;
  onDelete: (shipment: Shipment) => void;
}

const statusClasses: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Booked: "bg-blue-100 text-blue-700",
  "Cargo Ready": "bg-yellow-100 text-yellow-700",
  Stuffed: "bg-purple-100 text-purple-700",
  "Customs Filed": "bg-orange-100 text-orange-700",
  "Customs Cleared": "bg-green-100 text-green-700",
  "LEO Received": "bg-green-100 text-green-700",
  "Gate Out": "bg-indigo-100 text-indigo-700",
  Shipped: "bg-teal-100 text-teal-700",
  "In Transit": "bg-cyan-100 text-cyan-700",
  Arrived: "bg-emerald-100 text-emerald-700",
  Closed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

export default function ShipmentTable({
  shipments,
  onView,
  onEdit,
  onDelete,
}: ShipmentTableProps) {
  if (shipments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="text-4xl">🚢</div>

        <h3 className="mt-3 text-lg font-semibold text-gray-800">
          No Shipments Found
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Create a new export shipment to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1500px] w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Shipment No.
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Date
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Customer
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Export Order
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Packing No.
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Invoice No.
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Mode
              </th>

              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-600">
                Containers
              </th>

              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                Packages
              </th>

              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                Gross Wt.
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                Destination
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                ETD
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                ETA
              </th>

              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-600">
                Status
              </th>

              <th className="sticky right-0 bg-gray-50 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-600">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {shipments.map((shipment) => {
              const totalPackages = shipment.cargoItems.reduce(
                (total, item) => total + Number(item.packages || 0),
                0
              );

              const totalGrossWeight = shipment.cargoItems.reduce(
                (total, item) => total + Number(item.grossWeight || 0),
                0
              );

              const statusClass =
                statusClasses[shipment.status] ||
                "bg-gray-100 text-gray-700";

              return (
                <tr
                  key={shipment.id}
                  className="border-b border-gray-100 transition hover:bg-gray-50"
                >
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => onView(shipment)}
                      className="font-semibold text-green-700 hover:text-green-900 hover:underline"
                    >
                      {shipment.shipmentNo || "-"}
                    </button>
                  </td>

                  <td className="px-4 py-3 align-top text-sm text-gray-700">
                    {formatDate(shipment.shipmentDate)}
                  </td>

                  <td className="max-w-[220px] px-4 py-3 align-top">
                    <div className="font-medium text-gray-800">
                      {shipment.customerName || "-"}
                    </div>

                    {shipment.country && (
                      <div className="mt-1 text-xs text-gray-500">
                        {shipment.country}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top text-sm text-gray-700">
                    {shipment.exportOrderNo || "-"}
                  </td>

                  <td className="px-4 py-3 align-top text-sm text-gray-700">
                    {shipment.packingNo || "-"}
                  </td>

                  <td className="px-4 py-3 align-top text-sm text-gray-700">
                    {shipment.commercialInvoiceNo || "-"}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {shipment.shipmentMode || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center align-top">
                    <span className="inline-flex min-w-[32px] justify-center rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      {shipment.containers.length}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right align-top text-sm font-medium text-gray-700">
                    {formatNumber(totalPackages)}
                  </td>

                  <td className="px-4 py-3 text-right align-top text-sm font-medium text-gray-700">
                    {formatNumber(totalGrossWeight)}
                  </td>

                  <td className="max-w-[180px] px-4 py-3 align-top text-sm text-gray-700">
                    {shipment.finalDestination ||
                      shipment.countryOfFinalDestination ||
                      "-"}
                  </td>

                  <td className="px-4 py-3 align-top text-sm text-gray-700">
                    {formatDate(shipment.etd)}
                  </td>

                  <td className="px-4 py-3 align-top text-sm text-gray-700">
                    {formatDate(shipment.eta)}
                  </td>

                  <td className="px-4 py-3 text-center align-top">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                    >
                      {shipment.status || "Draft"}
                    </span>
                  </td>

                  <td className="sticky right-0 border-l border-gray-100 bg-white px-4 py-3 align-top">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onView(shipment)}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(shipment)}
                        className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(shipment)}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="text-sm text-gray-600">
          Total Shipments:
          <span className="ml-1 font-bold text-gray-800">
            {shipments.length}
          </span>
        </div>

        <div className="text-xs text-gray-500">
          Scroll horizontally to view all shipment details.
        </div>
      </div>
    </div>
  );
}