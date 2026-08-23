"use client";

import React from "react";
import { Sales } from "./SalesTypes";

type Props = {
  sale: Sales;
  onClose?: () => void;
};

export default function InvoicePrint({
  sale,
  onClose,
}: Props) {
  const printInvoice = () => {
    window.print();
  };

  /* =========================
     NUMBER TO WORDS
  ========================= */

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertBelowThousand(num: number): string {
    let str = "";

    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }

    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    }

    if (num > 0) {
      str += ones[num] + " ";
    }

    return str.trim();
  }

  function numberToWords(amount: number): string {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    function convert(num: number): string {
      if (num === 0) return "Zero";

      let result = "";

      const crore = Math.floor(num / 10000000);
      num %= 10000000;

      const lakh = Math.floor(num / 100000);
      num %= 100000;

      const thousand = Math.floor(num / 1000);
      num %= 1000;

      if (crore) {
        result += convertBelowThousand(crore) + " Crore ";
      }

      if (lakh) {
        result += convertBelowThousand(lakh) + " Lakh ";
      }

      if (thousand) {
        result += convertBelowThousand(thousand) + " Thousand ";
      }

      if (num) {
        result += convertBelowThousand(num);
      }

      return result.trim();
    }

    let words = convert(rupees) + " Rupees";

    if (paise > 0) {
      words += " and " + convert(paise) + " Paise";
    }

    return words + " Only";
  }

  /* =========================
     GST CALCULATION
  ========================= */

  const taxableAmount = Number(
    sale.taxableAmount || 0
  );

  const totalGST = Number(
    sale.gstAmount || 0
  );

  const cgstAmount = totalGST / 2;
  const sgstAmount = totalGST / 2;

  const gstRate = Number(
    sale.items?.[0]?.gst || 0
  );

  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;

  const grandTotal = Number(
    sale.grandTotal || 0
  );

  return (
    <div className="invoice-page-wrapper">

      {/* =========================
          INVOICE
      ========================= */}

      <div
        id="invoice-print"
        className="invoice-print-page"
      >

        {/* =========================
            HEADER
        ========================= */}

        <div className="invoice-header">

          <div className="invoice-logo">
            <img
              src="/uklogo.png"
              alt="Company Logo"
            />
          </div>

          <div className="company-details">

            <h1>
              UK EXIM ENTERPRISES
            </h1>

            <div className="company-subtitle">
              Exporter • Importer • Supplier
            </div>

            <div>
              A-703, Vishnu Greens, City Pride School Road,
              Jadhavwadi, Chikhali, Pune - 411062,
              Maharashtra, India
            </div>

            <div className="company-small">
              GSTIN : 27AJUPB0025D1ZO |
              FSSAI : 21525038000816 |
              IEC : AJUPB0025D
            </div>

            <div className="company-small">
              📞 +91 9970187185 |
              ✉️ uk37exim@gmail.com |
              🌐 www.ukeximenterprises.com
            </div>

          </div>

          <div className="tax-invoice">
            TAX
            <br />
            INVOICE
          </div>

        </div>

        {/* =========================
            CUSTOMER DETAILS
        ========================= */}

        <table className="customer-table">
          <tbody>

            <tr>
              <td>
                <b>Invoice No</b>
                <br />
                {sale.invoiceNo}
              </td>

              <td>
                <b>Date</b>
                <br />
                {sale.salesDate}
              </td>
            </tr>

            <tr>
              <td>
                <b>Customer</b>
                <br />
                {sale.customerName}
              </td>

              <td>
                <b>Customer Code</b>
                <br />
                {sale.customerCode}
              </td>
            </tr>

          </tbody>
        </table>

        {/* =========================
            PRODUCT DETAILS
        ========================= */}

        <table className="product-table">

          <thead>
            <tr>
              <th>Sr.</th>
              <th>Product Name</th>
              <th>HSN</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>

            {sale.items.map((item, index) => (
              <tr
                key={`${item.productCode}-${index}`}
              >
                <td className="center">
                  {index + 1}
                </td>

                <td>
                  {item.productName}
                </td>

                <td className="center">
                  {item.hsn}
                </td>

                <td className="center">
                  {item.unit}
                </td>

                <td className="center">
                  {item.qty}
                </td>

                <td className="right">
                  ₹{Number(item.rate || 0).toFixed(2)}
                </td>

                <td className="right bold">
                  ₹{Number(item.amount || 0).toFixed(2)}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

        {/* =========================
            GST SUMMARY
        ========================= */}

        <div className="gst-wrapper">

          <table className="gst-table">

            <tbody>

              <tr>
                <td>
                  <b>Taxable Amount</b>
                </td>

                <td className="right">
                  ₹{taxableAmount.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td>
                  CGST @ {cgstRate.toFixed(2)}%
                </td>

                <td className="right">
                  ₹{cgstAmount.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td>
                  SGST @ {sgstRate.toFixed(2)}%
                </td>

                <td className="right">
                  ₹{sgstAmount.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td>
                  <b>Total GST</b>
                </td>

                <td className="right bold">
                  ₹{totalGST.toFixed(2)}
                </td>
              </tr>

              <tr className="grand-total-row">
                <td>
                  Grand Total
                </td>

                <td className="right">
                  ₹{grandTotal.toFixed(2)}
                </td>
              </tr>

            </tbody>

          </table>

        </div>

        {/* =========================
            AMOUNT IN WORDS
        ========================= */}

        <div className="amount-words">

          <b>Amount in Words :</b>

          <div>
            {numberToWords(grandTotal)}
          </div>

        </div>

        {/* =========================
            REMARKS
        ========================= */}

        <div className="remarks">

          <b>Remarks :</b>

          <div>
            {sale.remarks || "-"}
          </div>

        </div>

        {/* =========================
            SIGNATURE
        ========================= */}

        <div className="signature-section">

          <div>
            Customer Signature
          </div>

          <div className="authorized-signature">

            <div>For</div>

            <b>
              UK EXIM ENTERPRISES
            </b>

            <div className="signature-space"></div>

            <div>
              Authorized Signatory
            </div>

          </div>

        </div>

        {/* =========================
            TERMS & CONDITIONS
        ========================= */}

        <div className="terms">

          <h3>
            Terms & Conditions
          </h3>

          <ol>

            <li>
              Goods once sold will not be taken back.
            </li>

            <li>
              Subject to Pune Jurisdiction only.
            </li>

            <li>
              Please check the material before accepting
              delivery.
            </li>

            <li>
              Interest @18% p.a. will be charged on overdue
              bills.
            </li>

            <li>
              Thank you for your valuable business.
            </li>

          </ol>

        </div>

        {/* =========================
            FOOTER
        ========================= */}

        <div className="invoice-footer">

          <div>
            This is a Computer Generated GST Invoice.
          </div>

          <div className="developer-credit">
            Designed & Developed by
            <br />
            <b>Uttam Bhosale</b>
            <br />
            AI Development Assistance
            <br />
            <b>ChatGPT (OpenAI)</b>
          </div>

        </div>

        {/* =========================
            ACTION BUTTONS
        ========================= */}

        <div
          className="invoice-actions"
        >

          <button
            type="button"
            onClick={printInvoice}
          >
            🖨️ Print Invoice
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="close-button"
            >
              ❌ Close
            </button>
          )}

        </div>

      </div>

      {/* =================================================
          SCREEN + PRINT CSS
      ================================================= */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .invoice-page-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f3f4f6;
  padding: 20px 0;
  margin: 0 auto;
}

        .invoice-print-page {
          width: 190mm;
          min-height: 277mm;
          background: #ffffff;
          padding: 7mm;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          box-sizing: border-box;
          margin: 0 auto;
        }

        /* =========================
           HEADER
        ========================= */

        .invoice-header {
          display: grid;
          grid-template-columns: 75px 1fr 85px;
          align-items: center;
          column-gap: 8px;
          border-bottom: 1.5px solid #000;
          padding-bottom: 7px;
        }

        .invoice-logo {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .invoice-logo img {
          width: 65px;
          height: auto;
          display: block;
        }

        .company-details {
          text-align: center;
          line-height: 1.25;
          font-size: 9px;
        }

        .company-details h1 {
          margin: 0;
          color: #0f4c81;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.1;
        }

        .company-subtitle {
          font-weight: 700;
          font-size: 9px;
          margin-top: 3px;
        }

        .company-small {
          font-size: 8px;
          margin-top: 2px;
        }

        .tax-invoice {
          text-align: center;
          color: #0f4c81;
          font-size: 20px;
          line-height: 1.05;
          font-weight: 800;
        }

        /* =========================
           TABLES
        ========================= */

        .customer-table,
        .product-table,
        .gst-table {
          width: 100%;
          border-collapse: collapse;
        }

        .customer-table {
          margin-top: 8px;
        }

        .customer-table td {
          border: 1px solid #000;
          padding: 5px 7px;
          font-size: 9px;
          line-height: 1.25;
        }

        .product-table {
          margin-top: 8px;
        }

        .product-table th {
          border: 1px solid #000;
          background: #0f4c81;
          color: #ffffff;
          padding: 5px 4px;
          font-size: 8px;
          font-weight: 700;
          text-align: center;
          white-space: nowrap;
        }

        .product-table td {
          border: 1px solid #000;
          padding: 5px 4px;
          font-size: 8.5px;
          line-height: 1.2;
        }

        .product-table th:nth-child(1) {
          width: 7%;
        }

        .product-table th:nth-child(2) {
          width: 34%;
        }

        .product-table th:nth-child(3) {
          width: 14%;
        }

        .product-table th:nth-child(4) {
          width: 10%;
        }

        .product-table th:nth-child(5) {
          width: 8%;
        }

        .product-table th:nth-child(6) {
          width: 13%;
        }

        .product-table th:nth-child(7) {
          width: 14%;
        }

        .center {
          text-align: center;
        }

        .right {
          text-align: right;
        }

        .bold {
          font-weight: 700;
        }

        /* =========================
           GST
        ========================= */

        .gst-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-top: 7px;
        }

        .gst-table {
          width: 48%;
        }

        .gst-table td {
          border: 1px solid #000;
          padding: 4px 6px;
          font-size: 8.5px;
          line-height: 1.15;
        }

        .grand-total-row td {
          font-size: 11px;
          font-weight: 800;
          color: #0f4c81;
        }

        /* =========================
           AMOUNT / REMARKS
        ========================= */

        .amount-words,
        .remarks {
          border: 1px solid #000;
          padding: 6px 8px;
          margin-top: 7px;
          font-size: 8.5px;
          line-height: 1.3;
        }

        .amount-words > div {
          margin-top: 3px;
          font-weight: 700;
          color: #0f4c81;
        }

        .remarks > div {
          margin-top: 3px;
          min-height: 15px;
        }

        /* =========================
           SIGNATURE
        ========================= */

        .signature-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 18px;
          font-size: 8.5px;
        }

        .authorized-signature {
          text-align: center;
          min-width: 160px;
        }

        .signature-space {
          height: 22px;
        }

        /* =========================
           TERMS
        ========================= */

        .terms {
          border: 1px solid #000;
          padding: 6px 8px;
          margin-top: 12px;
        }

        .terms h3 {
          margin: 0 0 4px 0;
          font-size: 9px;
        }

        .terms ol {
          margin: 0;
          padding-left: 17px;
          font-size: 7.5px;
          line-height: 1.35;
        }

        .terms li {
          margin: 0;
          padding: 0;
        }

        /* =========================
           FOOTER
        ========================= */

        .invoice-footer {
          text-align: center;
          margin-top: 8px;
          font-size: 7.5px;
          color: #555;
          line-height: 1.3;
        }

        .developer-credit {
          margin-top: 3px;
        }

        /* =========================
           BUTTONS
        ========================= */

        .invoice-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 18px;
        }

        .invoice-actions button {
          padding: 9px 18px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
        }

        .invoice-actions .close-button {
          background: #6b7280;
        }

        /* =================================================
           PRINT
        ================================================= */

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {

          html,
          body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body {
            visibility: hidden !important;
          }

          .invoice-page-wrapper {
            visibility: visible !important;
            width: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
justify-content: center !important;
align-items: flex-start !important;
            background: #ffffff !important;
          }

          #invoice-print {
            visibility: visible !important;
            width: 190mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            background: #ffffff !important;
            overflow: visible !important;

            /* IMPORTANT:
               No zoom
               No transform
               No absolute positioning
            */
           margin: 0 auto !important;

position: absolute !important;
left: 50% !important;
top: 10 !important;
transform: translate(-50%, 10mm) !important;
            zoom: 1 !important;
          }

          #invoice-print * {
            visibility: visible !important;
          }

          .invoice-actions {
            display: none !important;
          }

          .invoice-header,
          .customer-table,
          .product-table,
          .gst-wrapper,
          .amount-words,
          .remarks,
          .signature-section,
          .terms,
          .invoice-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table {
            break-inside: auto;
            page-break-inside: auto;
          }

          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .product-table thead {
            display: table-header-group;
          }

          .product-table tfoot {
            display: table-footer-group;
          }

        }

      `}</style>

    </div>
  );
}