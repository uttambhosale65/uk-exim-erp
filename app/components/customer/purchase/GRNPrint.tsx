"use client";

/* =========================================================
   UK EXIM ERP – GRN PRINT
   VERSION 1.0 – PROFESSIONAL ERP

   GRN / GOODS RECEIPT NOTE PRINT MODULE

   Features:
   - A4 Landscape Print
   - Multi Product GRN
   - Supplier Details
   - Product-wise Details
   - Amount / GST / Net Amount
   - GRN Total
   - Remarks
   - 3 Signature Columns
========================================================= */

import React from "react";
import { Purchase } from "./PurchaseTypes";

/* =========================================================
   PROPS
========================================================= */

type GRNPrintProps = {
  purchase: Purchase;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function GRNPrint({
  purchase,
}: GRNPrintProps) {
  /* =======================================================
     SAFE DATA
  ======================================================= */

  const items = purchase.items ?? [];

  const totalQty = Number(
    purchase.totalQty ?? 0
  );

  const totalAmount = Number(
    purchase.totalAmount ?? 0
  );

  const totalGST = Number(
    purchase.totalGstAmount ?? 0
  );

  const totalNetAmount = Number(
    purchase.totalNetAmount ?? 0
  );

  /* =======================================================
     PRINT
  ======================================================= */

  const handlePrint = () => {
    window.print();
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      {/* ===================================================
          PRINT BUTTON
      =================================================== */}

      <div className="grn-print-button-wrapper">
        <button
          type="button"
          onClick={handlePrint}
          className="grn-print-button"
        >
          🖨️ Print GRN
        </button>
      </div>

      {/* ===================================================
          GRN PAGE
      =================================================== */}

      <div className="grn-print-page">

        {/* =================================================
            COMPANY HEADER
        ================================================= */}

        <div className="company-header">

          <div className="company-name">
            UK EXIM ENTERPRISES
          </div>

          <div className="company-subtitle">
            Purchase / Goods Receipt Note
          </div>

          <div className="document-title">
            GOODS RECEIPT NOTE
          </div>

        </div>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <div className="information-grid">

          {/* GRN INFORMATION */}

          <div className="information-box">

            <div className="box-title">
              GRN INFORMATION
            </div>

            <div className="info-row">
              <span className="info-label">
                GRN No.
              </span>

              <span className="info-value bold">
                {purchase.purchaseNo || "-"}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                GRN Date
              </span>

              <span className="info-value">
                {purchase.purchaseDate || "-"}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                Invoice No.
              </span>

              <span className="info-value">
                {purchase.invoiceNo || "-"}
              </span>
            </div>

          </div>

          {/* SUPPLIER INFORMATION */}

          <div className="information-box">

            <div className="box-title">
              SUPPLIER INFORMATION
            </div>

            <div className="info-row">
              <span className="info-label">
                Supplier Code
              </span>

              <span className="info-value">
                {purchase.supplierCode || "-"}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                Supplier Name
              </span>

              <span className="info-value bold">
                {purchase.supplierName || "-"}
              </span>
            </div>

          </div>

        </div>

        {/* =================================================
            PRODUCT TABLE
        ================================================= */}

        <table className="grn-table">

          <thead>
            <tr>

              <th className="col-sno">
                #
              </th>

              <th className="col-product-code">
                Product Code
              </th>

              <th className="col-product">
                Product
              </th>

              <th className="col-hsn">
                HSN
              </th>

              <th className="col-unit">
                Unit
              </th>

              <th className="col-qty">
                Qty
              </th>

              <th className="col-rate">
                Rate
              </th>

              <th className="col-amount">
                Amount
              </th>

              <th className="col-gst">
                GST %
              </th>

              <th className="col-gst-amount">
                GST Amount
              </th>

              <th className="col-net">
                Net Amount
              </th>

            </tr>
          </thead>

          <tbody>

            {items.length === 0 ? (

              <tr>
                <td
                  colSpan={11}
                  className="empty-row"
                >
                  No Product Items
                </td>
              </tr>

            ) : (

              items.map((item, index) => (

                <tr
                  key={`${purchase.id}-${item.productCode}-${index}`}
                >

                  <td className="text-center">
                    {index + 1}
                  </td>

                  <td>
                    {item.productCode || "-"}
                  </td>

                  <td className="product-name">
                    {item.productName || "-"}
                  </td>

                  <td className="text-center">
                    {item.hsn || "-"}
                  </td>

                  <td className="text-center">
                    {item.unit || "-"}
                  </td>

                  <td className="text-right">
                    {Number(
                      item.qty ?? 0
                    ).toFixed(2)}
                  </td>

                  <td className="text-right">
                    ₹
                    {Number(
                      item.rate ?? 0
                    ).toFixed(2)}
                  </td>

                  <td className="text-right">
                    ₹
                    {Number(
                      item.amount ?? 0
                    ).toFixed(2)}
                  </td>

                  <td className="text-center">
                    {Number(
                      item.gst ?? 0
                    ).toFixed(2)}
                    %
                  </td>

                  <td className="text-right">
                    ₹
                    {Number(
                      item.gstAmount ?? 0
                    ).toFixed(2)}
                  </td>

                  <td className="text-right bold">
                    ₹
                    {Number(
                      item.netAmount ?? 0
                    ).toFixed(2)}
                  </td>

                </tr>

              ))

            )}

          </tbody>

          {/* =================================================
              TOTAL
          ================================================= */}

          <tfoot>

            <tr className="total-row">

              <td
                colSpan={5}
                className="total-label"
              >
                GRN TOTAL
              </td>

              <td className="text-right">
                {totalQty.toFixed(2)}
              </td>

              <td className="text-right">
                -
              </td>

              <td className="text-right">
                ₹
                {totalAmount.toFixed(2)}
              </td>

              <td className="text-center">
                -
              </td>

              <td className="text-right">
                ₹
                {totalGST.toFixed(2)}
              </td>

              <td className="text-right bold">
                ₹
                {totalNetAmount.toFixed(2)}
              </td>

            </tr>

          </tfoot>

        </table>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="summary-section">

          <div className="summary-box">

            <div className="summary-row">
              <span>
                Total Quantity
              </span>

              <strong>
                {totalQty.toFixed(2)}
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Total Amount
              </span>

              <strong>
                ₹
                {totalAmount.toFixed(2)}
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Total GST
              </span>

              <strong>
                ₹
                {totalGST.toFixed(2)}
              </strong>
            </div>

            <div className="summary-row grand-total">
              <span>
                NET PURCHASE
              </span>

              <strong>
                ₹
                {totalNetAmount.toFixed(2)}
              </strong>
            </div>

          </div>

        </div>

        {/* =================================================
            REMARKS
        ================================================= */}

        <div className="remarks-box">

          <div className="remarks-title">
            Remarks
          </div>

          <div className="remarks-content">
            {purchase.remarks || "-"}
          </div>

        </div>

        {/* =================================================
            SIGNATURE SECTION
            3 COLUMNS
        ================================================= */}

        <div className="signature-section">

          <div className="signature-box">

            <div className="signature-line"></div>

            <div>
              Prepared By
            </div>

          </div>

          <div className="signature-box">

            <div className="signature-line"></div>

            <div>
              Checked By
            </div>

          </div>

          <div className="signature-box">

            <div className="signature-line"></div>

            <div>
              Authorised Signatory
            </div>

          </div>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="grn-footer">

          <span>
            UK EXIM ENTERPRISES
          </span>

          <span>
            GRN: {purchase.purchaseNo || "-"}
          </span>

          <span>
            Printed Document
          </span>

        </div>

      </div>

      {/* ===================================================
          CSS
      =================================================== */}

      <style jsx>{`

        /* =====================================================
           SCREEN
        ===================================================== */

        .grn-print-button-wrapper {
          width: 100%;
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .grn-print-button {
          background: #14532d;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .grn-print-button:hover {
          background: #166534;
        }

        .grn-print-page {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px;
          box-sizing: border-box;
          background: #ffffff;
          color: #111827;
          border: 1px solid #d1d5db;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .company-header {
          text-align: center;
          border-bottom: 2px solid #14532d;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }

        .company-name {
          font-size: 24px;
          font-weight: 800;
          color: #14532d;
        }

        .company-subtitle {
          margin-top: 3px;
          font-size: 12px;
          color: #4b5563;
        }

        .document-title {
          margin-top: 7px;
          font-size: 17px;
          font-weight: 800;
          color: #111827;
          letter-spacing: 1px;
        }

        /* =====================================================
           INFORMATION
        ===================================================== */

        .information-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .information-box {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
        }

        .box-title {
          background: #f0fdf4;
          color: #14532d;
          font-size: 10px;
          font-weight: 800;
          padding: 6px 8px;
          border-bottom: 1px solid #cbd5e1;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 5px 8px;
          min-height: 18px;
          border-bottom: 1px solid #eef2f7;
          font-size: 10px;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #6b7280;
          font-weight: 600;
        }

        .info-value {
          color: #111827;
          text-align: right;
        }

        .bold {
          font-weight: 700;
        }

        /* =====================================================
           TABLE
        ===================================================== */

        .grn-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 9px;
          margin-top: 4px;
        }

        .grn-table th {
          background: #14532d;
          color: #ffffff;
          border: 1px solid #14532d;
          padding: 6px 4px;
          font-weight: 700;
          text-align: center;
        }

        .grn-table td {
          border: 1px solid #cbd5e1;
          padding: 5px 4px;
          vertical-align: middle;
          overflow-wrap: anywhere;
        }

        .grn-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .grn-table tbody tr:nth-child(odd) {
          background: #ffffff;
        }

        .grn-table tfoot td {
          border: 1px solid #94a3b8;
          background: #ecfdf5;
          padding: 6px 4px;
          font-weight: 700;
        }

        .empty-row {
          text-align: center;
          padding: 18px !important;
          color: #6b7280;
          font-weight: 600;
        }

        .product-name {
          font-weight: 600;
        }

        .text-center {
          text-align: center;
        }

        .text-right {
          text-align: right;
        }

        .total-row {
          background: #ecfdf5;
        }

        .total-label {
          text-align: right;
          color: #14532d;
          font-weight: 800;
        }

        /* =====================================================
           COLUMN WIDTH
        ===================================================== */

        .col-sno {
          width: 3%;
        }

        .col-product-code {
          width: 9%;
        }

        .col-product {
          width: 21%;
        }

        .col-hsn {
          width: 8%;
        }

        .col-unit {
          width: 7%;
        }

        .col-qty {
          width: 7%;
        }

        .col-rate {
          width: 9%;
        }

        .col-amount {
          width: 10%;
        }

        .col-gst {
          width: 6%;
        }

        .col-gst-amount {
          width: 10%;
        }

        .col-net {
          width: 10%;
        }

        /* =====================================================
           SUMMARY
        ===================================================== */

        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .summary-box {
          width: 310px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 9px;
          font-size: 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-row span {
          color: #4b5563;
        }

        .summary-row strong {
          color: #111827;
        }

        .grand-total {
          background: #f0fdf4;
          font-size: 11px;
          font-weight: 800;
        }

        .grand-total span,
        .grand-total strong {
          color: #14532d;
        }

        /* =====================================================
           REMARKS
        ===================================================== */

        .remarks-box {
          margin-top: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }

        .remarks-title {
          background: #f8fafc;
          color: #374151;
          font-size: 10px;
          font-weight: 700;
          padding: 5px 8px;
          border-bottom: 1px solid #cbd5e1;
        }

        .remarks-content {
          min-height: 28px;
          padding: 7px 8px;
          font-size: 10px;
          color: #374151;
        }

        /* =====================================================
           SIGNATURE
        ===================================================== */

        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 25px;
          margin-top: 42px;
          page-break-inside: avoid;
        }

        .signature-box {
          text-align: center;
          font-size: 10px;
          color: #374151;
          font-weight: 600;
        }

        .signature-line {
          height: 28px;
          border-bottom: 1px solid #374151;
          margin-bottom: 6px;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .grn-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding-top: 7px;
          border-top: 1px solid #d1d5db;
          font-size: 8px;
          color: #6b7280;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 900px) {

          .grn-print-page {
            padding: 15px;
          }

          .information-grid {
            grid-template-columns: 1fr;
          }

          .signature-section {
            gap: 12px;
          }

        }
/* =====================================================
   PRINT
===================================================== */

@media print {

  @page {
    size: A4 landscape;
    margin: 8mm;
  }

  /* ================================================
     GLOBAL PRINT RESET
  ================================================ */

  :global(html),
  :global(body) {
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  :global(body) {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ================================================
     HIDE EVERYTHING OUTSIDE GRN
  ================================================ */

  :global(body *) {
    visibility: hidden !important;
  }

  :global(#grn-print-root),
  :global(#grn-print-root *) {
    visibility: visible !important;
  }

  /* ================================================
     GRN PRINT AREA
  ================================================ */

  :global(#grn-print-root) {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;

    width: 100% !important;
    height: auto !important;

    margin: 0 !important;
    padding: 0 !important;

    background: #ffffff !important;
  }

  :global(.grn-print-page) {
    position: relative !important;

    width: 100% !important;
    max-width: none !important;

    height: auto !important;
    min-height: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    border: none !important;
    box-shadow: none !important;

    background: #ffffff !important;

    box-sizing: border-box !important;
  }

  /* ================================================
     HIDE PRINT BUTTON
  ================================================ */

  :global(.grn-print-button-wrapper) {
    display: none !important;
  }

  /* ================================================
     HEADER
  ================================================ */

  :global(.company-header) {
    margin-bottom: 6px !important;
    padding-bottom: 5px !important;
  }

  :global(.company-name) {
    font-size: 18px !important;
  }

  :global(.company-subtitle) {
    font-size: 9px !important;
  }

  :global(.document-title) {
    font-size: 13px !important;
    margin-top: 3px !important;
  }

  /* ================================================
     INFORMATION
  ================================================ */

  :global(.information-grid) {
    gap: 6px !important;
    margin-bottom: 6px !important;
  }

  :global(.box-title) {
    padding: 3px 5px !important;
    font-size: 8px !important;
  }

  :global(.info-row) {
    padding: 2px 5px !important;
    min-height: 0 !important;
    font-size: 8px !important;
  }

  /* ================================================
     TABLE
  ================================================ */

  :global(.grn-table) {
    width: 100% !important;
    font-size: 7px !important;
    margin-top: 1px !important;
  }

  :global(.grn-table th) {
    padding: 3px 2px !important;
  }

  :global(.grn-table td) {
    padding: 2px !important;
  }

  /* ================================================
     SUMMARY
  ================================================ */

  :global(.summary-section) {
    margin-top: 5px !important;
  }

  :global(.summary-box) {
    width: 250px !important;
  }

  :global(.summary-row) {
    padding: 3px 6px !important;
    font-size: 8px !important;
  }

  :global(.grand-total) {
    font-size: 9px !important;
  }

  /* ================================================
     REMARKS
  ================================================ */

  :global(.remarks-box) {
    margin-top: 5px !important;
  }

  :global(.remarks-title) {
    padding: 2px 5px !important;
    font-size: 8px !important;
  }

  :global(.remarks-content) {
    min-height: 14px !important;
    padding: 3px 5px !important;
    font-size: 8px !important;
  }

  /* ================================================
     SIGNATURE
  ================================================ */

  :global(.signature-section) {
    margin-top: 16px !important;
    gap: 14px !important;
  }

  :global(.signature-box) {
    font-size: 8px !important;
  }

  :global(.signature-line) {
    height: 18px !important;
    margin-bottom: 3px !important;
  }

  /* ================================================
     FOOTER
  ================================================ */

  :global(.grn-footer) {
    margin-top: 6px !important;
    padding-top: 3px !important;
    font-size: 7px !important;
  }

  /* ================================================
     PREVENT SPLIT
  ================================================ */

  :global(.grn-table),
  :global(.grn-table tr),
  :global(.information-box),
  :global(.summary-box),
  :global(.remarks-box),
  :global(.signature-section) {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}

      `}</style>
    </>
  );
}