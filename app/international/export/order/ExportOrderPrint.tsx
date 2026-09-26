"use client";

import React from "react";
import { ExportOrder } from "./ExportOrderTypes";

type ExportOrderPrintProps = {
  order: ExportOrder;
  onClose?: () => void;
};

function formatDate(value: string): string {
  if (!value) return "-";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

function money(value: number): string {
  return Number(value || 0).toFixed(2);
}

function number(value: number): string {
  return Number(value || 0).toFixed(3);
}

function safe(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
}

export default function ExportOrderPrint({
  order,
  onClose,
}: ExportOrderPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="eo-print-root">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .eo-print-root {
          min-height: 100vh;
          background: #e5e7eb;
          padding: 12px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        .eo-print-toolbar {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto 8px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .eo-print-toolbar button {
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background: #ffffff;
        }

        .eo-print-toolbar .eo-print-btn {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .eo-print-paper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 2mm;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
          font-size: 5.8px;
          zoom: 0.95;
        }

        .eo-company-header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding-bottom: 4px;
          border-bottom: 2px solid #111827;
        }

        .eo-company-name {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.3px;
          margin-bottom: 1.5px;
        }

        .eo-company-address {
          font-size: 6.2px;
          line-height: 1.45;
          color: #374151;
        }

        .eo-company-identifiers {
          margin-top: 2px;
          font-size: 6.5px;
          line-height: 1.4;
        }

        .eo-doc-heading {
          text-align: right;
          min-width: 65mm;
        }

        .eo-doc-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.6px;
          margin-bottom: 1.5px;
        }

        .eo-doc-number {
          font-size: 8px;
          font-weight: 700;
        }

        .eo-doc-date {
          margin-top: 3px;
          font-size: 6.2px;
        }

        .eo-section {
          margin-top: 2px;
          border: 1px solid #9ca3af;
        }

        .eo-section-title {
          padding: 2px 3px;
          background: #f1f5f9;
          border-bottom: 1px solid #9ca3af;
          font-size: 6.2px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.25px;
        }

        .eo-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .eo-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }

        .eo-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        .eo-field {
          min-height: 15px;
          padding: 1.5px 3px;
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
        }

        .eo-field:nth-last-child(-n + 4) {
          border-bottom: 0;
        }

        .eo-grid-2 .eo-field:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .eo-grid-3 .eo-field:nth-last-child(-n + 3) {
          border-bottom: 0;
        }

        .eo-grid-4 .eo-field:nth-child(4n) {
          border-right: 0;
        }

        .eo-grid-3 .eo-field:nth-child(3n) {
          border-right: 0;
        }

        .eo-grid-2 .eo-field:nth-child(2n) {
          border-right: 0;
        }

        .eo-field-label {
          display: block;
          font-size: 5.8px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 1px;
        }

        .eo-field-value {
          font-size: 6.5px;
          font-weight: 600;
          line-height: 1.15;
          word-break: break-word;
        }

        .eo-party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .eo-party {
          min-height: 40px;
          padding: 2px 3px;
        }

        .eo-party:first-child {
          border-right: 1px solid #d1d5db;
        }

        .eo-party-title {
          font-size: 6.5px;
          font-weight: 800;
          margin-bottom: 2px;
          text-transform: uppercase;
        }

        .eo-party-name {
          font-size: 8.5px;
          font-weight: 800;
          margin-bottom: 1.5px;
        }

        .eo-party-line {
          font-size: 6.5px;
          line-height: 1.15;
          color: #374151;
        }

        .eo-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .eo-table th {
          padding: 1.5px 1.5px;
          background: #f8fafc;
          border-right: 1px solid #9ca3af;
          border-bottom: 1px solid #9ca3af;
          font-size: 6.5px;
          font-weight: 800;
          text-align: center;
          vertical-align: middle;
        }

        .eo-table td {
          padding: 1.5px 2px;
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          font-size: 6.2px;
          vertical-align: top;
          line-height: 1.15;
          word-break: break-word;
        }

        .eo-table th:last-child,
        .eo-table td:last-child {
          border-right: 0;
        }

        .eo-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .eo-center {
          text-align: center;
        }

        .eo-right {
          text-align: right;
        }

        .eo-product-name {
          font-weight: 700;
        }

        .eo-product-code {
          margin-top: 1px;
          color: #6b7280;
          font-size: 5.8px;
        }

        .eo-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .eo-summary-left {
          border-right: 1px solid #d1d5db;
        }

        .eo-summary-row {
          display: grid;
          grid-template-columns: 1fr 28mm;
          min-height: 13px;
          border-bottom: 1px solid #d1d5db;
        }

        .eo-summary-row:last-child {
          border-bottom: 0;
        }

        .eo-summary-label {
          padding: 2.5px 4px;
          font-weight: 600;
        }

        .eo-summary-value {
          padding: 2.5px 4px;
          text-align: right;
          border-left: 1px solid #d1d5db;
          font-weight: 700;
        }

        .eo-total-row {
          background: #f1f5f9;
          font-size: 8px;
          font-weight: 800;
        }

        .eo-notes {
          padding: 4px 5px;
          min-height: 20px;
          font-size: 6.2px;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .eo-terms {
          padding: 1px 3px;
        }

        .eo-terms-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 18px;
        }

        .eo-term {
          display: flex;
          gap: 5px;
          font-size: 6.2px;
          line-height: 0.95;
          margin-bottom: 0px;
        }

        .eo-term-number {
          min-width: 12px;
          font-weight: 700;
        }

        .eo-signature {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: -8px;
        }

        .eo-signature-box {
          min-height: 8px;
          padding-top: 2px;
          border-top: 1px solid #6b7280;
          font-size: 6.2px;
          line-height: 1.4;
        }

        .eo-signature-right {
          text-align: right;
        }

        .eo-footer {
margin-top: -15px;
padding-top: 0;
          border-top: 1px solid #9ca3af;
          text-align: center;
          font-size: 5.8px;
          color: #6b7280;
          line-height: 1.15;
        }

        .eo-print-small {
          font-size: 6.5px;
          color: #6b7280;
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
            background: #ffffff !important;
          }

          .eo-print-root {
            min-height: auto;
            padding: 0;
            background: #ffffff;
          }

          .eo-print-toolbar {
            display: none !important;
          }

          .eo-print-paper {
            width: 210mm;
            min-height: 0;
            height: auto;
            margin: 0;
            padding: 2mm;
            box-shadow: none;
            page-break-after: avoid;
            break-after: avoid;
            overflow: visible;
          }

          /* Compact print layout: keep the complete Export Order on one A4 page. */
          .eo-section {
            margin-top: 1.5px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .eo-field {
            min-height: 13px;
            padding: 1px 3px;
          }

          .eo-party {
            min-height: 36px;
            padding: 1.5px 3px;
          }

          .eo-table th {
            padding: 1px 1.5px;
          }

          .eo-table td {
            padding: 1px 1.5px;
          }

          .eo-summary-row {
            min-height: 11px;
          }

          .eo-summary-label,
          .eo-summary-value {
            padding: 2px 3px;
          }

          .eo-notes {
            min-height: 16px;
            padding: 2.5px 4px;
          }

          .eo-term {
            line-height: 0.9;
          }

          .eo-signature {
            margin-top: -12px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .eo-signature-box {
            min-height: 7px;
            padding-top: 1px;
          }

          .eo-footer {
            margin-top: -30px !important;
            padding-top: 0;
          }
        }
      `}</style>

      <div className="eo-print-toolbar">
        {onClose && (
          <button type="button" onClick={onClose}>
            Close
          </button>
        )}

        <button
          type="button"
          className="eo-print-btn"
          onClick={handlePrint}
        >
          Print Export Order
        </button>
      </div>

      <div className="eo-print-paper">
        {/* =====================================================
            COMPANY HEADER
        ===================================================== */}

        <div className="eo-company-header">
          <div>
            <div className="eo-company-name">
              {safe(order.exporterName)}
            </div>

            <div className="eo-company-address">
              {safe(order.exporterAddress)}
              {order.exporterCity
                ? `, ${order.exporterCity}`
                : ""}
              {order.exporterState
                ? `, ${order.exporterState}`
                : ""}
              {order.exporterCountry
                ? `, ${order.exporterCountry}`
                : ""}
            </div>

            <div className="eo-company-address">
              {order.exporterMobile
                ? `Mobile: ${order.exporterMobile}`
                : ""}
              {order.exporterEmail
                ? ` | Email: ${order.exporterEmail}`
                : ""}
              {order.exporterWebsite
                ? ` | Website: ${order.exporterWebsite}`
                : ""}
            </div>

            <div className="eo-company-identifiers">
              {order.exporterIEC
                ? `IEC: ${order.exporterIEC}`
                : ""}
              {order.exporterGSTIN
                ? ` | GSTIN: ${order.exporterGSTIN}`
                : ""}
              {order.exporterPAN
                ? ` | PAN: ${order.exporterPAN}`
                : ""}
            </div>
          </div>

          <div className="eo-doc-heading">
            <div className="eo-doc-title">
              EXPORT ORDER
            </div>

            <div className="eo-doc-number">
              Order No.: {safe(order.exportOrderNo)}
            </div>

            <div className="eo-doc-date">
              Order Date: {formatDate(order.exportOrderDate)}
            </div>

            <div className="eo-doc-date">
              Status: {safe(order.status)}
            </div>
          </div>
        </div>

        {/* =====================================================
            ORDER REFERENCES
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Document References
          </div>

          <div className="eo-grid-4">
            <div className="eo-field">
              <span className="eo-field-label">
                Export Order No.
              </span>
              <div className="eo-field-value">
                {safe(order.exportOrderNo)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Order Date
              </span>
              <div className="eo-field-value">
                {formatDate(order.exportOrderDate)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Proforma Invoice No.
              </span>
              <div className="eo-field-value">
                {safe(order.proformaInvoiceNo)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Quotation No.
              </span>
              <div className="eo-field-value">
                {safe(order.quotationNo)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Enquiry No.
              </span>
              <div className="eo-field-value">
                {safe(order.enquiryNo)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Buyer Reference
              </span>
              <div className="eo-field-value">
                {safe(order.buyerReferenceNo)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Buyer PO No.
              </span>
              <div className="eo-field-value">
                {safe(order.buyerPONo)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Buyer PO Date
              </span>
              <div className="eo-field-value">
                {formatDate(order.buyerPODate)}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            BUYER / CONSIGNEE
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Buyer / Consignee Details
          </div>

          <div className="eo-party-grid">
            <div className="eo-party">
              <div className="eo-party-title">
                Buyer / Customer
              </div>

              <div className="eo-party-name">
                {safe(order.customerName)}
              </div>

              <div className="eo-party-line">
                Customer Code: {safe(order.customerCode)}
              </div>

              <div className="eo-party-line">
                Contact Person: {safe(order.contactPerson)}
              </div>

              <div className="eo-party-line">
                {safe(order.buyerAddress)}
              </div>

              <div className="eo-party-line">
                {order.buyerCity
                  ? `${order.buyerCity}, `
                  : ""}
                {order.buyerStateProvince
                  ? `${order.buyerStateProvince}, `
                  : ""}
                {order.buyerPostalCode
                  ? `${order.buyerPostalCode}, `
                  : ""}
                {safe(order.buyerCountry)}
              </div>

              <div className="eo-party-line">
                Email: {safe(order.buyerEmail)}{" "}
                | Mobile: {safe(order.buyerMobile)}
              </div>

              <div className="eo-party-line">
                Tax Registration No.:{" "}
                {safe(order.buyerTaxRegistrationNo)}
              </div>
            </div>

            <div className="eo-party">
              <div className="eo-party-title">
                Consignee / Importer
              </div>

              <div className="eo-party-name">
                {safe(order.consigneeName)}
              </div>

              <div className="eo-party-line">
                {safe(order.consigneeAddress)}
              </div>

              <div className="eo-party-line">
                Country: {safe(order.consigneeCountry)}
              </div>

              <div className="eo-party-line">
                Importer: {safe(order.importerName)}
              </div>

              <div className="eo-party-line">
                {safe(order.importerAddress)}
              </div>

              <div className="eo-party-line">
                Importer Country:{" "}
                {safe(order.importerCountry)}
              </div>

              <div className="eo-party-line">
                Notify Party: {safe(order.notifyParty)}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            COMMERCIAL TERMS
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Commercial Terms
          </div>

          <div className="eo-grid-4">
            <div className="eo-field">
              <span className="eo-field-label">
                Currency
              </span>
              <div className="eo-field-value">
                {safe(order.currency)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Incoterm
              </span>
              <div className="eo-field-value">
                {safe(order.incoterm)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Incoterm Place
              </span>
              <div className="eo-field-value">
                {safe(order.incotermPlace)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Payment Terms
              </span>
              <div className="eo-field-value">
                {safe(order.paymentTerms)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Payment Method
              </span>
              <div className="eo-field-value">
                {safe(order.paymentMethod)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Shipment Mode
              </span>
              <div className="eo-field-value">
                {safe(order.shipmentMode)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Estimated Shipment
              </span>
              <div className="eo-field-value">
                {formatDate(order.estimatedShipmentDate)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Country of Origin
              </span>
              <div className="eo-field-value">
                {safe(order.countryOfOrigin)}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            SHIPPING
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Shipping Information
          </div>

          <div className="eo-grid-4">
            <div className="eo-field">
              <span className="eo-field-label">
                Port of Loading
              </span>
              <div className="eo-field-value">
                {safe(order.portOfLoading)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Port of Discharge
              </span>
              <div className="eo-field-value">
                {safe(order.portOfDischarge)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Final Destination
              </span>
              <div className="eo-field-value">
                {safe(order.finalDestination)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Destination Country
              </span>
              <div className="eo-field-value">
                {safe(order.countryOfDestination)}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            PRODUCTS
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Order Items
          </div>

          <table className="eo-table">
            <thead>
              <tr>
                <th style={{ width: "6%" }}>Sr.</th>
                <th style={{ width: "22%" }}>
                  Product
                </th>
                <th style={{ width: "10%" }}>
                  HS Code
                </th>
                <th style={{ width: "9%" }}>
                  Origin
                </th>
                <th style={{ width: "9%" }}>
                  Qty
                </th>
                <th style={{ width: "8%" }}>
                  Unit
                </th>
                <th style={{ width: "11%" }}>
                  Unit Price
                </th>
                <th style={{ width: "12%" }}>
                  Discount
                </th>
                <th style={{ width: "13%" }}>
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <tr key={`${order.id}-item-${index}`}>
                    <td className="eo-center">
                      {index + 1}
                    </td>

                    <td>
                      <div className="eo-product-name">
                        {safe(item.productName)}
                      </div>

                      <div className="eo-product-code">
                        Code: {safe(item.productCode)}
                      </div>

                      {item.grade && (
                        <div className="eo-product-code">
                          Grade: {item.grade}
                        </div>
                      )}

                      {item.brand && (
                        <div className="eo-product-code">
                          Brand: {item.brand}
                        </div>
                      )}
                    </td>

                    <td className="eo-center">
                      {safe(item.hsCode)}
                    </td>

                    <td className="eo-center">
                      {safe(item.countryOfOrigin)}
                    </td>

                    <td className="eo-right">
                      {number(item.qty)}
                    </td>

                    <td className="eo-center">
                      {safe(item.unit)}
                    </td>

                    <td className="eo-right">
                      {money(item.unitPrice)}
                    </td>

                    <td className="eo-right">
                      {money(item.discount)}
                    </td>

                    <td className="eo-right">
                      {money(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="eo-center">
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            PRODUCT DETAILS
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Packing / Product Specifications
          </div>

          <table className="eo-table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>
                  Product
                </th>
                <th style={{ width: "13%" }}>
                  Packing
                </th>
                <th style={{ width: "10%" }}>
                  Packages
                </th>
                <th style={{ width: "12%" }}>
                  Net Weight
                </th>
                <th style={{ width: "12%" }}>
                  Gross Weight
                </th>
                <th style={{ width: "10%" }}>
                  CBM
                </th>
                <th style={{ width: "27%" }}>
                  Specification / Requirement
                </th>
              </tr>
            </thead>

            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <tr key={`${order.id}-detail-${index}`}>
                    <td>
                      <div className="eo-product-name">
                        {safe(item.productName)}
                      </div>
                      <div className="eo-product-code">
                        {safe(item.productCode)}
                      </div>
                    </td>

                    <td>
                      {safe(item.packingType)}
                    </td>

                    <td className="eo-center">
                      {number(item.packageQty)}
                    </td>

                    <td className="eo-right">
                      {number(item.netWeight)} KG
                    </td>

                    <td className="eo-right">
                      {number(item.grossWeight)} KG
                    </td>

                    <td className="eo-right">
                      {number(item.cbm)}
                    </td>

                    <td>
                      {item.specification
                        ? `Specification: ${item.specification}`
                        : ""}
                      {item.customerRequirement
                        ? ` Requirement: ${item.customerRequirement}`
                        : ""}
                      {item.marksNumbers
                        ? ` Marks: ${item.marksNumbers}`
                        : ""}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="eo-center">
                    No packing details
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            PACKAGE SUMMARY
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Package Summary
          </div>

          <div className="eo-grid-4">
            <div className="eo-field">
              <span className="eo-field-label">
                Total Packages
              </span>
              <div className="eo-field-value">
                {number(order.totalPackages)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Package Type
              </span>
              <div className="eo-field-value">
                {safe(order.packageType)}
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Total Net Weight
              </span>
              <div className="eo-field-value">
                {number(order.totalNetWeight)} KG
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Total Gross Weight
              </span>
              <div className="eo-field-value">
                {number(order.totalGrossWeight)} KG
              </div>
            </div>

            <div className="eo-field">
              <span className="eo-field-label">
                Total CBM
              </span>
              <div className="eo-field-value">
                {number(order.totalCBM)}
              </div>
            </div>

            <div className="eo-field" style={{ gridColumn: "span 3" }}>
              <span className="eo-field-label">
                Marks & Numbers
              </span>
              <div className="eo-field-value">
                {safe(order.marksNumbers)}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            COMMERCIAL SUMMARY
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Commercial Summary
          </div>

          <div className="eo-summary-grid">
            <div className="eo-summary-left">
              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Total Goods Value
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.totalGoodsValue)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Discount
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.discount)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Freight
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.freight)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Insurance
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.insurance)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Other Charges
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.otherCharges)}
                </div>
              </div>

              <div className="eo-summary-row eo-total-row">
                <div className="eo-summary-label">
                  TOTAL ORDER VALUE
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.totalOrderValue)}
                </div>
              </div>
            </div>

            <div>
              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Exchange Rate
                </div>

                <div className="eo-summary-value">
                  {money(order.exchangeRate)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  INR Equivalent
                </div>

                <div className="eo-summary-value">
                  ₹ {money(order.inrEquivalent)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Advance %
                </div>

                <div className="eo-summary-value">
                  {money(order.advancePercentage)}%
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Advance Amount
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.advanceAmount)}
                </div>
              </div>

              <div className="eo-summary-row">
                <div className="eo-summary-label">
                  Balance Amount
                </div>

                <div className="eo-summary-value">
                  {safe(order.currency)}{" "}
                  {money(order.balanceAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            LC DETAILS
        ===================================================== */}

        {(order.lcNo || order.lcDate) && (
          <div className="eo-section">
            <div className="eo-section-title">
              Letter of Credit
            </div>

            <div className="eo-grid-2">
              <div className="eo-field">
                <span className="eo-field-label">
                  LC No.
                </span>

                <div className="eo-field-value">
                  {safe(order.lcNo)}
                </div>
              </div>

              <div className="eo-field">
                <span className="eo-field-label">
                  LC Date
                </span>

                <div className="eo-field-value">
                  {formatDate(order.lcDate)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            REMARKS
        ===================================================== */}

        {order.remarks && (
          <div className="eo-section">
            <div className="eo-section-title">
              Remarks
            </div>

            <div className="eo-notes">
              {order.remarks}
            </div>
          </div>
        )}

        {/* =====================================================
            TERMS
        ===================================================== */}

        {order.termsAndConditions &&
          order.termsAndConditions.length > 0 && (
            <div className="eo-section">
              <div className="eo-section-title">
                Terms & Conditions
              </div>

              <div className="eo-terms">
                <div className="eo-terms-grid">
                  {order.termsAndConditions.map(
                    (term, index) => (
                      <div
                        className="eo-term"
                        key={`term-${index}`}
                      >
                        <span className="eo-term-number">
                          {index + 1}.
                        </span>

                        <span>{term}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            DECLARATION
        ===================================================== */}

        <div className="eo-section">
          <div className="eo-section-title">
            Declaration
          </div>

          <div className="eo-notes">
            {order.remarks
              ? ""
              : "The above Export Order details are based on the agreed commercial terms and referenced Proforma Invoice."}

            {order.countryOfOrigin
              ? ` Country of Origin: ${order.countryOfOrigin}.`
              : ""}

          </div>
        </div>

        {/* =====================================================
            SIGNATURE
        ===================================================== */}

        <div className="eo-signature">
          <div className="eo-signature-box">
            <strong>For Buyer / Customer</strong>
            <br />
            Name / Signature / Stamp
          </div>

          <div className="eo-signature-box eo-signature-right">
            <strong>
              For {safe(order.exporterName)}
            </strong>
            <br />
            Authorized Signatory
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="eo-footer">
          This document is an Export Order record and is not the
          Final Export Commercial Invoice.
          <br />
          Final Commercial Invoice will be issued separately after
          the applicable shipment/documentation stage.
        </div>
      </div>
    </div>
  );
}