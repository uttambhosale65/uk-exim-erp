"use client";

import React, { useMemo, useState } from "react";

import {
  ExportReservation,
} from "./ExportReservationTypes";

type ExportReservationTableProps = {
  reservations: ExportReservation[];
  onEdit: (
    reservation: ExportReservation
  ) => void;
  onCancel: (
    reservation: ExportReservation
  ) => void;
  onDelete?: (
    reservation: ExportReservation
  ) => void;
};

export default function ExportReservationTable({
  reservations,
  onEdit,
  onCancel,
  onDelete,
}: ExportReservationTableProps) {
  const [search, setSearch] =
    useState("");

  const filteredReservations =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      const sorted = [
        ...reservations,
      ].sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      );

      if (!keyword) {
        return sorted;
      }

      return sorted.filter(
        (reservation) => {
          const productText =
            (reservation.items || [])
              .map(
                (item) =>
                  `${item.productName} ${item.productCode} ${item.lotBatchNo}`
              )
              .join(" ");

          const searchable = [
            reservation.reservationNo,
            reservation.reservationDate,
            reservation.exportOrderNo,
            reservation.customerCode,
            reservation.customerName,
            reservation.contactPerson,
            reservation.buyerCountry,
            reservation.status,
            productText,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            keyword
          );
        }
      );
    }, [
      reservations,
      search,
    ]);

  const formatDate = (
    value: string
  ): string => {
    if (!value) {
      return "-";
    }

    const date = new Date(
      `${value}T00:00:00`
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-GB"
    );
  };

  const getStatusClass = (
    status: ExportReservation["status"]
  ) => {
    switch (status) {
      case "Reserved":
        return "ert-status ert-status-reserved";

      case "Partially Packed":
        return "ert-status ert-status-partial";

      case "Packed":
        return "ert-status ert-status-packed";

      case "Cancelled":
        return "ert-status ert-status-cancelled";

      default:
        return "ert-status ert-status-draft";
    }
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#ffffff",
        border:
          "1px solid #dfe3e8",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      <style>{`
        .ert-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 10px;
          border-bottom: 1px solid #dfe3e8;
          background: #ffffff;
        }

        .ert-search {
          width: 340px;
          max-width: 100%;
          box-sizing: border-box;
          border: 1px solid #cfd5dc;
          border-radius: 4px;
          padding: 6px 8px;
          font-size: 12px;
          color: #111827;
          outline: none;
        }

        .ert-search:focus {
          border-color: #6b7280;
        }

        .ert-count {
          font-size: 11px;
          color: #6b7280;
          white-space: nowrap;
        }

        .ert-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .ert-table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .ert-table th {
          background: #f1f3f5;
          border-bottom: 1px solid #dfe3e8;
          padding: 7px 6px;
          text-align: left;
          white-space: nowrap;
          font-weight: 700;
          color: #374151;
        }

        .ert-table td {
          border-bottom: 1px solid #edf0f2;
          padding: 6px;
          vertical-align: top;
          color: #1f2937;
        }

        .ert-table tbody tr:hover td {
          background: #fafafa;
        }

        .ert-reservation-no {
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .ert-customer {
          font-weight: 600;
        }

        .ert-secondary {
          margin-top: 2px;
          font-size: 10px;
          color: #6b7280;
        }

        .ert-product {
          margin-bottom: 5px;
        }

        .ert-product:last-child {
          margin-bottom: 0;
        }

        .ert-product-name {
          font-weight: 600;
          color: #111827;
        }

        .ert-product-meta {
          margin-top: 2px;
          font-size: 10px;
          color: #6b7280;
        }

        .ert-status {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .ert-status-draft {
          background: #f9fafb;
          color: #374151;
        }

        .ert-status-reserved {
          background: #f0fdf4;
          color: #166534;
          border-color: #bbf7d0;
        }

        .ert-status-partial {
          background: #fffbeb;
          color: #92400e;
          border-color: #fde68a;
        }

        .ert-status-packed {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
        }

        .ert-status-cancelled {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .ert-actions {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .ert-btn {
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

        .ert-btn:hover {
          background: #f3f4f6;
        }

        .ert-btn-cancel {
          color: #b45309;
          border-color: #fde68a;
        }

        .ert-btn-delete {
          color: #b91c1c;
          border-color: #fecaca;
        }

        .ert-empty {
          padding: 30px 12px !important;
          text-align: center;
          color: #6b7280 !important;
          font-size: 12px;
        }

        .ert-summary-line {
          margin-top: 2px;
          font-size: 10px;
          color: #6b7280;
        }

        @media (max-width: 800px) {
          .ert-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .ert-search {
            width: 100%;
          }
        }
      `}</style>

      <div className="ert-toolbar">
        <input
          type="text"
          className="ert-search"
          placeholder="Search Reservation / Order / Customer / Product / Status..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <div className="ert-count">
          Showing{" "}
          {
            filteredReservations.length
          }{" "}
          of{" "}
          {reservations.length}{" "}
          reservations
        </div>
      </div>

      <div className="ert-table-wrap">
        <table className="ert-table">
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
                Gross KG
              </th>

              <th>
                CBM
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
                  colSpan={13}
                  className="ert-empty"
                >
                  {search
                    ? "No matching Reservation found."
                    : "No Export Stock Reservation found."}
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
                    <div className="ert-reservation-no">
                      {
                        reservation.reservationNo
                      }
                    </div>
                  </td>

                  <td>
                    {formatDate(
                      reservation.reservationDate
                    )}
                  </td>

                  <td>
                    <strong>
                      {
                        reservation.exportOrderNo
                      }
                    </strong>
                  </td>

                  <td>
                    <div className="ert-customer">
                      {
                        reservation.customerName
                      }
                    </div>

                    {reservation.customerCode && (
                      <div className="ert-secondary">
                        {
                          reservation.customerCode
                        }
                      </div>
                    )}

                    {reservation.contactPerson && (
                      <div className="ert-secondary">
                        {
                          reservation.contactPerson
                        }
                      </div>
                    )}
                  </td>

                  <td>
                    {
                      reservation.buyerCountry ||
                      "-"
                    }
                  </td>

                  <td>
                    {(reservation.items ||
                      []).map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="ert-product"
                          key={`${reservation.id}-${item.productCode}-${index}`}
                        >
                          <div className="ert-product-name">
                            {
                              item.productName
                            }
                          </div>

                          <div className="ert-product-meta">
                            Code:{" "}
                            {
                              item.productCode
                            }
                          </div>

                          <div className="ert-product-meta">
                            Lot:{" "}
                            {
                              item.lotBatchNo ||
                              "-"
                            }
                          </div>

                          <div className="ert-product-meta">
                            Reserve:{" "}
                            {Number(
                              item.reserveQty ||
                                0
                            ).toFixed(
                              3
                            )}{" "}
                            {
                              item.unit
                            }
                          </div>
                        </div>
                      )
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
                    {Number(
                      reservation.totalGrossWeight ||
                        0
                    ).toFixed(
                      3
                    )}
                  </td>

                  <td>
                    {Number(
                      reservation.totalCBM ||
                        0
                    ).toFixed(
                      3
                    )}
                  </td>

                  <td>
                    <span
                      className={getStatusClass(
                        reservation.status
                      )}
                    >
                      {
                        reservation.status
                      }
                    </span>
                  </td>

                  <td>
                    <div className="ert-actions">
                      {reservation.status !==
                        "Cancelled" && (
                        <>
                          <button
                            type="button"
                            className="ert-btn"
                            onClick={() =>
                              onEdit(
                                reservation
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="ert-btn ert-btn-cancel"
                            onClick={() =>
                              onCancel(
                                reservation
                              )
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {reservation.status ===
                        "Cancelled" &&
                        onDelete && (
                          <button
                            type="button"
                            className="ert-btn ert-btn-delete"
                            onClick={() =>
                              onDelete(
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

      <div
        style={{
          padding:
            "7px 10px",
          borderTop:
            "1px solid #dfe3e8",
          background:
            "#fafafa",
          fontSize:
            "10px",
          color:
            "#6b7280",
          lineHeight:
            1.4,
        }}
      >
        <strong>
          Stock Safety:
        </strong>{" "}
        Reservation does not reduce
        physical International Export
        Stock. It only holds Reserved Qty.
        Domestic Stock remains completely
        separate.
      </div>
    </div>
  );
}