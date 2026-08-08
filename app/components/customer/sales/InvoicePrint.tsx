"use client";

import React from "react";
import Image from "next/image";
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

    if (crore)
      result += convertBelowThousand(crore) + " Crore ";

    if (lakh)
      result += convertBelowThousand(lakh) + " Lakh ";

    if (thousand)
      result += convertBelowThousand(thousand) + " Thousand ";

    if (num)
      result += convertBelowThousand(num);

    return result.trim();
  }

  let words = convert(rupees) + " Rupees";

  if (paise > 0) {
    words += " and " + convert(paise) + " Paise";
  }

  return words + " Only";
}
  return (
    <div
  id="invoice-print"
  style={{
        width: "100%",
maxWidth: "900px",
margin: "0 auto",
height: "100%",
overflowY: "auto",
padding: "30px",
      }}
    >

      {/* HEADER */}

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

  <img
    src="/uklogo.png"
    alt="Company Logo"
    style={{
      width: "120px",
      height: "auto",
    }}
  />

  <div
    style={{
      textAlign: "center",
      flex: 1,
    }}
  >
    <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "15px",
    marginBottom: "10px",
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
</div>

    <div style={{ fontWeight: "bold" }}>
  Exporter • Importer • Supplier
</div>

<div style={{ fontSize: "14px" }}>
  A-703, Vishnu Greens, City Pride School Road, Jadhavwadi, Chikhali, Pune - 411062, Maharashtra, India
</div>

<div style={{ fontSize: "13px", marginTop: "6px" }}>
  GSTIN : 27AJUPB0025D1ZO | FSSAI : 21525038000816 | IEC : AJUPB0025D
</div>

<div style={{ fontSize: "13px" }}>
  📞 +91 9970187185 | ✉️ uk37exim@gmail.com | 🌐 www.ukeximenterprises.com
</div>

  </div>

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

      {/* CUSTOMER */}

      <table
        style={{
          width: "150%",
          marginTop: "20px",
          borderCollapse: "collapse",
        }}
      >

        <tbody>

          <tr>

            <td
              style={{
                border: "1px solid black",
                padding: "10px",
              }}
            >
              <b>Invoice No</b>

              <br />

              {sale.invoiceNo}

            </td>

            <td
              style={{
                border: "1px solid black",
                padding: "10px",
              }}
            >
              <b>Date</b>

              <br />

              {sale.salesDate}

            </td>

          </tr>

          <tr>

            <td
              style={{
                border: "1px solid black",
                padding: "10px",
              }}
            >
              <b>Customer</b>

              <br />

              {sale.customerName}

            </td>

            <td
              style={{
                border: "1px solid black",
                padding: "10px",
              }}
            >
              <b>Customer Code</b>

              <br />

              {sale.customerCode}

            </td>

          </tr>

        </tbody>

      </table>
      {/* ===========================
          PRODUCT DETAILS
      =========================== */}

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
            <tr key={item.productCode}>

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
                ₹{item.rate.toFixed(2)}
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                  fontWeight: "bold",
                }}
              >
                ₹{item.amount.toFixed(2)}
              </td>

            </tr>
          ))}

        </tbody>

      </table>

      {/* ===========================
          GST DETAILS
      =========================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "20px",
        }}
      >

        <table
          style={{
            width: "350px",
            borderCollapse: "collapse",
          }}
        >

          <tbody>

            <tr>

              <td style={td}>
                Taxable Amount
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                }}
              >
                ₹{sale.taxableAmount.toFixed(2)}
              </td>

            </tr>

            <tr>

              <td style={td}>
                GST Amount
              </td>

              <td
                style={{
                  ...td,
                  textAlign: "right",
                }}
              >
                ₹{sale.gstAmount.toFixed(2)}
              </td>

            </tr>
            <tr>

              <td
                style={{
                  ...td,
                  fontWeight: "bold",
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
                ₹{sale.grandTotal.toFixed(2)}
              </td>

            </tr>

          </tbody>

        </table>

      </div>

      {/* ===========================
          AMOUNT IN WORDS
      =========================== */}

      <div
        style={{
          border: "1px solid black",
          padding: "10px",
          marginTop: "20px",
        }}
      >

        <b>Amount in Words :</b>

        <br />

        <div
  style={{
    marginTop: "8px",
    fontWeight: "bold",
    color: "#0F4C81",
  }}
