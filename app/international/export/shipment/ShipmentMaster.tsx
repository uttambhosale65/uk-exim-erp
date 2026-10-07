"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Shipment,
} from "./ShipmentTypes";

import {
  addShipment,
  deleteShipment,
  generateShipmentNo,
  loadShipments,
  updateShipment,
} from "./ShipmentStorage";

import ShipmentTable from "./ShipmentTable";

import ShipmentForm from "./ShipmentForm";

type ShipmentMasterProps = {
  onBack?: () => void;
};

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ShipmentMaster({
  onBack,
}: ShipmentMasterProps) {
  const [shipments, setShipments] = useState<Shipment[]>(
    []
  );

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [editingShipment, setEditingShipment] =
    useState<Shipment | null>(null);

  const refreshShipments = () => {
    setShipments(loadShipments());
  };

  useEffect(() => {
    refreshShipments();

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key ===
        "uk-exim-export-shipments"
      ) {
        refreshShipments();
      }
    };

    const handleFocus = () => {
      refreshShipments();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  const filteredShipments = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return shipments.filter(
      (shipment) => {
        const matchesSearch =
          !query ||
          shipment.shipmentNo
            .toLowerCase()
            .includes(query) ||
          shipment.customerName
            .toLowerCase()
            .includes(query) ||
          shipment.exportOrderNo
            .toLowerCase()
            .includes(query) ||
          shipment.reservationNo
            .toLowerCase()
            .includes(query) ||
          shipment.packingNo
            .toLowerCase()
            .includes(query) ||
          shipment.commercialInvoiceNo
            .toLowerCase()
            .includes(query) ||
          shipment.country
            .toLowerCase()
            .includes(query) ||
          shipment.finalDestination
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter === "All" ||
          shipment.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    shipments,
    search,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    const total = shipments.length;

    const draft = shipments.filter(
      (item) =>
        item.status === "Draft"
    ).length;

    const booked = shipments.filter(
      (item) =>
        item.status === "Booked"
    ).length;

    const inTransit =
      shipments.filter(
        (item) =>
          item.status === "In Transit"
      ).length;

    const shipped =
      shipments.filter(
        (item) =>
          item.status === "Shipped"
      ).length;

    const arrived =
      shipments.filter(
        (item) =>
          item.status === "Arrived"
      ).length;

    const closed =
      shipments.filter(
        (item) =>
          item.status === "Closed"
      ).length;

    return {
      total,
      draft,
      booked,
      inTransit,
      shipped,
      arrived,
      closed,
    };
  }, [shipments]);

  const handleNewShipment = () => {
    setEditingShipment(null);
    setShowForm(true);
  };

  const handleView = (
    shipment: Shipment
  ) => {
    setEditingShipment(shipment);
    setShowForm(true);
  };

  const handleEdit = (
    shipment: Shipment
  ) => {
    setEditingShipment(shipment);
    setShowForm(true);
  };

  const handleDelete = (
    shipment: Shipment
  ) => {
    if (
      shipment.status !== "Draft"
    ) {
      alert(
        "Only Draft Shipment can be deleted. Later-stage Shipment should be amended or cancelled."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete Shipment ${shipment.shipmentNo}?`
      );

    if (!confirmed) {
      return;
    }

    deleteShipment(
      shipment.id
    );

    refreshShipments();
  };

  const handleSave = (
    shipment: Shipment
  ) => {
    const exists = shipments.some(
      (item) =>
        item.id === shipment.id
    );

    if (exists) {
      updateShipment(
        shipment
      );
    } else {
      addShipment(
        shipment
      );
    }

    refreshShipments();

    setEditingShipment(null);
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setEditingShipment(null);
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShipmentForm
          initialData={
            editingShipment
          }
          shipmentNo={
            editingShipment?.shipmentNo ||
            generateShipmentNo()
          }
          shipmentDate={
            editingShipment?.shipmentDate ||
            getToday()
          }
          onSave={handleSave}
          onCancel={
            handleCancelForm
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-[1800px]">

        {/* HEADER */}
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">

          <div>
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ← Back
                </button>
              )}

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Shipment Management
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  International Export →
                  Packing → Shipment →
                  Invoice → Payment
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleNewShipment
            }
            className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
          >
            + New Shipment
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">

          <SummaryCard
            label="Total"
            value={
              summary.total
            }
          />

          <SummaryCard
            label="Draft"
            value={
              summary.draft
            }
          />

          <SummaryCard
            label="Booked"
            value={
              summary.booked
            }
          />

          <SummaryCard
            label="Shipped"
            value={
              summary.shipped
            }
          />

          <SummaryCard
            label="In Transit"
            value={
              summary.inTransit
            }
          />

          <SummaryCard
            label="Arrived"
            value={
              summary.arrived
            }
          />

          <SummaryCard
            label="Closed"
            value={
              summary.closed
            }
          />
        </div>

        {/* FILTER BAR */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Search Shipment
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Shipment No / Customer / Order / Reservation / Packing / Invoice / Country..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Status
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600"
              >
                <option value="All">
                  All Status
                </option>

                <option value="Draft">
                  Draft
                </option>

                <option value="Booked">
                  Booked
                </option>

                <option value="Cargo Ready">
                  Cargo Ready
                </option>

                <option value="Stuffed">
                  Stuffed
                </option>

                <option value="Customs Filed">
                  Customs Filed
                </option>

                <option value="Customs Cleared">
                  Customs Cleared
                </option>

                <option value="LEO Received">
                  LEO Received
                </option>

                <option value="Gate Out">
                  Gate Out
                </option>

                <option value="Shipped">
                  Shipped
                </option>

                <option value="In Transit">
                  In Transit
                </option>

                <option value="Arrived">
                  Arrived
                </option>

                <option value="Closed">
                  Closed
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "All"
                  );
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 md:w-auto"
              >
                Clear
              </button>
            </div>

          </div>
        </div>

        {/* WORKFLOW NOTE */}
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

          <div className="text-sm font-bold text-blue-900">
            Shipment Workflow
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-800">

            <span className="rounded-md bg-white px-3 py-1.5">
              Reservation
            </span>

            <span>→</span>

            <span className="rounded-md bg-white px-3 py-1.5">
              Packing
            </span>

            <span>→</span>

            <span className="rounded-md bg-blue-700 px-3 py-1.5 text-white">
              Shipment
            </span>

            <span>→</span>

            <span className="rounded-md bg-white px-3 py-1.5">
              Invoice
            </span>

            <span>→</span>

            <span className="rounded-md bg-white px-3 py-1.5">
              Payment
            </span>

          </div>

          <p className="mt-2 text-xs text-blue-700">
            Shipment हा logistics / export movement record आहे.
            Packing मध्ये झालेला stock movement Shipment मध्ये
            पुन्हा deduct केला जाणार नाही.
          </p>
        </div>

        {/* TABLE */}
        <ShipmentTable
          shipments={
            filteredShipments
          }
          onView={
            handleView
          }
          onEdit={
            handleEdit
          }
          onDelete={
            handleDelete
          }
        />

      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
}