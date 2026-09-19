"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import ExportReservationForm from "./ExportReservationForm";

import {
  ExportReservation,
} from "./ExportReservationTypes";

import {
  loadExportReservations,
  saveExportReservations,
  getNextExportReservationNo,
  reserveInternationalExportStock,
  replaceInternationalExportReservationStock,
  cancelExportReservation,
} from "./ExportReservationStorage";

import {
  loadInternationalExportStock,
} from "../stock/InternationalExportStockStorage";

type ViewMode = "REGISTER" | "FORM";

export default function ExportReservationMaster() {
  const [reservations, setReservations] =
    useState<ExportReservation[]>([]);

  const [viewMode, setViewMode] =
    useState<ViewMode>("REGISTER");

  const [editingReservation, setEditingReservation] =
    useState<ExportReservation | null>(null);

  const [reservationNo, setReservationNo] =
    useState<string>("");

  const [search, setSearch] =
    useState("");

  const [stockVersion, setStockVersion] =
    useState(0);

  const loadData = () => {
    setReservations(
      loadExportReservations()
    );

    setStockVersion(
      (previous) => previous + 1
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedReservations =
    useMemo(() => {
      return [...reservations].sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      );
    }, [reservations]);

  const filteredReservations =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      if (!keyword) {
        return sortedReservations;
      }

      return sortedReservations.filter(
        (reservation) => {
          const searchable = [
            reservation.reservationNo,
            reservation.exportOrderNo,
            reservation.customerName,
            reservation.customerCode,
            reservation.buyerCountry,
            reservation.status,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            keyword
          );
        }
      );
    }, [
      sortedReservations,
      search,
    ]);

  const totalReservations =
    reservations.length;

  const activeReservations =
    reservations.filter(
      (item) =>
        item.status !== "Cancelled"
    ).length;

  const totalReservedQty =
    reservations
      .filter(
        (item) =>
          item.status !== "Cancelled"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.totalReservedQty || 0
          ),
        0
      );

  const totalPackages =
    reservations
      .filter(
        (item) =>
          item.status !== "Cancelled"
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.totalPackages || 0
          ),
        0
      );

  const handleNewReservation = () => {
    setEditingReservation(null);

    setReservationNo(
      getNextExportReservationNo()
    );

    setViewMode("FORM");
  };

  const handleEdit = (
    reservation: ExportReservation
  ) => {
    if (
      reservation.status ===
      "Cancelled"
    ) {
      alert(
        "Cancelled Reservation cannot be edited."
      );

      return;
    }

    setEditingReservation(
      reservation
    );

    setReservationNo(
      reservation.reservationNo
    );

    setViewMode("FORM");
  };

  const handleSave = (
    reservation: ExportReservation
  ) => {
    try {
      /*
       * NEW RESERVATION
       *
       * First reserve stock.
       * Only after successful stock reservation
       * do we save the document.
       */
      if (
        !editingReservation
      ) {
        const confirmed =
          window.confirm(
            `Save Reservation ${reservation.reservationNo}?\n\n` +
              `Export Order: ${reservation.exportOrderNo}\n` +
              `Customer: ${reservation.customerName}\n` +
              `Reserved Qty: ${Number(
                reservation.totalReservedQty || 0
              ).toFixed(3)}`
          );

        if (!confirmed) {
          return;
        }

        /*
         * Always re-read stock immediately before
         * committing the transaction.
         */
        loadInternationalExportStock();

        reserveInternationalExportStock(
          reservation.items
        );

        const current =
          loadExportReservations();

        const exists =
          current.some(
            (item) =>
              item.id ===
              reservation.id
          );

        if (exists) {
          alert(
            "This Reservation already exists. Please refresh and try again."
          );

          /*
           * The stock reservation has already been
           * committed in this unusual case.
           * This condition should not normally occur
           * because new reservations receive a new ID.
           */
          return;
        }

        const updated = [
          ...current,
          reservation,
        ];

        saveExportReservations(
          updated
        );

        loadData();

        setEditingReservation(
          null
        );

        setViewMode(
          "REGISTER"
        );

        alert(
          `Reservation ${reservation.reservationNo} saved successfully.`
        );

        return;
      }

      /*
       * UPDATE EXISTING RESERVATION
       */
      const confirmed =
        window.confirm(
          `Update Reservation ${reservation.reservationNo}?\n\n` +
            `Export Order: ${reservation.exportOrderNo}\n` +
            `Customer: ${reservation.customerName}\n` +
            `New Reserved Qty: ${Number(
              reservation.totalReservedQty || 0
            ).toFixed(3)}`
        );

      if (!confirmed) {
        return;
      }

      /*
       * Storage function performs:
       *
       * Old reservation release
       *          ↓
       * New reservation validation
       *          ↓
       * New reservation reserve
       *
       * Physical stock is never reduced.
       */
      replaceInternationalExportReservationStock(
        editingReservation.items,
        reservation.items
      );

      const current =
        loadExportReservations();

      const updatedReservation: ExportReservation =
        {
          ...reservation,
          id: editingReservation.id,
          createdAt:
            editingReservation.createdAt,
          updatedAt:
            new Date().toISOString(),
        };

      const updated =
        current.map(
          (item) =>
            item.id ===
            editingReservation.id
              ? updatedReservation
              : item
        );

      saveExportReservations(
        updated
      );

      loadData();

      setEditingReservation(
        null
      );

      setViewMode(
        "REGISTER"
      );

      alert(
        `Reservation ${reservation.reservationNo} updated successfully.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save Reservation.";

      alert(message);
    }
  };

  const handleCancelReservation = (
    reservation: ExportReservation
  ) => {
    if (
      reservation.status ===
      "Cancelled"
    ) {
      alert(
        "This Reservation is already cancelled."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Cancel Reservation ${reservation.reservationNo}?\n\n` +
          `Reserved Qty: ${Number(
            reservation.totalReservedQty || 0
          ).toFixed(3)}\n\n` +
          `The reserved stock will be released.`
      );

    if (!confirmed) {
      return;
    }

    try {
      cancelExportReservation(
        reservation
      );

      loadData();

      alert(
        `Reservation ${reservation.reservationNo} cancelled and reserved stock released.`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to cancel Reservation.";

      alert(message);
    }
  };

  const handleDeleteCancelled =
    (
      reservation: ExportReservation
    ) => {
      if (
        reservation.status !==
        "Cancelled"
      ) {
        alert(
          "Only Cancelled Reservations can be permanently deleted."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Permanently delete Reservation ${reservation.reservationNo}?\n\nThis will remove only the Reservation document. Stock is already released.`
        );

      if (!confirmed) {
        return;
      }

      const current =
        loadExportReservations();

      const updated =
        current.filter(
          (item) =>
            item.id !==
            reservation.id
        );

      saveExportReservations(
        updated
      );

      loadData();

      alert(
        `Reservation ${reservation.reservationNo} deleted.`
      );
    };

  const handleFormCancel = () => {
    setEditingReservation(
      null
    );

    setViewMode(
      "REGISTER"
    );
  };

  if (
    viewMode === "FORM"
  ) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100%",
          background:
            "#f7f8fa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "10px",
            padding:
              "10px 12px",
            borderBottom:
              "1px solid #dfe3e8",
            background:
              "#ffffff",
          }}
        >
          <div>
            <div
              style={{
                fontSize:
                  "16px",
                fontWeight: 700,
                color:
                  "#111827",
              }}
            >
              {editingReservation
                ? "Edit Export Stock Reservation"
                : "New Export Stock Reservation"}
            </div>

            <div
              style={{
                marginTop:
                  "2px",
                fontSize:
                  "11px",
                color:
                  "#6b7280",
              }}
            >
              Export Order → International Export Stock → Reservation
            </div>
          </div>

          <button
            type="button"
            onClick={
              handleFormCancel
            }
            style={{
              border:
                "1px solid #c7ccd2",
              borderRadius:
                "4px",
              background:
                "#ffffff",
              padding:
                "6px 12px",
              fontSize:
                "12px",
              fontWeight: 600,
              cursor:
                "pointer",
            }}
          >
            ← Back to Register
          </button>
        </div>

        <ExportReservationForm
          reservationNo={
            reservationNo
          }
          initialData={
            editingReservation
          }
          onSave={
            handleSave
          }
          onCancel={
            handleFormCancel
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        padding: "10px",
        boxSizing:
          "border-box",
        background:
          "#f7f8fa",
        color:
          "#1f2937",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        .ersm-card {
          background: #ffffff;
          border: 1px solid #dfe3e8;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .ersm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 11px;
          border-bottom: 1px solid #dfe3e8;
        }

        .ersm-title {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
        }

        .ersm-subtitle {
          margin-top: 2px;
          font-size: 11px;
          color: #6b7280;
        }

        .ersm-primary {
          border: 1px solid #1f2937;
          border-radius: 4px;
          background: #1f2937;
          color: #ffffff;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .ersm-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          padding: 8px;
        }

        .ersm-summary-card {
          border: 1px solid #dfe3e8;
          border-radius: 5px;
          background: #fafafa;
          padding: 8px;
        }

        .ersm-summary-label {
          font-size: 10px;
          color: #6b7280;
        }

        .ersm-summary-value {
          margin-top: 2px;
          font-size: 17px;
          font-weight: 700;
          color: #111827;
        }

        .ersm-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          border-bottom: 1px solid #dfe3e8;
        }

        .ersm-search {
          width: 320px;
          max-width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 4px;
          padding: 6px 8px;
          font-size: 12px;
          outline: none;
        }

        .ersm-note {
          font-size: 10px;
          color: #6b7280;
        }

        .ersm-table-wrap {
          overflow-x: auto;
        }

        .ersm-table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .ersm-table th {
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          padding: 7px 6px;
          text-align: left;
          white-space: nowrap;
        }

        .ersm-table td {
          border-bottom: 1px solid #edf0f2;
          padding: 6px;
          vertical-align: top;
        }

        .ersm-table tr:hover td {
          background: #fafafa;
        }

        .ersm-status {
          display: inline-block;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .ersm-actions {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .ersm-btn {
          border: 1px solid #c7ccd2;
          border-radius: 3px;
          background: #ffffff;
          color: #1f2937;
          padding: 4px 7px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .ersm-btn-danger {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .ersm-empty {
          padding: 30px 12px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }

        .ersm-safety {
          padding: 8px 10px;
          border-top: 1px solid #dfe3e8;
          background: #fafafa;
          font-size: 10px;
          color: #4b5563;
          line-height: 1.4;
        }

        @media (max-width: 600px) {
          .ersm-summary {
            grid-template-columns: 1fr;
          }

          .ersm-header,
          .ersm-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .ersm-search {
            width: 100%;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="ersm-card">
        <div className="ersm-header">
          <div>
            <div className="ersm-title">
              Export Stock Reservation
            </div>

            <div className="ersm-subtitle">
              Reserve International Export Stock against confirmed Export Orders
            </div>
          </div>

          <button
            type="button"
            className="ersm-primary"
            onClick={
              handleNewReservation
            }
          >
            + New Reservation
          </button>
        </div>

        {/* SUMMARY */}
        <div className="ersm-summary">
          <div className="ersm-summary-card">
            <div className="ersm-summary-label">
              Total Reservations
            </div>

            <div className="ersm-summary-value">
              {totalReservations}
            </div>
          </div>

          <div className="ersm-summary-card">
            <div className="ersm-summary-label">
              Active Reservations
            </div>

            <div className="ersm-summary-value">
              {activeReservations}
            </div>
          </div>

          <div className="ersm-summary-card">
            <div className="ersm-summary-label">
              Reserved Quantity
            </div>

            <div className="ersm-summary-value">
              {totalReservedQty.toFixed(
                3
              )}
            </div>
          </div>

          <div className="ersm-summary-card">
            <div className="ersm-summary-label">
              Reserved Packages
            </div>

            <div className="ersm-summary-value">
              {totalPackages}
            </div>
          </div>
        </div>
      </div>

      {/* REGISTER */}
      <div className="ersm-card">
        <div className="ersm-toolbar">
          <input
            className="ersm-search"
            type="text"
            placeholder="Search Reservation / Order / Customer / Country / Status..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

          <div className="ersm-note">
            Newest reservations first
          </div>
        </div>

        <div className="ersm-table-wrap">
          <table className="ersm-table">
            <thead>
              <tr>
                <th>
                  Reservation No.
                </th>

                <th>
                  Date
                </th>

                <th>
                  Export Order
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Country
                </th>

                <th>
                  Products
                </th>

                <th>
                  Reserved Qty
                </th>

                <th>
                  Packages
                </th>

                <th>
                  Net KG
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredReservations.length ===
                0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="ersm-empty"
                  >
                    {search
                      ? "No matching Reservation found."
                      : "No Export Stock Reservation found. Click + New Reservation to create one."}
                  </td>
                </tr>
              )}

              {filteredReservations.map(
                (
                  reservation
                ) => (
                  <tr
                    key={
                      reservation.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          reservation.reservationNo
                        }
                      </strong>
                    </td>

                    <td>
                      {reservation.reservationDate
                        ? new Date(
                            `${reservation.reservationDate}T00:00:00`
                          ).toLocaleDateString(
                            "en-GB"
                          )
                        : "-"}
                    </td>

                    <td>
                      {
                        reservation.exportOrderNo
                      }
                    </td>

                    <td>
                      <strong>
                        {
                          reservation.customerName
                        }
                      </strong>

                      {reservation.contactPerson && (
                        <div
                          style={{
                            marginTop:
                              "2px",
                            fontSize:
                              "10px",
                            color:
                              "#6b7280",
                          }}
                        >
                          {
                            reservation.contactPerson
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      {
                        reservation.buyerCountry
                      }
                    </td>

                    <td>
                      {reservation.items
                        .map(
                          (
                            item
                          ) =>
                            `${item.productName} (${item.productCode}) — ${Number(
                              item.reserveQty ||
                                0
                            ).toFixed(
                              3
                            )} ${item.unit}`
                        )
                        .join(
                          "; "
                        )}
                    </td>

                    <td>
                      {Number(
                        reservation.totalReservedQty ||
                          0
                      ).toFixed(
                        3
                      )}
                    </td>

                    <td>
                      {Number(
                        reservation.totalPackages ||
                          0
                      )}
                    </td>

                    <td>
                      {Number(
                        reservation.totalNetWeight ||
                          0
                      ).toFixed(
                        3
                      )}
                    </td>

                    <td>
                      <span className="ersm-status">
                        {
                          reservation.status
                        }
                      </span>
                    </td>

                    <td>
                      <div className="ersm-actions">
                        {reservation.status !==
                          "Cancelled" && (
                          <button
                            type="button"
                            className="ersm-btn"
                            onClick={() =>
                              handleEdit(
                                reservation
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                        {reservation.status !==
                          "Cancelled" && (
                          <button
                            type="button"
                            className="ersm-btn ersm-btn-danger"
                            onClick={() =>
                              handleCancelReservation(
                                reservation
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}

                        {reservation.status ===
                          "Cancelled" && (
                          <button
                            type="button"
                            className="ersm-btn ersm-btn-danger"
                            onClick={() =>
                              handleDeleteCancelled(
                                reservation
                              )
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="ersm-safety">
          <strong>
            Stock Safety:
          </strong>{" "}
          Reservation does not reduce physical
          International Export Stock. It only
          increases Reserved Qty. Physical stock
          movement will be handled later through
          Packing / Container Loading / Shipment.
          Domestic Stock is completely separate.
        </div>
      </div>
    </div>
  );
}