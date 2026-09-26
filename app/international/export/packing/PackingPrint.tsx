"use client";

import React from "react";
import { ExportPacking } from "./PackingTypes";

type PackingPrintProps = {
  packing: ExportPacking;
  onClose: () => void;
};

function formatDate(value: string): string {
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
  return Number(value || 0).toFixed(decimals);
}

export default function PackingPrint({
  packing,
  onClose,
}: PackingPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="packing-print-overlay">
        <div className="packing-print-toolbar no-print">
          <button
            type="button"
            className="packing-print-btn secondary"
            onClick={onClose}
          >
            ← Close
          </button>

          <button
            type="button"
            className="packing-print-btn primary"
            onClick={handlePrint}
          >
            🖨 Print Packing List
          </button>
        </div>

        <div className="packing-paper">
          {/* =========================
              HEADER
          ========================= */}

          <div className="packing-header">
            <div className="company-block">
              <div className="company-name">
                UK EXIM ENTERPRISES
              </div>

              <div className="company-subtitle">
                Export Packing List
              </div>
            </div>

            <div className="document-meta">
              <div>
                <strong>Packing No.</strong>
                <span>
                  {packing.packingNo}
                </span>
              </div>

              <div>
                <strong>Packing Date</strong>
                <span>
                  {formatDate(
                    packing.packingDate
                  )}
                </span>
              </div>

              <div>
                <strong>Status</strong>
                <span>
                  {packing.status}
                </span>
              </div>
            </div>
          </div>

          {/* =========================
              REFERENCE DETAILS
          ========================= */}

          <section className="print-section">
            <div className="section-title">
              Shipment Reference
            </div>

            <div className="info-grid">
              <div className="info-item">
                <label>
                  Export Order No.
                </label>
                <span>
                  {packing.exportOrderNo ||
                    "-"}
                </span>
              </div>

              <div className="info-item">
                <label>
                  Export Order Date
                </label>
                <span>
                  {formatDate(
                    packing.exportOrderDate
                  ) || "-"}
                </span>
              </div>

              <div className="info-item">
                <label>
                  Reservation No.
                </label>
                <span>
                  {packing.reservationNo ||
                    "-"}
                </span>
              </div>

              <div className="info-item">
                <label>
                  Reservation Date
                </label>
                <span>
                  {formatDate(
                    packing.reservationDate
                  ) || "-"}
                </span>
              </div>
            </div>
          </section>

          {/* =========================
              BUYER DETAILS
          ========================= */}

          <section className="print-section">
            <div className="section-title">
              Buyer / Customer
            </div>

            <div className="info-grid">
              <div className="info-item">
                <label>
                  Customer Code
                </label>
                <span>
                  {packing.customerCode ||
                    "-"}
                </span>
              </div>

              <div className="info-item wide">
                <label>
                  Customer Name
                </label>
                <span>
                  {packing.customerName ||
                    "-"}
                </span>
              </div>

              <div className="info-item">
                <label>
                  Contact Person
                </label>
                <span>
                  {packing.contactPerson ||
                    "-"}
                </span>
              </div>

              <div className="info-item">
                <label>
                  Country
                </label>
                <span>
                  {packing.buyerCountry ||
                    "-"}
                </span>
              </div>
            </div>
          </section>

          {/* =========================
              GOODS TABLE
          ========================= */}

          <section className="print-section">
            <div className="section-title">
              Packing Details
            </div>

            <table className="goods-table">
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Product</th>
                  <th>HSN</th>
                  <th>Lot / Batch</th>
                  <th>Packing</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Packages</th>
                  <th>Net KG / Pkg</th>
                  <th>Total Net KG</th>
                  <th>Gross KG</th>
                  <th>CBM</th>
                </tr>
              </thead>

              <tbody>
                {packing.items.map(
                  (item, index) => (
                    <tr
                      key={`${item.productCode}-${index}`}
                    >
                      <td className="center">
                        {index + 1}
                      </td>

                      <td>
                        <div className="product-name">
                          {
                            item.productName
                          }
                        </div>

                        <div className="product-code">
                          {
                            item.productCode
                          }
                        </div>
                      </td>

                      <td>
                        {item.hsCode || "-"}
                      </td>

                      <td>
                        {item.lotBatchNo ||
                          "-"}
                      </td>

                      <td>
                        {item.packingType ||
                          "-"}
                      </td>

                      <td className="right">
                        {formatNumber(
                          item.packedQty
                        )}
                      </td>

                      <td className="center">
                        {item.unit || "-"}
                      </td>

                      <td className="right">
                        {formatNumber(
                          item.packageQty,
                          0
                        )}
                      </td>

                      <td className="right">
                        {formatNumber(
                          item.netWeightPerPackage
                        )}
                      </td>

                      <td className="right">
                        {formatNumber(
                          item.totalNetWeight
                        )}
                      </td>

                      <td className="right">
                        {formatNumber(
                          item.grossWeight
                        )}
                      </td>

                      <td className="right">
                        {formatNumber(
                          item.cbm
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </section>

          {/* =========================
              PRODUCT SPECIFICATIONS
          ========================= */}

          {packing.items.some(
            (item) =>
              item.grade ||
              item.brand ||
              item.specification
          ) && (
            <section className="print-section">
              <div className="section-title">
                Product Specifications
              </div>

              <table className="spec-table">
                <thead>
                  <tr>
                    <th>
                      Product
                    </th>
                    <th>
                      Grade
                    </th>
                    <th>
                      Brand
                    </th>
                    <th>
                      Specification
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {packing.items.map(
                    (item, index) => (
                      <tr
                        key={`spec-${item.productCode}-${index}`}
                      >
                        <td>
                          {
                            item.productName
                          }
                        </td>

                        <td>
                          {item.grade ||
                            "-"}
                        </td>

                        <td>
                          {item.brand ||
                            "-"}
                        </td>

                        <td>
                          {item.specification ||
                            "-"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
          )}

          {/* =========================
              MARKS & NUMBERS
          ========================= */}

          {packing.marksNumbers && (
            <section className="print-section">
              <div className="section-title">
                Marks & Numbers
              </div>

              <div className="text-box">
                {packing.marksNumbers}
              </div>
            </section>
          )}

          {/* =========================
              SUMMARY
          ========================= */}

          <section className="print-section">
            <div className="section-title">
              Packing Summary
            </div>

            <div className="summary-grid">
              <div className="summary-box">
                <label>
                  Total Packages
                </label>

                <strong>
                  {formatNumber(
                    packing.totalPackages,
                    0
                  )}
                </strong>
              </div>

              <div className="summary-box">
                <label>
                  Total Net Weight
                </label>

                <strong>
                  {formatNumber(
                    packing.totalNetWeight
                  )}{" "}
                  KG
                </strong>
              </div>

              <div className="summary-box">
                <label>
                  Total Gross Weight
                </label>

                <strong>
                  {formatNumber(
                    packing.totalGrossWeight
                  )}{" "}
                  KG
                </strong>
              </div>

              <div className="summary-box">
                <label>
                  Total CBM
                </label>

                <strong>
                  {formatNumber(
                    packing.totalCBM
                  )}
                </strong>
              </div>
            </div>
          </section>

          {/* =========================
              REMARKS
          ========================= */}

          {packing.remarks && (
            <section className="print-section">
              <div className="section-title">
                Remarks
              </div>

              <div className="text-box">
                {packing.remarks}
              </div>
            </section>
          )}

          {/* =========================
              DECLARATION
          ========================= */}

          <div className="declaration">
            We certify that the above
            packing details are based on
            the actual packing carried out
            against the referenced Export
            Reservation.
          </div>

          {/* =========================
              SIGNATURE
          ========================= */}

          <div className="signature-area">
            <div className="signature-line">
              Authorized Signatory
            </div>
          </div>

          {/* =========================
              FOOTER
          ========================= */}

          <div className="print-footer">
            UK EXIM ENTERPRISES — Export
            Packing List
          </div>
        </div>
      </div>

      <style jsx>{`
        .packing-print-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          overflow: auto;
          background: #eef1f5;
          padding: 18px;
          box-sizing: border-box;
        }

        .packing-print-toolbar {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto 12px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .packing-print-btn {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 13px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: #fff;
        }

        .packing-print-btn.primary {
          background: #1d4ed8;
          border-color: #1d4ed8;
          color: #fff;
        }

        .packing-print-btn.secondary {
          color: #374151;
        }

        .packing-paper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 9mm;
          box-sizing: border-box;
          background: #fff;
          color: #111827;
          box-shadow:
            0 2px 12px
            rgba(0, 0, 0, 0.12);
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-size: 8.5px;
          line-height: 1.3;
        }

        .packing-header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 7px;
          border-bottom: 1.5px solid #111827;
        }

        .company-name {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        .company-subtitle {
          margin-top: 3px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .document-meta {
          min-width: 145px;
          font-size: 8px;
        }

        .document-meta > div {
          display: grid;
          grid-template-columns: 72px 1fr;
          gap: 5px;
          margin-bottom: 2px;
        }

        .document-meta span {
          font-weight: 600;
        }

        .print-section {
          margin-top: 7px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .section-title {
          padding: 4px 6px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15px;
        }

        .info-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          border-left: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
        }

        .info-item {
          min-height: 30px;
          padding: 4px 6px;
          box-sizing: border-box;
          border-right: 1px solid #d1d5db;
          border-top: 1px solid #d1d5db;
        }

        .info-item.wide {
          grid-column: span 2;
        }

        .info-item label {
          display: block;
          color: #6b7280;
          font-size: 7px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }

        .info-item span {
          display: block;
          font-weight: 600;
          font-size: 8px;
          word-break: break-word;
        }

        .goods-table,
        .spec-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .goods-table {
          font-size: 6.8px;
        }

        .goods-table th,
        .goods-table td,
        .spec-table th,
        .spec-table td {
          border: 1px solid #9ca3af;
          padding: 3px 3px;
          vertical-align: middle;
          word-break: break-word;
        }

        .goods-table th,
        .spec-table th {
          background: #f3f4f6;
          font-weight: 800;
          text-align: center;
        }

        .goods-table th:nth-child(1) {
          width: 4%;
        }

        .goods-table th:nth-child(2) {
          width: 17%;
        }

        .goods-table th:nth-child(3) {
          width: 7%;
        }

        .goods-table th:nth-child(4) {
          width: 9%;
        }

        .goods-table th:nth-child(5) {
          width: 9%;
        }

        .goods-table th:nth-child(6) {
          width: 8%;
        }

        .goods-table th:nth-child(7) {
          width: 5%;
        }

        .goods-table th:nth-child(8) {
          width: 7%;
        }

        .goods-table th:nth-child(9) {
          width: 9%;
        }

        .goods-table th:nth-child(10) {
          width: 10%;
        }

        .goods-table th:nth-child(11) {
          width: 8%;
        }

        .goods-table th:nth-child(12) {
          width: 7%;
        }

        .center {
          text-align: center;
        }

        .right {
          text-align: right;
          white-space: nowrap;
        }

        .product-name {
          font-weight: 700;
        }

        .product-code {
          margin-top: 1px;
          color: #6b7280;
          font-size: 6px;
        }

        .spec-table {
          font-size: 7px;
        }

        .text-box {
          border: 1px solid #d1d5db;
          padding: 5px 6px;
          min-height: 20px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 5px;
        }

        .summary-box {
          border: 1px solid #d1d5db;
          padding: 6px;
          text-align: center;
        }

        .summary-box label {
          display: block;
          color: #6b7280;
          font-size: 6.5px;
          margin-bottom: 2px;
        }

        .summary-box strong {
          display: block;
          font-size: 9px;
        }

        .declaration {
          margin-top: 10px;
          padding: 6px;
          border: 1px solid #d1d5db;
          font-size: 7px;
          line-height: 1.4;
        }

        .signature-area {
          margin-top: 25px;
          display: flex;
          justify-content: flex-end;
        }

        .signature-line {
          width: 48mm;
          padding-top: 18px;
          border-top: 1px solid #374151;
          text-align: center;
          font-size: 7.5px;
          font-weight: 700;
        }

        .print-footer {
          margin-top: 10px;
          padding-top: 5px;
          border-top: 1px solid #d1d5db;
          text-align: center;
          color: #6b7280;
          font-size: 6.5px;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden;
          }

          .packing-print-overlay,
          .packing-print-overlay * {
            visibility: visible;
          }

          .packing-print-overlay {
            position: absolute;
            inset: 0;
            overflow: visible;
            padding: 0;
            background: #fff;
          }

          .no-print {
            display: none !important;
          }

          .packing-paper {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 9mm;
            box-shadow: none;
          }

          .print-section,
          .packing-header,
          .goods-table tr,
          .spec-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .goods-table thead,
          .spec-table thead {
            display: table-header-group;
          }
        }

        @media (max-width: 700px) {
          .packing-print-overlay {
            padding: 8px;
          }

          .packing-paper {
            width: 100%;
            min-width: 900px;
          }

          .packing-print-toolbar {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}