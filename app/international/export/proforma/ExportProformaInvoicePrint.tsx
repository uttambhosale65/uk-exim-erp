"use client";

import React from "react";
import { ExportProformaInvoice } from "./ExportProformaInvoiceTypes";

type ExportProformaInvoicePrintProps = {
  invoice: ExportProformaInvoice;
  onClose?: () => void;
};

export default function ExportProformaInvoicePrint({
  invoice,
  onClose,
}: ExportProformaInvoicePrintProps) {
  const formatDate = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const money = (value: number) =>
    Number(value || 0).toFixed(2);

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="pi-print-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        body {
          background: #e5e7eb;
        }

        .pi-print-page {
          width: 100%;
          min-height: 100vh;
          padding: 8px 0 20px;
        }

        .pi-print-actions {
          width: 210mm;
          margin: 0 auto 8px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .pi-print-button {
          border: 1px solid #9ca3af;
          background: #ffffff;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .pi-print-button-primary {
          background: #111827;
          color: #ffffff;
          border-color: #111827;
        }

        /*
         * Professional A4 print canvas.
         *
         * 244.2mm x 0.86 = approximately 210mm
         * 345.3mm x 0.86 = approximately 297mm
         *
         * This allows the complete document to fit inside
         * one physical A4 page while keeping text readable.
         */
        .pi-paper {
          width: 244.2mm;
          min-height: 345.3mm;
          margin: 0 auto;
          padding: 6.5mm;
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
          zoom: 0.86;
        }

        .pi-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding-bottom: 7px;
          border-bottom: 2px solid #111827;
        }

        .pi-company {
          flex: 1;
          min-width: 0;
        }

        .pi-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
          margin-bottom: 3px;
        }

        .pi-company-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.25px;
        }

        .pi-company-address {
          margin-top: 3px;
          font-size: 9px;
          line-height: 1.3;
          color: #374151;
          max-width: 120mm;
        }

        .pi-company-contact {
          margin-top: 3px;
          font-size: 8.5px;
          line-height: 1.3;
          color: #374151;
        }

        .pi-title-block {
          width: 55mm;
          text-align: right;
          padding-top: 5px;
        }

        .pi-document-title {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 0.8px;
          line-height: 1.1;
        }

        .pi-document-subtitle {
          margin-top: 4px;
          font-size: 8.5px;
          color: #6b7280;
        }

        .pi-box {
          border: 1px solid #cfd4da;
          margin-top: 6px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .pi-box-title {
          padding: 4px 6px;
          background: #f3f4f6;
          border-bottom: 1px solid #cfd4da;
          font-size: 8.8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.25px;
        }

        .pi-box-body {
          padding: 5px 6px;
        }

        .pi-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }

        .pi-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .pi-info-cell {
          padding: 3.5px 5px;
          border-right: 1px solid #e5e7eb;
          min-height: 25px;
        }

        .pi-info-cell:last-child {
          border-right: 0;
        }

        .pi-label {
          font-size: 6.9px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 1px;
        }

        .pi-value {
          font-size: 8.6px;
          font-weight: 600;
          color: #111827;
          line-height: 1.25;
          word-break: break-word;
        }

        .pi-party {
          min-height: 60px;
        }

        .pi-party-name {
          font-size: 10.5px;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .pi-party-text {
          font-size: 7.8px;
          line-height: 1.3;
          color: #374151;
        }

        .pi-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.4px;
          table-layout: fixed;
        }

        .pi-table th {
          padding: 3.5px 3px;
          background: #f3f4f6;
          border: 1px solid #cfd4da;
          font-weight: 800;
          text-align: left;
          vertical-align: middle;
        }

        .pi-table td {
          padding: 3.5px 3px;
          border: 1px solid #d9dde2;
          vertical-align: top;
          line-height: 1.22;
          overflow-wrap: anywhere;
        }

        .pi-table .right {
          text-align: right;
        }

        .pi-table .center {
          text-align: center;
        }

        .pi-product-name {
          font-weight: 700;
        }

        .pi-product-code {
          font-size: 6.7px;
          color: #6b7280;
          margin-top: 1px;
        }

        .pi-summary-layout {
          display: grid;
          grid-template-columns: 1fr 69mm;
          gap: 7px;
        }

        .pi-summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.8px;
        }

        .pi-summary-table td {
          padding: 3.2px 5px;
          border-bottom: 1px solid #e5e7eb;
        }

        .pi-summary-table td:last-child {
          text-align: right;
          font-weight: 700;
        }

        .pi-total-row td {
          font-size: 9.8px;
          font-weight: 800 !important;
          background: #f3f4f6;
          border-top: 1px solid #9ca3af;
          border-bottom: 1px solid #9ca3af;
        }

        .pi-terms {
          columns: 2;
          column-gap: 10mm;
        }

        .pi-term {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 3px;
          font-size: 7px;
          line-height: 1.25;
          color: #374151;
        }

        .pi-term-number {
          font-weight: 800;
          color: #111827;
        }

        .pi-footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .pi-bank {
          font-size: 7.4px;
          line-height: 1.3;
        }

        .pi-signature {
          min-height: 58px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          text-align: right;
        }

        .pi-sign-line {
          border-top: 1px solid #6b7280;
          margin-left: auto;
          width: 50mm;
          padding-top: 3px;
          font-size: 7.4px;
          line-height: 1.25;
        }

        .pi-declaration {
          margin-top: 3px;
          font-size: 7px;
          line-height: 1.25;
          color: #374151;
        }

        .pi-bottom-footer {
          margin-top: 6px;
          padding-top: 4px;
          border-top: 1px solid #cfd4da;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 6.6px;
          color: #6b7280;
        }

        @media (max-width: 900px) {
          .pi-paper {
            zoom: 0.72;
          }

          .pi-print-actions {
            width: 100%;
            padding: 0 10px;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          .pi-print-page {
            width: 210mm;
            min-height: 297mm;
            padding: 0;
            margin: 0;
          }

          .pi-print-actions {
            display: none !important;
          }

          .pi-paper {
            width: 244.2mm;
            min-height: 345.3mm;
            margin: 0;
            padding: 6.5mm;
            box-shadow: none;
            zoom: 0.86;
          }

          .pi-box {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pi-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="pi-print-actions">
        {onClose && (
          <button
            type="button"
            className="pi-print-button"
            onClick={onClose}
          >
            Close
          </button>
        )}

        <button
          type="button"
          className="pi-print-button pi-print-button-primary"
          onClick={printDocument}
        >
          Print Proforma Invoice
        </button>
      </div>

      <div className="pi-paper">
        <header className="pi-header">
          <div className="pi-company">
            <img
              src="/uklogo.png"
              alt="UK EXIM ENTERPRISES"
              className="pi-logo"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />

            <div className="pi-company-name">
              {invoice.exporterName ||
                "UK EXIM ENTERPRISES"}
            </div>

            <div className="pi-company-address">
              {invoice.exporterAddress}
              <br />
              {invoice.exporterCity},{" "}
              {invoice.exporterState},{" "}
              {invoice.exporterCountry}
            </div>

            <div className="pi-company-contact">
              Mobile: {invoice.exporterMobile || "-"}{" "}
              | Email: {invoice.exporterEmail || "-"}
              <br />
              Website:{" "}
              {invoice.exporterWebsite || "-"}
            </div>
          </div>

          <div className="pi-title-block">
            <div className="pi-document-title">
              PROFORMA INVOICE
            </div>

            <div className="pi-document-subtitle">
              International Export Document
            </div>
          </div>
        </header>

        <section className="pi-box">
          <div className="pi-box-title">
            Invoice Details
          </div>

          <div className="pi-grid-4">
            <div className="pi-info-cell">
              <div className="pi-label">
                Proforma Invoice No.
              </div>
              <div className="pi-value">
                {invoice.proformaInvoiceNo}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Date
              </div>
              <div className="pi-value">
                {formatDate(
                  invoice.proformaInvoiceDate
                )}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Valid Until
              </div>
              <div className="pi-value">
                {formatDate(invoice.validityDate)}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Status
              </div>
              <div className="pi-value">
                {invoice.status}
              </div>
            </div>
          </div>

          <div className="pi-grid-4">
            <div className="pi-info-cell">
              <div className="pi-label">
                Quotation No.
              </div>
              <div className="pi-value">
                {invoice.quotationNo || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Enquiry No.
              </div>
              <div className="pi-value">
                {invoice.enquiryNo || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Export Order No.
              </div>
              <div className="pi-value">
                {invoice.exportOrderNo || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Buyer Reference
              </div>
              <div className="pi-value">
                {invoice.buyerReferenceNo || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Buyer / Consignee
          </div>

          <div className="pi-grid-2">
            <div className="pi-box-body pi-party">
              <div className="pi-label">
                Buyer
              </div>

              <div className="pi-party-name">
                {invoice.customerName || "-"}
              </div>

              <div className="pi-party-text">
                Customer Code:{" "}
                {invoice.customerCode || "-"}
                <br />
                Contact:{" "}
                {invoice.contactPerson || "-"}
                <br />
                {invoice.buyerAddress || "-"}
                <br />
                {invoice.buyerCity
                  ? `${invoice.buyerCity}, `
                  : ""}
                {invoice.buyerStateProvince
                  ? `${invoice.buyerStateProvince}, `
                  : ""}
                {invoice.buyerPostalCode || ""}
                <br />
                Country:{" "}
                {invoice.buyerCountry || "-"}
                <br />
                Tax Registration:{" "}
                {invoice.buyerTaxRegistrationNo ||
                  "-"}
              </div>
            </div>

            <div className="pi-box-body pi-party">
              <div className="pi-label">
                Consignee / Importer
              </div>

              <div className="pi-party-name">
                {invoice.consigneeName ||
                  invoice.importerName ||
                  "-"}
              </div>

              <div className="pi-party-text">
                Consignee Address:{" "}
                {invoice.consigneeAddress || "-"}
                <br />
                Consignee Country:{" "}
                {invoice.consigneeCountry || "-"}
                <br />
                Importer:{" "}
                {invoice.importerName || "-"}
                <br />
                Importer Address:{" "}
                {invoice.importerAddress || "-"}
                <br />
                Importer Country:{" "}
                {invoice.importerCountry || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Commercial & Shipping Terms
          </div>

          <div className="pi-grid-4">
            <div className="pi-info-cell">
              <div className="pi-label">
                Currency
              </div>
              <div className="pi-value">
                {invoice.currency || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Incoterm
              </div>
              <div className="pi-value">
                {invoice.incoterm || "-"}
                {invoice.incotermPlace
                  ? ` - ${invoice.incotermPlace}`
                  : ""}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Payment Terms
              </div>
              <div className="pi-value">
                {invoice.paymentTerms || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Payment Method
              </div>
              <div className="pi-value">
                {invoice.paymentMethod || "-"}
              </div>
            </div>
          </div>

          <div className="pi-grid-4">
            <div className="pi-info-cell">
              <div className="pi-label">
                Shipment Mode
              </div>
              <div className="pi-value">
                {invoice.shipmentMode || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Port of Loading
              </div>
              <div className="pi-value">
                {invoice.portOfLoading || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Port of Discharge
              </div>
              <div className="pi-value">
                {invoice.portOfDischarge || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Final Destination
              </div>
              <div className="pi-value">
                {invoice.finalDestination || "-"}
              </div>
            </div>
          </div>

          <div className="pi-grid-4">
            <div className="pi-info-cell">
              <div className="pi-label">
                Country of Origin
              </div>
              <div className="pi-value">
                {invoice.countryOfOrigin || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Destination Country
              </div>
              <div className="pi-value">
                {invoice.countryOfDestination || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Estimated Shipment
              </div>
              <div className="pi-value">
                {formatDate(
                  invoice.estimatedShipmentDate
                )}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Vessel / Flight
              </div>
              <div className="pi-value">
                {invoice.vesselFlightNo || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Goods Details
          </div>

          <div className="pi-box-body">
            <table className="pi-table">
              <thead>
                <tr>
                  <th style={{ width: "6%" }}>
                    Sr.
                  </th>
                  <th style={{ width: "22%" }}>
                    Product
                  </th>
                  <th style={{ width: "10%" }}>
                    HS Code
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
                  <th style={{ width: "11%" }}>
                    Discount
                  </th>
                  <th style={{ width: "13%" }}>
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {invoice.items.map(
                  (item, index) => (
                    <tr key={index}>
                      <td className="center">
                        {index + 1}
                      </td>

                      <td>
                        <div className="pi-product-name">
                          {item.productName || "-"}
                        </div>

                        <div className="pi-product-code">
                          Code:{" "}
                          {item.productCode || "-"}
                        </div>

                        {item.grade && (
                          <div>
                            Grade: {item.grade}
                          </div>
                        )}

                        {item.specification && (
                          <div>
                            Specification:{" "}
                            {item.specification}
                          </div>
                        )}

                        {item.customerRequirement && (
                          <div>
                            Requirement:{" "}
                            {
                              item.customerRequirement
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        {item.hsCode || "-"}
                      </td>

                      <td className="right">
                        {Number(
                          item.qty || 0
                        ).toFixed(3)}
                      </td>

                      <td className="center">
                        {item.unit || "-"}
                      </td>

                      <td className="right">
                        {invoice.currency}{" "}
                        {money(item.unitPrice)}
                      </td>

                      <td className="right">
                        {invoice.currency}{" "}
                        {money(item.discount)}
                      </td>

                      <td className="right">
                        {invoice.currency}{" "}
                        {money(item.amount)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Packing & Weight Summary
          </div>

          <div className="pi-grid-4">
            <div className="pi-info-cell">
              <div className="pi-label">
                Total Packages
              </div>
              <div className="pi-value">
                {invoice.totalPackages || 0}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Package Type
              </div>
              <div className="pi-value">
                {invoice.packageType || "-"}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Net Weight
              </div>
              <div className="pi-value">
                {Number(
                  invoice.totalNetWeight || 0
                ).toFixed(3)}{" "}
                KG
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Gross Weight
              </div>
              <div className="pi-value">
                {Number(
                  invoice.totalGrossWeight || 0
                ).toFixed(3)}{" "}
                KG
              </div>
            </div>
          </div>

          <div className="pi-grid-2">
            <div className="pi-info-cell">
              <div className="pi-label">
                Total CBM
              </div>
              <div className="pi-value">
                {Number(
                  invoice.totalCBM || 0
                ).toFixed(3)}
              </div>
            </div>

            <div className="pi-info-cell">
              <div className="pi-label">
                Marks & Numbers
              </div>
              <div className="pi-value">
                {invoice.marksNumbers || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Commercial Value
          </div>

          <div className="pi-box-body">
            <div className="pi-summary-layout">
              <div>
                <div className="pi-info-cell">
                  <div className="pi-label">
                    Commercial Value Basis
                  </div>
                  <div className="pi-value">
                    {invoice.incoterm || "-"}
                    {invoice.incotermPlace
                      ? ` - ${invoice.incotermPlace}`
                      : ""}
                  </div>
                </div>

                {invoice.remarks && (
                  <div className="pi-info-cell">
                    <div className="pi-label">
                      Remarks
                    </div>
                    <div className="pi-value">
                      {invoice.remarks}
                    </div>
                  </div>
                )}
              </div>

              <table className="pi-summary-table">
                <tbody>
                  <tr>
                    <td>Goods Value</td>
                    <td>
                      {invoice.currency}{" "}
                      {money(
                        invoice.totalGoodsValue
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>Discount</td>
                    <td>
                      {invoice.currency}{" "}
                      {money(invoice.discount)}
                    </td>
                  </tr>

                  <tr>
                    <td>Freight</td>
                    <td>
                      {invoice.currency}{" "}
                      {money(invoice.freight)}
                    </td>
                  </tr>

                  <tr>
                    <td>Insurance</td>
                    <td>
                      {invoice.currency}{" "}
                      {money(invoice.insurance)}
                    </td>
                  </tr>

                  <tr>
                    <td>Other Charges</td>
                    <td>
                      {invoice.currency}{" "}
                      {money(
                        invoice.otherCharges
                      )}
                    </td>
                  </tr>

                  <tr className="pi-total-row">
                    <td>
                      Total Proforma Value
                    </td>
                    <td>
                      {invoice.currency}{" "}
                      {money(
                        invoice.totalProformaValue
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>Exchange Rate</td>
                    <td>
                      {Number(
                        invoice.exchangeRate || 0
                      ).toFixed(4)}
                    </td>
                  </tr>

                  <tr>
                    <td>INR Equivalent</td>
                    <td>
                      INR{" "}
                      {money(
                        invoice.inrEquivalent
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Bank / Payment Information
          </div>

          <div className="pi-box-body">
            <div className="pi-footer-grid">
              <div className="pi-bank">
                <strong>
                  {invoice.bankName ||
                    "Bank Details"}
                </strong>
                <br />
                Branch:{" "}
                {invoice.bankBranch || "-"}
                <br />
                Account Name:{" "}
                {invoice.bankAccountName || "-"}
                <br />
                Account No.:{" "}
                {invoice.bankAccountNo || "-"}
                <br />
                SWIFT / BIC:{" "}
                {invoice.swiftBic || "-"}
                <br />
                AD Code:{" "}
                {invoice.adCode || "-"}
                <br />
                Bank Address:{" "}
                {invoice.bankAddress || "-"}
              </div>

              <div className="pi-bank">
                <strong>
                  Payment Summary
                </strong>
                <br />
                Method:{" "}
                {invoice.paymentMethod || "-"}
                <br />
                Terms:{" "}
                {invoice.paymentTerms || "-"}
                <br />
                Advance:{" "}
                {Number(
                  invoice.advancePercentage || 0
                ).toFixed(2)}
                % /{" "}
                {invoice.currency}{" "}
                {money(
                  invoice.advanceAmount
                )}
                <br />
                Balance:{" "}
                {invoice.currency}{" "}
                {money(
                  invoice.balanceAmount
                )}
                <br />
                Buyer PO:{" "}
                {invoice.buyerPONo || "-"}
                <br />
                LC No.:{" "}
                {invoice.lcNo || "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Export Commercial Terms
          </div>

          <div className="pi-box-body">
            <div className="pi-terms">
              {invoice.termsAndConditions.map(
                (term, index) => (
                  <div
                    className="pi-term"
                    key={index}
                  >
                    <span className="pi-term-number">
                      {index + 1}.
                    </span>{" "}
                    {term}
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section className="pi-box">
          <div className="pi-box-title">
            Declaration & Authorization
          </div>

          <div className="pi-box-body">
            <div className="pi-footer-grid">
              <div>
                <div className="pi-declaration">
                  {invoice.declaration ||
                    "We certify that the information stated in this Proforma Invoice is true and correct to the best of our knowledge."}
                </div>

                <div className="pi-declaration">
                  Country of Origin:{" "}
                  {invoice.countryOfOrigin ||
                    "India"}
                </div>

                <div className="pi-declaration">
                  Place:{" "}
                  {invoice.place || "-"}
                </div>
              </div>

              <div className="pi-signature">
                <div className="pi-sign-line">
                  For{" "}
                  {invoice.exporterName ||
                    "UK EXIM ENTERPRISES"}
                  <br />
                  Authorized Signatory
                  <br />
                  {invoice.authorizedSignatory ||
                    ""}
                  {invoice.signatoryDesignation
                    ? ` · ${invoice.signatoryDesignation}`
                    : ""}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="pi-bottom-footer">
          <span>
            This document is a Proforma Invoice and
            not a final Commercial Invoice.
          </span>

          <span>
            {invoice.proformaInvoiceNo}
          </span>
        </div>
      </div>
    </div>
  );
}