>
  {numberToWords(sale.grandTotal)}
</div>

      </div>
{/* ===========================
    BANK DETAILS & UPI QR
=========================== */}

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    marginTop: "20px",
    border: "1px solid #000",
    padding: "12px",
  }}
>
  {/* BANK DETAILS */}

  <div style={{ flex: 1 }}>
    <h3
      style={{
        margin: "0 0 8px 0",
        color: "#0F4C81",
        fontSize: "16px",
      }}
    >
      Bank Details
    </h3>

    <div style={{ fontSize: "13px", lineHeight: "22px" }}>
      <div>
        <b>Account Name:</b> UK EXIM ENTERPRISES
      </div>

      <div>
        <b>Bank:</b> Kotak Mahindra Bank
      </div>

      <div>
        <b>Branch:</b> Kotak Mahindra Bank, Nigdi
      </div>

      <div>
        <b>Account No:</b> 4650887738
      </div>

      <div>
        <b>IFSC:</b> KKBK0001757
      </div>

      <div>
        <b>UPI ID:</b> uttam.bhosale26@kotak
      </div>
    </div>
  </div>

  {/* UPI QR */}

  <div
    style={{
      width: "160px",
      textAlign: "center",
      borderLeft: "1px solid #ddd",
      paddingLeft: "15px",
    }}
  >
    <div
      style={{
        fontWeight: "bold",
        color: "#0F4C81",
        marginBottom: "6px",
      }}
    >
      SCAN & PAY
    </div>

    <img
      src="/uk-exim-upi-qr.png"
      alt="UPI QR Code"
      style={{
        width: "120px",
        height: "120px",
        objectFit: "contain",
      }}
    />

    <div
      style={{
        fontSize: "11px",
        marginTop: "5px",
      }}
    >
      UPI: uttam.bhosale26@kotak
    </div>
  </div>
</div>
      {/* ===========================
          REMARKS
      =========================== */}

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

      {/* ===========================
          SIGNATURE
      =========================== */}

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

          <br /><br /><br />

          Authorized Signatory

        </div>

      </div>
      {/* ===========================
          ACTION BUTTONS
      =========================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          marginTop: "30px",
        }}
      >

        <button
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
      {/* ===========================
          TERMS & CONDITIONS
      =========================== */}

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
          <li>Goods once sold will not be taken back.</li>

          <li>
            Subject to Pune Jurisdiction only.
          </li>

          <li>
            Please check the material before accepting delivery.
          </li>

          <li>
            Interest @18% p.a. will be charged on overdue bills.
          </li>

          <li>
            Thank you for your valuable business.
          </li>
        </ol>
      </div>

      {/* ===========================
          FOOTER
      =========================== */}

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

        <div
          style={{
            marginTop: "8px",
          }}
        >
          Designed & Developed by
        </div>

        <b>Uttam Bhosale</b>

        <div>
          AI Development Assistance
        </div>

        <b>ChatGPT (OpenAI)</b>

      </div>
      {/* ===========================
          PRINT STYLE
      =========================== */}

      <style>
        {`
          @page {
            size: A4;
            margin: 12mm;
          }

          @media print {

            body {
              margin: 0;
              padding: 0;
              background: white;
            }

            button {
              display: none !important;
            }
body * {
  visibility: hidden;
}

#invoice-print,
#invoice-print * {
  visibility: visible;
}

#invoice-print {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  margin: 0;
  padding: 20px;
  background: white;
}

            table {
              page-break-inside: avoid;
            }

            tr {
              page-break-inside: avoid;
            }

            h1,
            h2,
            h3 {
              page-break-after: avoid;
            }

          }
        `}
   </style>

      {/* END OF MAIN CONTAINER */}

    </div>
  );
}

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
/*

Future Version Features

✔ Company Logo
✔ QR Code
✔ UPI QR
✔ Amount In Words
✔ Customer Address
✔ Customer GST No
✔ Transport Details
✔ E-Way Bill
✔ Multiple Products
✔ PDF Download
✔ Email Invoice

UK EXIM ERP Version 1.0
Designed & Developed by
Uttam Bhosale

AI Development Assistance
ChatGPT (OpenAI)

*/