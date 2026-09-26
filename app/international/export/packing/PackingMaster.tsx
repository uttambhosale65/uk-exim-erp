"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ExportPacking,
} from "./PackingTypes";

import {
  cancelPacking,
  deletePacking,
  loadPackings,
  savePackings,
  syncReservationStatuses,
} from "./PackingStorage";

import PackingForm from "./PackingForm";
import PackingTable from "./PackingTable";

type ViewMode =
  | "REGISTER"
  | "FORM";

export default function PackingMaster() {
  const [
    packings,
    setPackings,
  ] = useState<ExportPacking[]>([]);

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>(
    "REGISTER"
  );

  const [
    editingPacking,
    setEditingPacking,
  ] =
    useState<ExportPacking | null>(
      null
    );

  const [
    printPacking,
    setPrintPacking,
  ] =
    useState<ExportPacking | null>(
      null
    );

  /* =====================================
     LOAD
  ===================================== */

  const loadData = () => {
    syncReservationStatuses();

    const stored =
      loadPackings();

    setPackings(stored);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================
     SUMMARY
  ===================================== */

  const summary = useMemo(() => {
    const active =
      packings.filter(
        (packing) =>
          packing.status !==
          "Cancelled"
      );

    const packed =
      active.filter(
        (packing) =>
          packing.status ===
          "Packed"
      ).length;

    const partial =
      active.filter(
        (packing) =>
          packing.status ===
          "Partially Packed"
      ).length;

    const totalPackages =
      active.reduce(
        (sum, packing) =>
          sum +
          Number(
            packing.totalPackages || 0
          ),
        0
      );

    const totalNetWeight =
      active.reduce(
        (sum, packing) =>
          sum +
          Number(
            packing.totalNetWeight || 0
          ),
        0
      );

    const totalGrossWeight =
      active.reduce(
        (sum, packing) =>
          sum +
          Number(
            packing.totalGrossWeight || 0
          ),
        0
      );

    return {
      total: active.length,
      packed,
      partial,
      totalPackages,
      totalNetWeight,
      totalGrossWeight,
    };
  }, [packings]);

  /* =====================================
     SAVE
  ===================================== */

  const handleSave = (
    packing: ExportPacking
  ) => {
    const current =
      loadPackings();

    const existingIndex =
      current.findIndex(
        (entry) =>
          entry.id === packing.id
      );

    let updated: ExportPacking[];

    if (existingIndex >= 0) {
      updated = [
        ...current,
      ];

      updated[
        existingIndex
      ] = packing;
    } else {
      updated = [
        packing,
        ...current,
      ];
    }

    savePackings(updated);

    syncReservationStatuses();

    setPackings(
      loadPackings()
    );

    setEditingPacking(null);
    setViewMode("REGISTER");
  };

  /* =====================================
     EDIT
  ===================================== */

  const handleEdit = (
    packing: ExportPacking
  ) => {
    if (
      packing.status ===
      "Cancelled"
    ) {
      return;
    }

    setEditingPacking(
      packing
    );

    setViewMode("FORM");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================
     CANCEL
  ===================================== */

  const handleCancel = (
    packing: ExportPacking
  ) => {
    cancelPacking(
      packing.id
    );

    setPackings(
      loadPackings()
    );
  };

  /* =====================================
     DELETE
  ===================================== */

  const handleDelete = (
    packing: ExportPacking
  ) => {
    if (
      packing.status !==
      "Cancelled"
    ) {
      return;
    }

    deletePacking(
      packing.id
    );

    setPackings(
      loadPackings()
    );
  };

  /* =====================================
     PRINT
  ===================================== */

  const handlePrint = (
    packing: ExportPacking
  ) => {
    setPrintPacking(
      packing
    );
  };

  /* =====================================
     NEW PACKING
  ===================================== */

  const handleNewPacking = () => {
    setEditingPacking(null);
    setViewMode("FORM");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================
     BACK TO REGISTER
  ===================================== */

  const handleBackToRegister =
    () => {
      setEditingPacking(null);
      setViewMode("REGISTER");
      setPrintPacking(null);

      loadData();
    };

  /* =====================================
     PRINT WINDOW
  ===================================== */

  useEffect(() => {
    if (!printPacking) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        window.print();
      }, 250);

    return () =>
      window.clearTimeout(
        timer
      );
  }, [printPacking]);

  /* =====================================
     FORM VIEW
  ===================================== */

  if (
    viewMode === "FORM"
  ) {
    return (
      <div className="pm-page">
        <div className="pm-topbar">
          <div>
            <h1>
              Export Packing
            </h1>

            <p>
              Actual Packing against
              Export Reservation
            </p>
          </div>

          <button
            type="button"
            className="pm-back-btn"
            onClick={
              handleBackToRegister
            }
          >
            ← Packing Register
          </button>
        </div>

        <PackingForm
          initialData={
            editingPacking
          }
          onSave={handleSave}
          onCancel={
            handleBackToRegister
          }
        />

        <style jsx>{`
          .pm-page {
            width: 100%;
            box-sizing: border-box;
          }

          .pm-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 0 18px 8px;
          }

          .pm-topbar h1 {
            margin: 0;
            color: #111827;
            font-size: 21px;
            font-weight: 700;
          }

          .pm-topbar p {
            margin: 3px 0 0;
            color: #6b7280;
            font-size: 12px;
          }

          .pm-back-btn {
            border: 1px solid #d1d5db;
            background: #fff;
            color: #374151;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          }

          .pm-back-btn:hover {
            background: #f9fafb;
          }

          @media (max-width: 700px) {
            .pm-topbar {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    );
  }

  /* =====================================
     REGISTER VIEW
  ===================================== */

  return (
    <div className="pm-page">
      <div className="pm-header">
        <div>
          <h1>
            Export Packing
          </h1>

          <p>
            Manage actual packing
            against Export Reservations
          </p>
        </div>

        <button
          type="button"
          className="pm-new-btn"
          onClick={
            handleNewPacking
          }
        >
          + New Packing
        </button>
      </div>

      {/* =================================
          SUMMARY CARDS
      ================================= */}

      <div className="pm-summary">
        <div className="pm-card">
          <span>
            Active Packings
          </span>

          <strong>
            {summary.total}
          </strong>
        </div>

        <div className="pm-card">
          <span>
            Fully Packed
          </span>

          <strong>
            {summary.packed}
          </strong>
        </div>

        <div className="pm-card">
          <span>
            Partially Packed
          </span>

          <strong>
            {summary.partial}
          </strong>
        </div>

        <div className="pm-card">
          <span>
            Total Packages
          </span>

          <strong>
            {summary.totalPackages.toFixed(
              0
            )}
          </strong>
        </div>

        <div className="pm-card">
          <span>
            Total Net Weight
          </span>

          <strong>
            {summary.totalNetWeight.toFixed(
              3
            )}{" "}
            KG
          </strong>
        </div>

        <div className="pm-card">
          <span>
            Total Gross Weight
          </span>

          <strong>
            {summary.totalGrossWeight.toFixed(
              3
            )}{" "}
            KG
          </strong>
        </div>
      </div>

      {/* =================================
          REGISTER
      ================================= */}

      <PackingTable
        packings={packings}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onPrint={handlePrint}
      />

      {/* =================================
          PRINT DATA
      ================================= */}

      {printPacking && (
        <div className="pm-print-layer">
          <div className="pm-print-page">
            <div className="pm-print-header">
              <div>
                <div className="pm-company-name">
                  UK EXIM ENTERPRISES
                </div>

                <div className="pm-document-title">
                  EXPORT PACKING LIST
                </div>
              </div>

              <div className="pm-print-meta">
                <div>
                  <strong>
                    Packing No:
                  </strong>{" "}
                  {
                    printPacking.packingNo
                  }
                </div>

                <div>
                  <strong>
                    Date:
                  </strong>{" "}
                  {formatDate(
                    printPacking.packingDate
                  )}
                </div>
              </div>
            </div>

            <div className="pm-print-info">
              <div>
                <strong>
                  Export Order:
                </strong>{" "}
                {
                  printPacking.exportOrderNo
                }
              </div>

              <div>
                <strong>
                  Reservation:
                </strong>{" "}
                {
                  printPacking.reservationNo
                }
              </div>

              <div>
                <strong>
                  Customer:
                </strong>{" "}
                {
                  printPacking.customerName
                }
              </div>

              <div>
                <strong>
                  Country:
                </strong>{" "}
                {
                  printPacking.buyerCountry
                }
              </div>
            </div>

            <table className="pm-print-table">
              <thead>
                <tr>
                  <th>
                    Sr.
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    HSN
                  </th>

                  <th>
                    Lot / Batch
                  </th>

                  <th>
                    Packed Qty
                  </th>

                  <th>
                    Unit
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
                </tr>
              </thead>

              <tbody>
                {printPacking.items.map(
                  (
                    item,
                    index
                  ) => (
                    <tr
                      key={`${item.productCode}-${index}`}
                    >
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {
                          item.productName
                        }
                        <div className="pm-small">
                          {
                            item.productCode
                          }
                        </div>
                      </td>

                      <td>
                        {
                          item.hsCode
                        }
                      </td>

                      <td>
                        {
                          item.lotBatchNo ||
                          "-"
                        }
                      </td>

                      <td>
                        {Number(
                          item.packedQty ||
                            0
                        ).toFixed(
                          3
                        )}
                      </td>

                      <td>
                        {
                          item.unit
                        }
                      </td>

                      <td>
                        {Number(
                          item.packageQty ||
                            0
                        ).toFixed(
                          0
                        )}
                      </td>

                      <td>
                        {Number(
                          item.totalNetWeight ||
                            0
                        ).toFixed(
                          3
                        )}
                      </td>

                      <td>
                        {Number(
                          item.grossWeight ||
                            0
                        ).toFixed(
                          3
                        )}
                      </td>

                      <td>
                        {Number(
                          item.cbm || 0
                        ).toFixed(
                          3
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div className="pm-print-summary">
              <div>
                <strong>
                  Total Packages:
                </strong>{" "}
                {printPacking.totalPackages.toFixed(
                  0
                )}
              </div>

              <div>
                <strong>
                  Total Net Weight:
                </strong>{" "}
                {printPacking.totalNetWeight.toFixed(
                  3
                )}{" "}
                KG
              </div>

              <div>
                <strong>
                  Total Gross Weight:
                </strong>{" "}
                {printPacking.totalGrossWeight.toFixed(
                  3
                )}{" "}
                KG
              </div>

              <div>
                <strong>
                  Total CBM:
                </strong>{" "}
                {printPacking.totalCBM.toFixed(
                  3
                )}
              </div>
            </div>

            {printPacking.marksNumbers && (
              <div className="pm-print-note">
                <strong>
                  Marks & Numbers:
                </strong>{" "}
                {
                  printPacking.marksNumbers
                }
              </div>
            )}

            {printPacking.remarks && (
              <div className="pm-print-note">
                <strong>
                  Remarks:
                </strong>{" "}
                {
                  printPacking.remarks
                }
              </div>
            )}

            <div className="pm-print-sign">
              Authorized Signatory
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pm-page {
          width: 100%;
          box-sizing: border-box;
        }

        .pm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
        }

        .pm-header h1 {
          margin: 0;
          color: #111827;
          font-size: 22px;
          font-weight: 700;
        }

        .pm-header p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 12px;
        }

        .pm-new-btn {
          border: 1px solid #1d4ed8;
          background: #1d4ed8;
          color: #fff;
          border-radius: 6px;
          padding: 9px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .pm-new-btn:hover {
          background: #1e40af;
        }

        .pm-summary {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .pm-card {
          min-width: 0;
          padding: 11px 12px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
        }

        .pm-card span {
          display: block;
          margin-bottom: 5px;
          color: #6b7280;
          font-size: 10px;
        }

        .pm-card strong {
          display: block;
          color: #111827;
          font-size: 17px;
          line-height: 1.2;
        }

        .pm-print-layer {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #fff;
          overflow: auto;
          padding: 20px;
        }

        .pm-print-page {
          width: 190mm;
          min-height: 277mm;
          margin: 0 auto;
          padding: 10mm;
          box-sizing: border-box;
          background: #fff;
          color: #111827;
          font-size: 9px;
        }

        .pm-print-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 8px;
          border-bottom: 1px solid #111827;
        }

        .pm-company-name {
          font-size: 18px;
          font-weight: 800;
        }

        .pm-document-title {
          margin-top: 3px;
          font-size: 12px;
          font-weight: 700;
        }

        .pm-print-meta {
          text-align: right;
          line-height: 1.6;
        }

        .pm-print-info {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 5px 15px;
          padding: 10px 0;
        }

        .pm-print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }

        .pm-print-table th,
        .pm-print-table td {
          border: 1px solid #9ca3af;
          padding: 4px;
          text-align: left;
        }

        .pm-print-table th {
          background: #f3f4f6;
          font-weight: 700;
        }

        .pm-small {
          margin-top: 2px;
          color: #6b7280;
          font-size: 7px;
        }

        .pm-print-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
          padding: 8px;
          border: 1px solid #d1d5db;
        }

        .pm-print-note {
          margin-top: 8px;
          padding: 7px;
          border: 1px solid #d1d5db;
        }

        .pm-print-sign {
          margin-top: 45px;
          text-align: right;
          font-weight: 700;
        }

        @media (max-width: 1100px) {
          .pm-summary {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .pm-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .pm-summary {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }

          .pm-print-layer,
          .pm-print-layer * {
            visibility: visible;
          }

          .pm-print-layer {
            position: absolute;
            inset: 0;
            padding: 0;
            overflow: visible;
          }

          .pm-print-page {
            width: 190mm;
            min-height: 277mm;
            margin: 0 auto;
            padding: 10mm;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================
   LOCAL DATE FORMAT HELPER
========================================= */

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