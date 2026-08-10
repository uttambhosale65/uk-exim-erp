"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Sales } from "./SalesTypes";
type CompanySettings = {
  companyName: string;
  address: string;
  gstin: string;
  fssai: string;
  iec: string;
  mobile: string;
  email: string;
  website: string;
  logo: string;
};

type InvoiceSettings = {
  invoicePrefix: string;
  nextInvoiceNumber: string;
  terms1: string;
  terms2: string;
  terms3: string;
  terms4: string;
  terms5: string;
};

type BankSettings = {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  qrImage: string;
};
type Props = {
  sale: Sales;
  onClose?: () => void;
};
const defaultCompany: CompanySettings = {
  companyName: "UK EXIM ENTERPRISES",
  address:
    "A-703, Vishnu Greens, City Pride School Road, Jadhavwadi, Chikhali, Pune - 411062, Maharashtra, India",
  gstin: "27AJUPB0025D1ZO",
  fssai: "21525038000816",
  iec: "AJUPB0025D",
  mobile: "+91 9970187185",
  email: "uk37exim@gmail.com",
  website: "www.ukeximenterprises.com",
  logo: "/uklogo.png",
};

const defaultInvoice: InvoiceSettings = {
  invoicePrefix: "INV",
  nextInvoiceNumber: "1",
  terms1: "Goods once sold will not be taken back.",
  terms2: "Subject to Pune Jurisdiction only.",
  terms3: "Please check the material before accepting delivery.",
  terms4: "Interest @18% p.a. will be charged on overdue bills.",
  terms5: "Thank you for your valuable business.",
};

const defaultBank: BankSettings = {
  bankName: "Kotak Mahindra Bank",
  branch: "Kotak Mahindra Bank, Nigdi",
  accountName: "UK EXIM ENTERPRISES",
  accountNumber: "4650887738",
  ifsc: "KKBK0001757",
  upiId: "uttam.bhosale26@kotak",
  qrImage: "/uk-exim-upi-qr.png",
};
export default function InvoicePrint({
  sale,
  onClose,
}: Props) {
  const [company, setCompany] =
    useState<CompanySettings>(defaultCompany);

  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceSettings>(defaultInvoice);

  const [bank, setBank] =
    useState<BankSettings>(defaultBank);

  useEffect(() => {
    try {
      const savedCompany =
        localStorage.getItem("uk-exim-company-settings");

      const savedInvoice =
        localStorage.getItem("uk-exim-invoice-settings");

      const savedBank =
        localStorage.getItem("uk-exim-bank-settings");

      if (savedCompany) {
        setCompany({
          ...defaultCompany,
          ...JSON.parse(savedCompany),
        });
      }

      if (savedInvoice) {
        setInvoiceSettings({
          ...defaultInvoice,
          ...JSON.parse(savedInvoice),
        });
      }

      if (savedBank) {
        setBank({
          ...defaultBank,
          ...JSON.parse(savedBank),
        });
      }
    } catch (error) {
      console.error(
        "Invoice settings loading error:",
        error
      );
    }
  }, []);
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
  {company.companyName}
</h1>
</div>

    <div style={{ fontWeight: "bold" }}>
  Exporter • Importer • Supplier
</div>

<div style={{ fontSize: "14px" }}>
 {company.address}
</div>

<div style={{ fontSize: "13px", marginTop: "6px" }}>
  GSTIN : {company.gstin} | FSSAI : {company.fssai} | IEC : {company.iec}
</div>

<div style={{ fontSize: "13px" }}>
  📞 {company.mobile} | ✉️ {company.email} | 🌐 {company.website}
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
        <b>Account Name:</b> {bank.accountName}
      </div>

      <div>
        <b>Bank:</b> {bank.accountName}
      </div>

      <div>
        <b>Branch:</b> {bank.branch}
      </div>

      <div>
        <b>Account No:</b> 1{bank.accountNumber}
      </div>

      <div>
        <b>IFSC:</b> {bank.ifsc}
      </div>

      <div>
        <b>UPI ID:</b> {bank.upiId}
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
          <li>{invoiceSettings.terms1}</li>

          <li>
            {invoiceSettings.terms2}
          </li>

          <li>
            {invoiceSettings.terms3}
          </li>

          <li>
            {invoiceSettings.terms4}
          </li>

          <li>
            {invoiceSettings.terms5}
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