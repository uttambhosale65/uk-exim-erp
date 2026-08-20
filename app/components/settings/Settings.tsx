"use client";

import React, { useEffect, useState } from "react";
import {
  downloadERPBackup,
  restoreERPBackup,
} from "../../utils/ERPBackup";
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

const COMPANY_KEY = "uk-exim-company-settings";
const INVOICE_KEY = "uk-exim-invoice-settings";
const BANK_KEY = "uk-exim-bank-settings";

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

export default function Settings() {
  const [activeTab, setActiveTab] = useState("company");

  const [company, setCompany] =
    useState<CompanySettings>(defaultCompany);

  const [invoice, setInvoice] =
    useState<InvoiceSettings>(defaultInvoice);

  const [bank, setBank] =
    useState<BankSettings>(defaultBank);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const savedCompany = localStorage.getItem(COMPANY_KEY);
      const savedInvoice = localStorage.getItem(INVOICE_KEY);
      const savedBank = localStorage.getItem(BANK_KEY);

      if (savedCompany) {
        setCompany({
          ...defaultCompany,
          ...JSON.parse(savedCompany),
        });
      }

      if (savedInvoice) {
        setInvoice({
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
      console.error("Settings loading error:", error);
    }
  }, []);

  const saveSettings = () => {
    try {
      localStorage.setItem(
        COMPANY_KEY,
        JSON.stringify(company)
      );

      localStorage.setItem(
        INVOICE_KEY,
        JSON.stringify(invoice)
      );

      localStorage.setItem(
        BANK_KEY,
        JSON.stringify(bank)
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error("Settings save error:", error);
    }
  };

  const resetSettings = () => {
    if (
      !window.confirm(
        "Are you sure you want to restore default settings?"
      )
    ) {
      return;
    }

    setCompany(defaultCompany);
    setInvoice(defaultInvoice);
    setBank(defaultBank);

    localStorage.setItem(
      COMPANY_KEY,
      JSON.stringify(defaultCompany)
    );

    localStorage.setItem(
      INVOICE_KEY,
      JSON.stringify(defaultInvoice)
    );

    localStorage.setItem(
      BANK_KEY,
      JSON.stringify(defaultBank)
    );

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#374151",
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: "15px",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 18px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
    background: active ? "#22c55e" : "#e5e7eb",
    color: active ? "#ffffff" : "#374151",
  });

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          padding: "18px 20px",
          marginBottom: "18px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#0F4C81",
          }}
        >
          ⚙️ Settings
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          Manage your company, invoice and bank details.
        </p>
      </div>

      {/* TABS */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <button
          style={tabStyle(activeTab === "company")}
          onClick={() => setActiveTab("company")}
        >
          🏢 Company Profile
        </button>

        <button
          style={tabStyle(activeTab === "invoice")}
          onClick={() => setActiveTab("invoice")}
        >
          🧾 Invoice Settings
        </button>

        <button
          style={tabStyle(activeTab === "bank")}
          onClick={() => setActiveTab("bank")}
        >
          🏦 Bank & UPI
        </button>
      </div>
N{/* ERP DATA BACKUP */}

<div
  style={{
    background: "#ffffff",
    borderRadius: "10px",
    padding: "18px 20px",
    marginBottom: "18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  }}
>
  <h3
    style={{
      margin: "0 0 6px 0",
      color: "#0F4C81",
    }}
  >
    💾 ERP Data Backup
  </h3>

  <p
    style={{
      margin: "0 0 14px 0",
      color: "#6b7280",
      fontSize: "12px",
    }}
  >
    Backup and restore your complete ERP business data.
  </p>

  <div
    style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      onClick={() => {
        try {
          downloadERPBackup();

          alert(
            "ERP backup downloaded successfully."
          );
        } catch (error) {
          console.error(
            "Backup failed:",
            error
          );

          alert(
            "Backup failed. Please try again."
          );
        }
      }}
      style={{
        padding: "10px 16px",
        border: "none",
        borderRadius: "6px",
        background: "#14532d",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      💾 Backup ERP Data
    </button>

    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: "6px",
        background: "#2563eb",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "13px",
        cursor: "pointer",
      }}
    >
      📥 Restore ERP Data

      <input
        type="file"
        accept=".json,application/json"
        style={{
          display: "none",
        }}
        onChange={async (e) => {
          const file =
            e.target.files?.[0];

          if (!file) {
            return;
          }

          const confirmed =
            window.confirm(
              "Restore backup? Existing ERP data will be replaced."
            );

          if (!confirmed) {
            e.target.value = "";
            return;
          }

          try {
            await restoreERPBackup(file);

            alert(
              "ERP data restored successfully. Please refresh the page."
            );

            window.location.reload();
          } catch (error) {
            console.error(
              "Restore failed:",
              error
            );

            alert(
              "Restore failed. Invalid or corrupted backup file."
            );
          }

          e.target.value = "";
        }}
      />
    </label>
  </div>
</div>
      {/* MAIN CARD */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          padding: "22px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* COMPANY */}

        {activeTab === "company" && (
          <>
            <h3
              style={{
                marginTop: 0,
                color: "#0F4C81",
              }}
            >
              🏢 Company Profile
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "15px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Company Name
                </label>

                <input
                  style={inputStyle}
                  value={company.companyName}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      companyName: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Mobile
                </label>

                <input
                  style={inputStyle}
                  value={company.mobile}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      mobile: e.target.value,
                    })
                  }
                />
              </div>

              <div
                style={{
                  ...fieldStyle,
                  gridColumn: "1 / -1",
                }}
              >
                <label style={labelStyle}>
                  Address
                </label>

                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "70px",
                    resize: "vertical",
                  }}
                  value={company.address}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  GSTIN
                </label>

                <input
                  style={inputStyle}
                  value={company.gstin}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      gstin: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  FSSAI
                </label>

                <input
                  style={inputStyle}
                  value={company.fssai}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      fssai: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  IEC
                </label>

                <input
                  style={inputStyle}
                  value={company.iec}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      iec: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Email
                </label>

                <input
                  style={inputStyle}
                  value={company.email}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Website
                </label>

                <input
                  style={inputStyle}
                  value={company.website}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      website: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Logo Path
                </label>

                <input
                  style={inputStyle}
                  value={company.logo}
                  onChange={(e) =>
                    setCompany({
                      ...company,
                      logo: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* INVOICE */}

        {activeTab === "invoice" && (
          <>
            <h3
              style={{
                marginTop: 0,
                color: "#0F4C81",
              }}
            >
              🧾 Invoice Settings
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "15px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Invoice Prefix
                </label>

                <input
                  style={inputStyle}
                  value={invoice.invoicePrefix}
                  onChange={(e) =>
                    setInvoice({
                      ...invoice,
                      invoicePrefix: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Next Invoice Number
                </label>

                <input
                  style={inputStyle}
                  value={invoice.nextInvoiceNumber}
                  onChange={(e) =>
                    setInvoice({
                      ...invoice,
                      nextInvoiceNumber:
                        e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <h4
              style={{
                marginTop: "15px",
                color: "#374151",
              }}
            >
              Terms & Conditions
            </h4>

            {[
              "terms1",
              "terms2",
              "terms3",
              "terms4",
              "terms5",
            ].map((key, index) => (
              <div
                key={key}
                style={fieldStyle}
              >
                <label style={labelStyle}>
                  Term {index + 1}
                </label>

                <input
                  style={inputStyle}
                  value={
                    invoice[
                      key as keyof InvoiceSettings
                    ]
                  }
                  onChange={(e) =>
                    setInvoice({
                      ...invoice,
                      [key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </>
        )}

        {/* BANK */}

        {activeTab === "bank" && (
          <>
            <h3
              style={{
                marginTop: 0,
                color: "#0F4C81",
              }}
            >
              🏦 Bank & UPI Settings
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "15px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Account Name
                </label>

                <input
                  style={inputStyle}
                  value={bank.accountName}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      accountName: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Bank Name
                </label>

                <input
                  style={inputStyle}
                  value={bank.bankName}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      bankName: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Branch
                </label>

                <input
                  style={inputStyle}
                  value={bank.branch}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      branch: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Account Number
                </label>

                <input
                  style={inputStyle}
                  value={bank.accountNumber}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      accountNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  IFSC
                </label>

                <input
                  style={inputStyle}
                  value={bank.ifsc}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      ifsc: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  UPI ID
                </label>

                <input
                  style={inputStyle}
                  value={bank.upiId}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      upiId: e.target.value,
                    })
                  }
                />
              </div>

              <div
                style={{
                  ...fieldStyle,
                  gridColumn: "1 / -1",
                }}
              >
                <label style={labelStyle}>
                  QR Image Path
                </label>

                <input
                  style={inputStyle}
                  value={bank.qrImage}
                  onChange={(e) =>
                    setBank({
                      ...bank,
                      qrImage: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* ACTIONS */}

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            marginTop: "20px",
            paddingTop: "18px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button
            onClick={saveSettings}
            style={{
              padding: "10px 22px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            💾 Save Settings
          </button>

          <button
            onClick={resetSettings}
            style={{
              padding: "10px 22px",
              background: "#6b7280",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 Reset
          </button>

          {saved && (
            <span
              style={{
                color: "#16a34a",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              ✅ Settings Saved Successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}