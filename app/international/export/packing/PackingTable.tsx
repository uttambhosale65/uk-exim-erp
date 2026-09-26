"use client";

import React, {
  useMemo,
  useState,
} from "react";

import { ExportPacking } from "./PackingTypes";

type PackingTableProps = {
  packings: ExportPacking[];
  onEdit: (packing: ExportPacking) => void;
  onCancel: (packing: ExportPacking) => void;
  onDelete: (packing: ExportPacking) => void;
  onPrint: (packing: ExportPacking) => void;
};

function formatDate(
  value: string
): string {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatNumber(
  value: number,
  decimals = 3
): string {
  return Number(value || 0).toFixed(
    decimals
  );
}

function getStatusClass(
  status: ExportPacking["status"]
): string {
  switch (status) {
    case "Packed":
      return "packed";

    case "Partially Packed":
      return "partial";

    case "Cancelled":
      return "cancelled";

    case "Draft":
    default:
      return "draft";
  }
}

export default function PackingTable({
  packings,
  onEdit,
  onCancel,
  onDelete,
  onPrint,
}: PackingTableProps) {
  const [search, setSearch] =
    useState("");

  const filteredPackings =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      const sorted = [
        ...packings,
      ].sort((a, b) => {
        const dateA = new Date(
          a.createdAt || ""
        ).getTime();

        const dateB = new Date(
          b.createdAt || ""
        ).getTime();

        if (
          Number.isFinite(dateA) &&
          Number.isFinite(dateB) &&
          dateA !== dateB
        ) {
          return dateB - dateA;
        }

        return (
          String(b.packingNo || "")
            .localeCompare(
              String(
                a.packingNo || ""
              )
            )
        );
      });

      if (!query) {
        return sorted;
      }

      return sorted.filter(
        (packing) =>
          String(
            packing.packingNo || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            packing.exportOrderNo || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            packing.reservationNo || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            packing.customerName || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            packing.buyerCountry || ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            packing.status || ""
          )
            .toLowerCase()
            .includes(query) ||
          packing.items.some(
            (item) =>
              String(
                item.productCode || ""
              )
                .toLowerCase()
                .includes(query) ||
              String(
                item.productName || ""
              )
                .toLowerCase()
                .includes(query) ||
              String(
                item.lotBatchNo || ""
              )
                .toLowerCase()
                .includes(query)
          )
      );
    }, [packings, search]);

  const handleCancel = (
    packing: ExportPacking
  ) => {
    const confirmed =
      window.confirm(
        `Cancel Packing ${packing.packingNo}?`
      );

    if (!confirmed) {
      return;
    }

    onCancel(packing);
  };

  const handleDelete = (
    packing: ExportPacking
  ) => {
    const confirmed =
      window.confirm(
        `Delete cancelled Packing ${packing.packingNo}?`
      );

    if (!confirmed) {
      return;
    }

    onDelete(packing);
  };

  return (
    <div className="pt-wrapper">
      <div className="pt-toolbar">
        <div>
          <h3 className="pt-title">
            Packing Register
          </h3>

          <div className="pt-subtitle">
            Actual packing records against
            Export Reservations
          </div>
        </div>

        <div className="pt-search-wrap">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search Packing No, Order, Reservation, Customer..."
            className="pt-search"
          />

          {search && (
            <button
              type="button"
              className="pt-clear"
              onClick={() =>
                setSearch("")
              }
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="pt-info">
        Showing{" "}
        <strong>
          {filteredPackings.length}
        </strong>{" "}
        of{" "}
        <strong>
          {packings.length}
        </strong>{" "}
        packing records
      </div>

      <div className="pt-table-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Packing No.</th>
              <th>Date</th>
              <th>Export Order</th>
              <th>Reservation</th>
              <th>Customer</th>
              <th>Country</th>
              <th>Products</th>
              <th>Packages</th>
              <th>Net KG</th>
              <th>Gross KG</th>
              <th>CBM</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredPackings.length ===
            0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="pt-empty"
                >
                  {packings.length ===
                  0
                    ? "No packing records found."
                    : "No packing records match your search."}
                </td>
              </tr>
            ) : (
              filteredPackings.map(
                (packing, index) => (
                  <tr
                    key={
                      packing.id ||
                      packing.packingNo
                    }
                  >
                    <td>
                      {index + 1}
                    </td>

                    <td>
                      <strong>
                        {
                          packing.packingNo
                        }
                      </strong>
                    </td>

                    <td>
                      {formatDate(
                        packing.packingDate
                      )}
                    </td>

                    <td>
                      {
                        packing.exportOrderNo
                      }
                    </td>

                    <td>
                      {
                        packing.reservationNo
                      }
                    </td>

                    <td>
                      <div className="pt-customer">
                        {
                          packing.customerName
                        }
                      </div>

                      {packing.contactPerson && (
                        <div className="pt-muted">
                          {
                            packing.contactPerson
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      {
                        packing.buyerCountry
                      }
                    </td>

                    <td>
                      <div className="pt-products">
                        {packing.items.map(
                          (
                            item,
                            itemIndex
                          ) => (
                            <div
                              key={`${item.productCode}-${itemIndex}`}
                              className="pt-product"
                            >
                              <strong>
                                {
                                  item.productName
                                }
                              </strong>

                              <span>
                                {
                                  item.productCode
                                }
                              </span>

                              <span>
                                Packed:{" "}
                                {formatNumber(
                                  item.packedQty
                                )}{" "}
                                {
                                  item.unit
                                }
                              </span>

                              {item.lotBatchNo && (
                                <span>
                                  Lot:{" "}
                                  {
                                    item.lotBatchNo
                                  }
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </td>

                    <td className="pt-number">
                      {formatNumber(
                        packing.totalPackages,
                        0
                      )}
                    </td>

                    <td className="pt-number">
                      {formatNumber(
                        packing.totalNetWeight
                      )}
                    </td>

                    <td className="pt-number">
                      {formatNumber(
                        packing.totalGrossWeight
                      )}
                    </td>

                    <td className="pt-number">
                      {formatNumber(
                        packing.totalCBM
                      )}
                    </td>

                    <td>
                      <span
                        className={`pt-status ${getStatusClass(
                          packing.status
                        )}`}
                      >
                        {packing.status}
                      </span>
                    </td>

                    <td>
                      <div className="pt-actions">
                        <button
                          type="button"
                          className="pt-action edit"
                          onClick={() =>
                            onEdit(
                              packing
                            )
                          }
                          disabled={
                            packing.status ===
                            "Cancelled"
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="pt-action print"
                          onClick={() =>
                            onPrint(
                              packing
                            )
                          }
                        >
                          Print
                        </button>

                        {packing.status !==
                          "Cancelled" && (
                          <button
                            type="button"
                            className="pt-action cancel"
                            onClick={() =>
                              handleCancel(
                                packing
                              )
                            }
                          >
                            Cancel
                          </button>
                        )}

                        {packing.status ===
                          "Cancelled" && (
                          <button
                            type="button"
                            className="pt-action delete"
                            onClick={() =>
                              handleDelete(
                                packing
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
              )
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .pt-wrapper {
          width: 100%;
          box-sizing: border-box;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px;
        }

        .pt-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 10px;
        }

        .pt-title {
          margin: 0;
          font-size: 16px;
          color: #111827;
        }

        .pt-subtitle {
          margin-top: 3px;
          font-size: 11px;
          color: #6b7280;
        }

        .pt-search-wrap {
          position: relative;
          width: 360px;
          max-width: 100%;
        }

        .pt-search {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 34px 8px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 12px;
          outline: none;
        }

        .pt-search:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 2px
            rgba(37, 99, 235, 0.08);
        }

        .pt-clear {
          position: absolute;
          right: 7px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          border: 0;
          background: transparent;
          color: #6b7280;
          font-size: 18px;
          line-height: 20px;
          cursor: pointer;
        }

        .pt-info {
          margin-bottom: 8px;
          color: #6b7280;
          font-size: 11px;
        }

        .pt-table-wrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .pt-table {
          width: 100%;
          min-width: 1500px;
          border-collapse: collapse;
          font-size: 11px;
        }

        .pt-table th {
          background: #f3f4f6;
          color: #374151;
          font-weight: 700;
          padding: 8px 7px;
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #d1d5db;
          text-align: left;
          white-space: nowrap;
        }

        .pt-table td {
          padding: 7px;
          border-right: 1px solid #eef0f2;
          border-bottom: 1px solid #eef0f2;
          vertical-align: top;
          color: #374151;
        }

        .pt-table tbody tr:hover {
          background: #fafafa;
        }

        .pt-number {
          text-align: right;
          white-space: nowrap;
        }

        .pt-customer {
          font-weight: 600;
          color: #111827;
          min-width: 150px;
        }

        .pt-muted {
          margin-top: 2px;
          color: #6b7280;
          font-size: 10px;
        }

        .pt-products {
          min-width: 190px;
        }

        .pt-product {
          padding: 5px 0;
          border-bottom: 1px dashed #e5e7eb;
        }

        .pt-product:last-child {
          border-bottom: 0;
        }

        .pt-product strong {
          display: block;
          color: #111827;
          font-size: 11px;
        }

        .pt-product span {
          display: block;
          margin-top: 2px;
          color: #6b7280;
          font-size: 10px;
        }

        .pt-status {
          display: inline-block;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .pt-status.draft {
          background: #f3f4f6;
          color: #374151;
        }

        .pt-status.partial {
          background: #fef3c7;
          color: #92400e;
        }

        .pt-status.packed {
          background: #dcfce7;
          color: #166534;
        }

        .pt-status.cancelled {
          background: #fee2e2;
          color: #991b1b;
        }

        .pt-actions {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          min-width: 180px;
        }

        .pt-action {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #fff;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .pt-action:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pt-action.edit {
          color: #1d4ed8;
        }

        .pt-action.print {
          color: #374151;
        }

        .pt-action.cancel {
          color: #b45309;
        }

        .pt-action.delete {
          color: #dc2626;
        }

        .pt-empty {
          text-align: center;
          padding: 28px;
          color: #6b7280;
        }

        @media (max-width: 700px) {
          .pt-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .pt-search-wrap {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}