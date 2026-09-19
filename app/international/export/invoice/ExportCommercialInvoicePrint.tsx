"use client";

import { useEffect } from "react";
import {
  ExportCommercialInvoice,
} from "./ExportCommercialInvoiceTypes";

type ExportCommercialInvoicePrintProps = {
  invoice: ExportCommercialInvoice;
  onClose?: () => void;
};

function displayDate(value: string): string {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(
  value: number,
  currency: string
): string {
  return `${currency || ""} ${formatNumber(value)}`;
}

export default function ExportCommercialInvoicePrint({
  invoice,
  onClose,
}: ExportCommercialInvoicePrintProps) {
  useEffect(() => {
    const originalTitle = document.title;

    document.title =
      invoice.invoiceNo ||
      "Export Commercial Invoice";

    return () => {
      document.title = originalTitle;
    };
  }, [invoice.invoiceNo]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="print-page-wrapper">
      <div className="print-toolbar no-print">
        <button
          type="button"
          className="toolbar-btn"
          onClick={onClose}
        >
          ← Back
        </button>

        <div className="toolbar-title">
          Export Commercial Invoice
        </div>

        <button
          type="button"
          className="print-btn"
          onClick={handlePrint}
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      <div className="invoice-paper">
        {/* HEADER */}
        <div className="invoice-header">
          <div className="company-brand-row">
            <div className="company-logo">
              <img
                src="/uklogo.png"
                alt="UK EXIM Logo"
              />
            </div>

            <div className="company-block">
            <div className="company-name">
              {invoice.exporterName ||
                "UK EXIM ENTERPRISES"}
            </div>

            <div className="company-address">
              {invoice.exporterAddress || "-"}
              <br />

              {[
                invoice.exporterCity,
                invoice.exporterState,
                invoice.exporterCountry,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>

            <div className="company-contact">
              {invoice.exporterMobile && (
                <span>
                  Mobile:{" "}
                  {invoice.exporterMobile}
                </span>
              )}

              {invoice.exporterEmail && (
                <span>
                  Email:{" "}
                  {invoice.exporterEmail}
                </span>
              )}

              {invoice.exporterWebsite && (
                <span>
                  Website:{" "}
                  {invoice.exporterWebsite}
                </span>
              )}
            </div>

            <div className="company-identifiers">
              {invoice.exporterIEC && (
                <span>
                  <strong>IEC:</strong>{" "}
                  {invoice.exporterIEC}
                </span>
              )}

              {invoice.exporterGSTIN && (
                <span>
                  <strong>GSTIN:</strong>{" "}
                  {invoice.exporterGSTIN}
                </span>
              )}

              {invoice.exporterPAN && (
                <span>
                  <strong>PAN:</strong>{" "}
                  {invoice.exporterPAN}
                </span>
              )}
            </div>
            </div>
          </div>

          <div className="invoice-title-block">
            <div className="invoice-title">
              EXPORT COMMERCIAL INVOICE
            </div>

            <div className="invoice-number">
              {invoice.invoiceNo}
            </div>

            <div className="invoice-status">
              {invoice.status}
            </div>
          </div>
        </div>

        {/* INVOICE DETAILS */}
        <div className="section">
          <div className="section-title">
            Invoice Details
          </div>

          <div className="details-grid">
            <Info
              label="Invoice No."
              value={invoice.invoiceNo}
            />

            <Info
              label="Invoice Date"
              value={displayDate(
                invoice.invoiceDate
              )}
            />

            <Info
              label="Export Order No."
              value={invoice.orderNo}
            />

            <Info
              label="Proforma Invoice No."
              value={invoice.proformaInvoiceNo}
            />

            <Info
              label="Quotation No."
              value={invoice.quotationNo}
            />

            <Info
              label="Enquiry No."
              value={invoice.enquiryNo}
            />
          </div>
        </div>

        {/* BUYER */}
        <div className="two-column">
          <div className="section buyer-section">
            <div className="section-title">
              Buyer / Consignee
            </div>

            <div className="buyer-name">
              {invoice.customerName || "-"}
            </div>

            {invoice.contactPerson && (
              <div>
                <strong>Contact:</strong>{" "}
                {invoice.contactPerson}
              </div>
            )}

            {invoice.buyerAddress && (
              <div>
                {invoice.buyerAddress}
              </div>
            )}

            <div>
              {[
                invoice.buyerCity,
                invoice.buyerStateProvince,
                invoice.buyerPostalCode,
                invoice.buyerCountry,
              ]
                .filter(Boolean)
                .join(", ")}
            </div>

            {invoice.buyerTaxRegistrationNo && (
              <div>
                <strong>
                  Tax / Registration No.:
                </strong>{" "}
                {invoice.buyerTaxRegistrationNo}
              </div>
            )}

         
          </div>

          <div className="section">
            <div className="section-title">
              Shipping Information
            </div>

            <div className="shipping-grid">
              <Info
                label="Country of Origin"
                value={invoice.countryOfOrigin}
              />

              <Info
                label="Final Destination"
                value={invoice.finalDestination}
              />

              <Info
                label="Port of Loading"
                value={invoice.portOfLoading}
              />

              <Info
                label="Port of Discharge"
                value={invoice.portOfDischarge}
              />

              <Info
                label="Shipment Mode"
                value={invoice.shipmentMode}
              />

              <Info
                label="Incoterm"
                value={invoice.incoterm}
              />

              <Info
                label="Currency"
                value={invoice.currency}
              />

              <Info
                label="Shipment No."
                value={invoice.shipmentNo}
              />
            </div>
          </div>
        </div>

        {/* TRANSPORT */}
        <div className="section">
          <div className="section-title">
            Transport / Container Details
          </div>

          <div className="details-grid">
            <Info
              label="Container No."
              value={invoice.containerNo}
            />

            <Info
              label="Seal No."
              value={invoice.sealNo}
            />

            <Info
              label="Vessel"
              value={invoice.vesselName}
            />

            <Info
              label="Voyage No."
              value={invoice.voyageNo}
            />

            <Info
              label="BL No."
              value={invoice.blNo}
            />

            <Info
              label="BL Date"
              value={displayDate(
                invoice.blDate
              )}
            />

            <Info
              label="AWB No."
              value={invoice.awbNo}
            />

            <Info
              label="AWB Date"
              value={displayDate(
                invoice.awbDate
              )}
            />
          </div>
        </div>

        {/* GOODS TABLE */}
        <div className="section goods-section">
          <div className="section-title">
            Goods Details
          </div>

          <table className="goods-table">
            <thead>
              <tr>
                <th className="sr-col">Sr.</th>
                <th>Product / Description</th>
                <th>HS Code</th>
                <th>Origin</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              {(invoice.items || []).map(
                (item, index) => (
                  <tr key={`${item.productCode}-${index}`}>
                    <td className="center">
                      {index + 1}
                    </td>

                    <td>
                      <strong>
                        {item.productName ||
                          item.productCode ||
                          "-"}
                      </strong>

                      {item.grade && (
                        <div className="item-sub">
                          Grade: {item.grade}
                        </div>
                      )}

                      {item.brand && (
                        <div className="item-sub">
                          Brand: {item.brand}
                        </div>
                      )}

                      {item.specification && (
                        <div className="item-sub">
                          {item.specification}
                        </div>
                      )}
                    </td>

                    <td>
                      {item.hsCode || "-"}
                    </td>

                    <td>
                      {item.countryOfOrigin ||
                        "-"}
                    </td>

                    <td className="right">
                      {formatNumber(item.qty)}
                    </td>

                    <td className="center">
                      {item.unit || "-"}
                    </td>

                    <td className="right">
                      {formatCurrency(
                        item.unitPrice,
                        invoice.currency
                      )}
                    </td>

                    <td className="right">
                      {formatCurrency(
                        item.amount,
                        invoice.currency
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* PACKING SUMMARY */}
        <div className="two-column">
          <div className="section">
            <div className="section-title">
              Packing / Weight Summary
            </div>

            <div className="details-grid">
              <Info
                label="Total Packages"
                value={formatNumber(
                  invoice.totalPackages
                )}
              />

              <Info
                label="Net Weight KG"
                value={formatNumber(
                  invoice.totalNetWeight
                )}
              />

              <Info
                label="Gross Weight KG"
                value={formatNumber(
                  invoice.totalGrossWeight
                )}
              />

              <Info
                label="Total CBM"
                value={formatNumber(
                  invoice.totalCBM
                )}
              />
            </div>

            {invoice.packingDetails && (
              <div className="text-block">
                <strong>Packing:</strong>{" "}
                {invoice.packingDetails}
              </div>
            )}
          </div>

          {/* VALUE SUMMARY */}
          <div className="section value-section">
            <div className="section-title">
              Value Details
            </div>

            <div className="value-row">
              <span>Goods Value</span>
              <strong>
                {formatCurrency(
                  invoice.totalGoodsValue,
                  invoice.currency
                )}
              </strong>
            </div>

            <div className="value-row">
              <span>Freight</span>
              <strong>
                {formatCurrency(
                  invoice.freight,
                  invoice.currency
                )}
              </strong>
            </div>

            <div className="value-row">
              <span>Insurance</span>
              <strong>
                {formatCurrency(
                  invoice.insurance,
                  invoice.currency
                )}
              </strong>
            </div>

            <div className="value-row">
              <span>Other Charges</span>
              <strong>
                {formatCurrency(
                  invoice.otherCharges,
                  invoice.currency
                )}
              </strong>
            </div>

            <div className="grand-total">
              <span>
                TOTAL INVOICE VALUE
              </span>

              <strong>
                {formatCurrency(
                  invoice.totalInvoiceValue,
                  invoice.currency
                )}
              </strong>
            </div>

            <div className="value-row">
              <span>Exchange Rate</span>
              <strong>
                {formatNumber(
                  invoice.exchangeRate
                )}
              </strong>
            </div>

            <div className="value-row">
              <span>INR Equivalent</span>
              <strong>
                INR{" "}
                {formatNumber(
                  invoice.inrEquivalent
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* PAYMENT */}
        <div className="two-column">
          <div className="section">
            <div className="section-title">
              Payment Terms
            </div>

            <div className="details-grid">
              <Info
                label="Payment Terms"
                value={invoice.paymentTerms}
              />

              <Info
                label="Payment Method"
                value={invoice.paymentMethod}
              />

              <Info
                label="Advance Received"
                value={formatCurrency(
                  invoice.advanceReceived,
                  invoice.currency
                )}
              />

              <Info
                label="Balance Due"
                value={formatCurrency(
                  invoice.balanceDue,
                  invoice.currency
                )}
              />
            </div>
          </div>

          <div className="section">
            <div className="section-title">
              Bank Details
            </div>

            <div className="bank-details">
              {invoice.bankName && (
                <div>
                  <strong>Bank:</strong>{" "}
                  {invoice.bankName}
                </div>
              )}

              {invoice.bankBranch && (
                <div>
                  <strong>Branch:</strong>{" "}
                  {invoice.bankBranch}
                </div>
              )}

              {invoice.bankAccountName && (
                <div>
                  <strong>A/c Name:</strong>{" "}
                  {invoice.bankAccountName}
                </div>
              )}

              {invoice.bankAccountNo && (
                <div>
                  <strong>A/c No.:</strong>{" "}
                  {invoice.bankAccountNo}
                </div>
              )}

              {invoice.bankIFSC && (
                <div>
                  <strong>IFSC:</strong>{" "}
                  {invoice.bankIFSC}
                </div>
              )}

              {invoice.bankSwiftBic && (
                <div>
                  <strong>SWIFT/BIC:</strong>{" "}
                  {invoice.bankSwiftBic}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MARKS */}
        {(invoice.marksNumbers ||
          invoice.packingDetails) && (
          <div className="section">
            <div className="section-title">
              Marks & Numbers / Packing
            </div>

            {invoice.marksNumbers && (
              <div className="text-block">
                <strong>
                  Marks & Numbers:
                </strong>{" "}
                {invoice.marksNumbers}
              </div>
            )}

            {invoice.packingDetails && (
              <div className="text-block">
                <strong>Packing Details:</strong>{" "}
                {invoice.packingDetails}
              </div>
            )}
          </div>
        )}

        {/* DECLARATION */}
        <div className="section declaration-section">
          <div className="section-title">
            Declaration
          </div>

          <div className="declaration-text">
            {invoice.declaration ||
              "We declare that the particulars given in this commercial invoice are true and correct to the best of our knowledge and belief."}
          </div>
        </div>

        {/* REMARKS */}
        {invoice.remarks && (
          <div className="section">
            <div className="section-title">
              Remarks
            </div>

            <div className="text-block">
              {invoice.remarks}
            </div>
          </div>
        )}

        {/* SIGNATURE */}
        <div className="signature-row">
          <div className="signature-left">
            <div className="signature-label">
              For {invoice.exporterName ||
                "UK EXIM ENTERPRISES"}
            </div>

            <div className="signature-space" />

            <div className="signature-caption">
              Authorized Signatory
            </div>
          </div>

          <div className="signature-right">
            <div className="signature-label">
              Place
            </div>

            <div className="place-value">
              {invoice.finalDestination ||
                invoice.exporterCountry ||
                "India"}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="invoice-footer">
          <div>
            EXPORT COMMERCIAL INVOICE
          </div>

          <div>
            {invoice.invoiceNo}
          </div>

          <div>
            This document is system generated.
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .print-page-wrapper {
          min-height: 100vh;
          background: #e2e8f0;
          padding: 20px;
        }

        .print-toolbar {
          width: 210mm;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #0f172a;
        }

        .toolbar-title {
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
        }

        .toolbar-btn,
        .print-btn {
          height: 34px;
          padding: 0 13px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .toolbar-btn {
          border: 1px solid #475569;
          background: transparent;
          color: #ffffff;
        }

        .print-btn {
          border: none;
          background: #ffffff;
          color: #0f172a;
        }

        .invoice-paper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 9mm;
          background: #ffffff;
          color: #111827;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-size: 8.5px;
          line-height: 1.35;
          box-shadow:
            0 8px 30px
              rgba(15, 23, 42, 0.15);
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #0f172a;
        }

        .company-brand-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .company-logo {
          width: 25mm;
          min-width: 25mm;
          height: 18mm;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
        }

        .company-logo img {
          display: block;
          max-width: 25mm;
          max-height: 18mm;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .company-block {
          flex: 1;
          min-width: 0;
        }

        .company-name {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.2px;
        }

        .company-address {
          margin-top: 3px;
          color: #374151;
        }

        .company-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          margin-top: 3px;
          color: #475569;
        }

        .company-identifiers {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          margin-top: 3px;
          color: #1f2937;
        }

        .invoice-title-block {
          min-width: 64mm;
          text-align: right;
        }

        .invoice-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .invoice-number {
          margin-top: 5px;
          font-size: 13px;
          font-weight: 700;
        }

        .invoice-status {
          display: inline-block;
          margin-top: 4px;
          padding: 3px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 8px;
          font-weight: 700;
          color: #334155;
        }

        .section {
          margin-top: 6px;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          overflow: hidden;
        }

        .section-title {
          padding: 4px 6px;
          background: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.25px;
          color: #334155;
        }

        .details-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
        }

        .shipping-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .details-grid > div,
        .shipping-grid > div {
          min-height: 24px;
          padding: 4px 6px;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .details-grid > div:nth-child(3n) {
          border-right: none;
        }

        .shipping-grid > div:nth-child(2n) {
          border-right: none;
        }

        .info-label {
          display: block;
          margin-bottom: 1px;
          font-size: 7px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
        }

        .info-value {
          display: block;
          color: #111827;
          font-weight: 600;
          word-break: break-word;
        }

        .two-column {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 6px;
        }

        .two-column > .section {
          min-width: 0;
        }

        .buyer-section {
          padding-bottom: 5px;
        }

        .buyer-section > div:not(.section-title) {
          padding-left: 6px;
          padding-right: 6px;
          margin-top: 3px;
        }

        .buyer-name {
          font-size: 10px;
          font-weight: 800;
          color: #111827;
        }

        .small-block {
          padding-top: 4px;
        }

        .goods-section {
          margin-top: 6px;
        }

        .goods-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .goods-table th,
        .goods-table td {
          padding: 4px 4px;
          border-right: 1px solid #dbe1e8;
          border-bottom: 1px solid #dbe1e8;
          vertical-align: top;
        }

        .goods-table th:last-child,
        .goods-table td:last-child {
          border-right: none;
        }

        .goods-table th {
          background: #f8fafc;
          font-size: 7.5px;
          font-weight: 800;
          color: #334155;
          text-align: left;
        }

        .goods-table td {
          font-size: 7.8px;
        }

        .sr-col {
          width: 6%;
        }

        .goods-table th:nth-child(2) {
          width: 25%;
        }

        .goods-table th:nth-child(3) {
          width: 10%;
        }

        .goods-table th:nth-child(4) {
          width: 10%;
        }

        .goods-table th:nth-child(5) {
          width: 8%;
        }

        .goods-table th:nth-child(6) {
          width: 7%;
        }

        .goods-table th:nth-child(7) {
          width: 15%;
        }

        .goods-table th:nth-child(8) {
          width: 19%;
        }

        .center {
          text-align: center !important;
        }

        .right {
          text-align: right !important;
          font-variant-numeric: tabular-nums;
        }

        .item-sub {
          margin-top: 1px;
          font-size: 7px;
          color: #64748b;
        }

        .value-section {
          padding-bottom: 4px;
        }

        .value-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 3px 6px;
          border-bottom: 1px solid #e2e8f0;
        }

        .value-row strong {
          font-variant-numeric: tabular-nums;
        }

        .grand-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 4px 5px;
          padding: 6px;
          border: 1px solid #94a3b8;
          background: #f8fafc;
          font-size: 9px;
          font-weight: 800;
        }

        .text-block {
          padding: 5px 6px;
          word-break: break-word;
        }

        .bank-details {
          padding: 5px 6px;
          line-height: 1.55;
        }

        .declaration-section {
          min-height: 35px;
        }

        .declaration-text {
          padding: 6px;
          line-height: 1.45;
        }

        .signature-row {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          margin-top: 14px;
          min-height: 45px;
        }

        .signature-left {
          width: 55%;
        }

        .signature-right {
          width: 25%;
          text-align: center;
        }

        .signature-label {
          font-weight: 700;
        }

        .signature-space {
          height: 25px;
        }

        .signature-caption {
          padding-top: 3px;
          border-top: 1px solid #64748b;
          width: 150px;
          font-size: 8px;
        }

        .place-value {
          margin-top: 28px;
          padding-top: 3px;
          border-top: 1px solid #64748b;
        }

        .invoice-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px solid #94a3b8;
          color: #64748b;
          font-size: 7px;
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

          .no-print {
            display: none !important;
          }

          .print-page-wrapper {
            width: 100%;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            overflow: visible !important;
          }

          .invoice-paper {
            box-sizing: border-box;
            width: 190mm;
            max-width: 190mm;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 auto !important;
            padding: 5mm;
            background: #fff;
            box-shadow: none !important;
            font-size: 8px;
            line-height: 1.22;
            overflow: visible !important;
          }

          .invoice-header {
            padding-bottom: 5px;
            gap: 10px;
          }

          .company-logo {
            width: 22mm;
            min-width: 22mm;
            height: 14mm;
          }

          .company-logo img {
            max-width: 22mm;
            max-height: 14mm;
          }

          .company-name {
            font-size: 15px;
          }

          .company-address {
            margin-top: 2px;
          }

          .company-contact,
          .company-identifiers {
            gap: 2px 8px;
            margin-top: 2px;
          }

          .invoice-title-block {
            min-width: 58mm;
          }

          .invoice-title {
            font-size: 12px;
          }

          .invoice-number {
            margin-top: 3px;
            font-size: 9px;
          }

          .invoice-status {
            margin-top: 2px;
            padding: 2px 5px;
            font-size: 6.5px;
          }

          .section {
            margin-top: 4px;
          }

          .section-title {
            padding: 3px 5px;
            font-size: 7px;
          }

          .details-grid > div,
          .shipping-grid > div {
            min-height: 18px;
            padding: 2.5px 5px;
          }

          .info-label {
            font-size: 6px;
          }

          .info-value {
            font-size: 7.4px;
          }

          .two-column {
            gap: 5px;
          }

          .buyer-section {
            padding-bottom: 2px;
          }

          .buyer-section > div:not(.section-title) {
            padding-left: 5px;
            padding-right: 5px;
            margin-top: 2px;
          }

          .buyer-name {
            font-size: 9px;
          }

          .goods-section {
            margin-top: 4px;
          }

          .goods-table th,
          .goods-table td {
            padding: 2.5px 3px;
          }

          .goods-table th {
            font-size: 6.7px;
          }

          .goods-table td {
            font-size: 7px;
          }

          .item-sub {
            font-size: 6px;
          }

          .value-row {
            padding: 2.2px 5px;
          }

          .grand-total {
            margin: 3px 4px;
            padding: 4px;
            font-size: 8px;
          }

          .text-block,
          .bank-details,
          .declaration-text {
            padding: 3.5px 5px;
          }

          .bank-details {
            line-height: 1.3;
          }

          .declaration-section {
            min-height: 0;
          }

          .signature-row {
            margin-top: 7px;
            min-height: 30px;
            gap: 18px;
          }

          .signature-space {
            height: 12px;
          }

          .signature-caption {
            padding-top: 2px;
            font-size: 6.5px;
          }

          .place-value {
            margin-top: 10px;
            padding-top: 2px;
          }

          .invoice-footer {
            margin-top: 5px;
            padding-top: 3px;
            font-size: 6px;
          }

          .section,
          .goods-table,
          .signature-row,
          .invoice-header {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .goods-table thead {
            display: table-header-group;
          }

          .goods-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }

        @media screen and (max-width: 900px) {
          .print-page-wrapper {
            padding: 10px;
            overflow-x: auto;
          }

          .print-toolbar,
          .invoice-paper {
            width: 210mm;
          }
        }
      `}</style>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  const displayValue =
    value === undefined ||
    value === null ||
    value === ""
      ? "-"
      : String(value);

  return (
    <div>
      <span className="info-label">
        {label}
      </span>

      <span className="info-value">
        {displayValue}
      </span>
    </div>
  );
}