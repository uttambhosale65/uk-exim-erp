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

  const taxableAmount = Number(sale.taxableAmount || 0);

  const totalGST = Number(sale.gstAmount || 0);

  const cgstAmount = totalGST / 2;
  const sgstAmount = totalGST / 2;

  const gstRate =
    Number(sale.items?.[0]?.gst || 0);

  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;

  const grandTotal = Number(
    sale.grandTotal || 0
  );

  return (
    <div
      id="invoice-print"
      style={{
        width: "210mm",
        maxWidth: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        overflow: "visible",
        padding: "8mm",
        background: "#ffffff",
        boxSizing: "border-box",
      }}
    >

      {/* =========================
          HEADER
      ========================= */}

      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid black",
          paddingBottom: "15px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >

          {/* LOGO */}

          <img
            src="/uklogo.png"
            alt="Company Logo"
            style={{
              width: "120px",
              height: "auto",
            }}
          />

          {/* COMPANY */}

          <div
            style={{
              textAlign: "center",
              flex: 1,
            }}
          >
            <h1
              style={{
                margin: 0,
                color: "#0F4C81",
                fontSize: "34px",
                fontWeight: "bold",
              }}
            >
              UK EXIM ENTERPRISES
            </h1>

            <div
              style={{
                fontWeight: "bold",
                marginTop: "8px",
              }}
            >
              Exporter • Importer • Supplier
            </div>

            <div style={{ fontSize: "14px" }}>
              A-703, Vishnu Greens, City Pride School Road,
              Jadhavwadi, Chikhali, Pune - 411062,
              Maharashtra, India
            </div>

            <div
              style={{
                fontSize: "13px",
                marginTop: "6px",
              }}
            >
              GSTIN : 27AJUPB0025D1ZO |
              FSSAI : 21525038000816 |
              IEC : AJUPB0025D
            </div>

            <div style={{ fontSize: "13px" }}>
              📞 +91 9970187185 |
              ✉️ uk37exim@gmail.com |
              🌐 www.ukeximenterprises.com
            </div>
          </div>

          {/* TAX INVOICE */}

          <div
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#0F4C81",
            }}
          >
            TAX
            <br />
            INVOICE
          </div>

        </div>
      </div>

      {/* =========================
          CUSTOMER DETAILS
      ========================= */}

      <table
        style={{
          width: "100%",
          marginTop: "20px",
          borderCollapse: "collapse",
        }}
      >
        <tbody>

          <tr>
            <td style={customerTd}>
              <b>Invoice No</b>
              <br />
              {sale.invoiceNo}
            </td>

            <td style={customerTd}>
              <b>Date</b>
              <br />
              {sale.salesDate}
            </td>
          </tr>

          <tr>
            <td style={customerTd}>
              <b>Customer</b>
              <br />
              {sale.customerName}
            </td>

            <td style={customerTd}>
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

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#0F4C81",
              color: "#ffffff",
            }}
          >
            <th style={th}>Sr.</th>
            <th style={th}>Product Name</th>
            <th style={th}>HSN</th>
            <th style={th}>Unit</th>
            <th style={th}>Qty</th>
            <th style={th}>Rate</th>
            <th style={th}>Amount</th>
          </tr>
        </thead>

        <tbody>
          {sale.items.map((item, index) => (
            <tr
              key={`${item.productCode}-${index}`}
            >
              <td style={td}>
                {index + 1}
              </td>

              <td style={td}>
                {item.productName}
              </td>

              <td style={td}>
                {item.hsn}
              </td>

              <td style={td}>
                {item.unit}
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "center",
                }}
              >
                {item.qty}
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                }}
              >
                ₹{Number(item.rate || 0).toFixed(2)}
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                ₹{Number(item.amount || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* =========================
          GST SUMMARY
      ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "20px",
        }}
      >
        <table
          style={{
            width: "380px",
            borderCollapse: "collapse",
          }}
        >
          <tbody>

            <tr>
              <td style={td}>
                <b>Taxable Amount</b>
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                }}
              >
                ₹{taxableAmount.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td style={td}>
                CGST @ {cgstRate.toFixed(2)}%
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                }}
              >
                ₹{cgstAmount.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td style={td}>
                SGST @ {sgstRate.toFixed(2)}%
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                }}
              >
                ₹{sgstAmount.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td
                style={{
                  ...td,
                  fontWeight: "bold",
                }}
              >
                Total GST
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                ₹{totalGST.toFixed(2)}
              </td>
            </tr>

            <tr>
              <td
                style={{
                  ...td,
                  fontWeight: "bold",
                  fontSize: "15px",
                }}
              >
                Grand Total
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                  fontWeight: "bold",
                  color: "#0F4C81",
                  fontSize: "18px",
                }}
              >
                ₹{grandTotal.toFixed(2)}
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* =========================
          AMOUNT IN WORDS
      ========================= */}

      <div
        style={{
          border: "1px solid black",
          padding: "10px",
          marginTop: "20px",
        }}
      >
        <b>Amount in Words :</b>

        <div
          style={{
            marginTop: "8px",
            fontWeight: "bold",
            color: "#0F4C81",
          }}
        >
          {numberToWords(grandTotal)}
        </div>
      </div>

      {/* =========================
          REMARKS
      ========================= */}

      <div
        style={{
          border: "1px solid black",
          padding: "10px",
          marginTop: "15px",
        }}
      >
        <b>Remarks :</b>
        <br />
        {sale.remarks || "-"}
      </div>

      {/* =========================
          SIGNATURE
      ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "60px",
        }}
      >
        <div>
          Customer Signature
        </div>

        <div
          style={{
            textAlign: "center",
          }}
        >
          For
          <br />
          <b>UK EXIM ENTERPRISES</b>
          <br />
          <br />
          <br />
          Authorized Signatory
        </div>
      </div>

      {/* =========================
          TERMS & CONDITIONS
      ========================= */}

      <div
        style={{
          marginTop: "30px",
          border: "1px solid #000",
          padding: "10px",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px 0",
            fontSize: "16px",
          }}
        >
          Terms & Conditions
        </h3>

        <ol
          style={{
            margin: 0,
            paddingLeft: "20px",
            lineHeight: "24px",
            fontSize: "13px",
          }}
        >
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
          ACTION BUTTONS
      ========================= */}

      <div
        className="invoice-actions"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          marginTop: "30px",
        }}
      >
        <button
          type="button"
          onClick={printInvoice}
          style={{
            padding: "10px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🖨️ Print Invoice
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ❌ Close
          </button>
        )}
      </div>

      {/* =========================
          FOOTER
      ========================= */}

      <div
        style={{
          marginTop: "25px",
          textAlign: "center",
          fontSize: "12px",
          color: "#555",
        }}
      >
        <div>
          This is a Computer Generated GST Invoice.
        </div>

        <div style={{ marginTop: "8px" }}>
          Designed & Developed by
        </div>

        <b>Uttam Bhosale</b>

        <div>
          AI Development Assistance
        </div>

        <b>ChatGPT (OpenAI)</b>
      </div>

      {/* =========================
          SCREEN + PRINT STYLE
      ========================= */}

      <style>
        {`

          /* =========================================
             NORMAL SCREEN VIEW
             ONLY SCREEN IS SCALED DOWN
             PRINT IS NOT AFFECTED
          ========================================= */

          @media screen {

            #invoice-print {
              zoom: 0.72 !important;
              margin: 0 auto !important;
            }

          }


          /* =========================================
             PRINT SETTINGS
             KEEPING OUR WORKING 1-PAGE PRINT
          ========================================= */

          @page {
            size: A4;
            margin: 0;
          }

          @media print {

            html {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }

            .invoice-page-wrapper {
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
              overflow: visible !important;
            }

            body {
              visibility: hidden !important;
            }

            #invoice-print {
              visibility: visible !important;

              position: absolute !important;

              left: 0 !important;
              top: 0 !important;

              width: 210mm !important;
              height: 290mm !important;
              max-height: 290mm !important;

              max-width: none !important;
              min-height: 0 !important;

              margin: 0 !important;
              padding: 5mm !important;

              box-sizing: border-box !important;

              background: #ffffff !important;

              overflow: hidden !important;

              zoom: 0.90 !important;
            }

            #invoice-print * {
              visibility: visible !important;
            }

            .invoice-actions {
              display: none !important;
            }

            #invoice-print table {
              width: 100% !important;
              border-collapse: collapse !important;

              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            #invoice-print tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            #invoice-print th,
            #invoice-print td {
              padding: 4px !important;
              font-size: 10px !important;
            }

            #invoice-print h1 {
              font-size: 25px !important;
            }

            #invoice-print h3 {
              font-size: 13px !important;
            }

            #invoice-print img {
              max-width: 90px !important;
              height: auto !important;
            }

            #invoice-print ol {
              margin: 0 !important;
              padding-left: 18px !important;
              line-height: 15px !important;
              font-size: 9px !important;
            }

            #invoice-print,
            #invoice-print * {
              page-break-before: avoid !important;
              page-break-after: avoid !important;
            }

          }

        `}
      </style>

    </div>
  );
}

/* =========================
   TABLE STYLES
========================= */

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "13px",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  fontSize: "13px",
};

const customerTd: React.CSSProperties = {
  border: "1px solid black",
  padding: "10px",
};