"use client";

import React from "react";

export type TransactionConfirmMode =
  | "CREATE"
  | "UPDATE";

type TransactionItem = {
  productCode?: string;
  productName?: string;
  unit?: string;
  qty?: number;
  rate?: number;
  amount?: number;
};

type TransactionData = {
  purchaseNo?: string;
  purchaseDate?: string;
  invoiceNo?: string;

  salesNo?: string;
  salesDate?: string;

  supplierCode?: string;
  supplierName?: string;
  supplierContactPerson?: string;

  customerCode?: string;
  customerName?: string;
  contactPerson?: string;

  items?: TransactionItem[];

  totalQty?: number;
  totalAmount?: number;
  totalGstAmount?: number;
  totalNetAmount?: number;

  taxableAmount?: number;
  gstAmount?: number;
  grandTotal?: number;

  paymentMode?: string;
};

type TransactionConfirmModalProps = {
  open: boolean;

  type: "PURCHASE" | "SALES";

  mode: TransactionConfirmMode;

  transaction: TransactionData;

  onConfirm: () => void;

  onCancel: () => void;
};

function formatDateDisplay(
  dateValue?: string
): string {
  if (!dateValue) {
    return "-";
  }

  const parts = dateValue.split("-");

  if (parts.length !== 3) {
    return dateValue;
  }

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

function money(value?: number): string {
  return `₹ ${Number(value || 0).toFixed(2)}`;
}

export default function TransactionConfirmModal({
  open,
  type,
  mode,
  transaction,
  onConfirm,
  onCancel,
}: TransactionConfirmModalProps) {
  if (!open) {
    return null;
  }

  const isPurchase =
    type === "PURCHASE";

  const title =
    isPurchase
      ? mode === "CREATE"
        ? "Confirm Purchase / GRN"
        : "Confirm GRN Update"
      : mode === "CREATE"
      ? "Confirm Sale"
      : "Confirm Sale Update";

  const confirmText =
    isPurchase
      ? mode === "CREATE"
        ? "✓ Confirm GRN"
        : "✓ Update GRN"
      : mode === "CREATE"
      ? "✓ Confirm Sale"
      : "✓ Update Sale";

  const number =
    isPurchase
      ? transaction.purchaseNo
      : transaction.salesNo;

  const date =
    isPurchase
      ? transaction.purchaseDate
      : transaction.salesDate;

  const partyCode =
    isPurchase
      ? transaction.supplierCode
      : transaction.customerCode;

  const partyName =
    isPurchase
      ? transaction.supplierName
      : transaction.customerName;

  const contactPerson =
    isPurchase
      ? transaction.supplierContactPerson
      : transaction.contactPerson;

  const totalQty =
    Number(
      transaction.totalQty ??
        (transaction.items || []).reduce(
          (total, item) =>
            total + Number(item.qty || 0),
          0
        )
    );

  const amount =
    isPurchase
      ? Number(
          transaction.totalAmount || 0
        )
      : Number(
          transaction.taxableAmount || 0
        );

  const gstAmount =
    isPurchase
      ? Number(
          transaction.totalGstAmount || 0
        )
      : Number(
          transaction.gstAmount || 0
        );

  const netAmount =
    isPurchase
      ? Number(
          transaction.totalNetAmount || 0
        )
      : Number(
          transaction.grandTotal || 0
        );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,

        background:
          "rgba(0,0,0,0.45)",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        padding: "12px",

        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          MODAL
      ================================================= */}

      <div
        style={{
          width: "100%",
          maxWidth: "760px",

          background: "#ffffff",

          borderRadius: "10px",

          boxShadow:
            "0 12px 35px rgba(0,0,0,0.25)",

          border:
            "1px solid #d1d5db",

          boxSizing: "border-box",

          overflow: "hidden",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            padding: "11px 16px",

            background: "#14532d",

            color: "#ffffff",

            display: "flex",

            alignItems: "center",

            justifyContent:
              "space-between",

            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            {title}
          </div>

          <button
            type="button"
            onClick={onCancel}
            style={{
              width: "30px",
              height: "30px",

              border: "none",

              borderRadius: "5px",

              background:
                "rgba(255,255,255,0.15)",

              color: "#ffffff",

              fontSize: "18px",

              cursor: "pointer",

              display: "flex",

              alignItems: "center",

              justifyContent:
                "center",
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div
          style={{
            padding: "12px 16px",
          }}
        >
          {/* WARNING */}

          <div
            style={{
              marginBottom: "10px",

              padding: "7px 10px",

              background: "#fef3c7",

              border:
                "1px solid #fcd34d",

              borderRadius: "6px",

              color: "#92400e",

              fontSize: "11px",

              fontWeight: 600,
            }}
          >
            Please verify the details before
            confirming this transaction.
          </div>

          {/* =================================================
              TRANSACTION DETAILS
          ================================================= */}

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "90px 1fr 90px 1fr",

              border:
                "1px solid #d1d5db",

              borderRadius: "6px",

              overflow: "hidden",

              marginBottom: "10px",
            }}
          >
            <CompactDetail
              label={
                isPurchase
                  ? "GRN No."
                  : "Sales No."
              }
              value={number || "-"}
            />

            <CompactDetail
              label="Date"
              value={formatDateDisplay(date)}
            />

            <CompactDetail
              label="Invoice No."
              value={
                transaction.invoiceNo ||
                "-"
              }
            />

            <CompactDetail
              label={
                isPurchase
                  ? "Supplier"
                  : "Customer"
              }
              value={
                partyCode
                  ? `${partyCode} - ${
                      partyName || ""
                    }`
                  : partyName || "-"
              }
            />

            <CompactDetail
              label="Contact Person"
              value={
                contactPerson || "-"
              }
            />

            {!isPurchase ? (
              <CompactDetail
                label="Payment"
                value={
                  transaction.paymentMode ||
                  "-"
                }
              />
            ) : (
              <CompactDetail
                label="Document"
                value="Purchase / GRN"
              />
            )}
          </div>

          {/* =================================================
              PRODUCT DETAILS
          ================================================= */}

          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: "6px",

              fontSize: "13px",

              fontWeight: 700,

              color: "#14532d",

              marginBottom: "6px",
            }}
          >
            📦 Product Details
          </div>

          <div
            style={{
              border:
                "1px solid #d1d5db",

              borderRadius: "6px",

              overflow: "hidden",

              marginBottom: "10px",
            }}
          >
            {/* TABLE HEADER */}

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "32px minmax(0,1fr) 70px 65px 80px 95px",

                gap: "5px",

                alignItems: "center",

                padding: "6px 8px",

                background: "#f1f5f9",

                borderBottom:
                  "1px solid #d1d5db",

                fontSize: "10px",

                fontWeight: 700,

                color: "#374151",
              }}
            >
              <span
                style={{
                  textAlign: "center",
                }}
              >
                #
              </span>

              <span>
                Product
              </span>

              <span>
                Code
              </span>

              <span
                style={{
                  textAlign: "right",
                }}
              >
                Qty
              </span>

              <span
                style={{
                  textAlign: "right",
                }}
              >
                Rate
              </span>

              <span
                style={{
                  textAlign: "right",
                }}
              >
                Amount
              </span>
            </div>

            {/* TABLE ROWS */}

            {(transaction.items || []).map(
              (item, index) => (
                <div
                  key={`${item.productCode || "item"}-${index}`}
                  style={{
                    display: "grid",

                    gridTemplateColumns:
                      "32px minmax(0,1fr) 70px 65px 80px 95px",

                    gap: "5px",

                    alignItems: "center",

                    padding: "6px 8px",

                    background:
                      index % 2 === 0
                        ? "#ffffff"
                        : "#f8fafc",

                    borderBottom:
                      index <
                      (transaction.items ||
                        []).length -
                        1
                        ? "1px solid #e5e7eb"
                        : "none",

                    fontSize: "10px",
                  }}
                >
                  <span
                    style={{
                      textAlign:
                        "center",

                      color:
                        "#6b7280",
                    }}
                  >
                    {index + 1}
                  </span>

                  <span
                    style={{
                      minWidth: 0,

                      fontWeight: 600,

                      color:
                        "#374151",

                      overflow: "hidden",

                      textOverflow:
                        "ellipsis",

                      whiteSpace:
                        "nowrap",
                    }}
                    title={
                      item.productName ||
                      item.productCode ||
                      "-"
                    }
                  >
                    {item.productName ||
                      item.productCode ||
                      "-"}
                  </span>

                  <span
                    style={{
                      color:
                        "#6b7280",
                    }}
                  >
                    {item.productCode ||
                      "-"}
                  </span>

                  <span
                    style={{
                      textAlign:
                        "right",

                      fontWeight: 600,
                    }}
                  >
                    {Number(
                      item.qty || 0
                    ).toFixed(2)}
                    {" "}
                    {item.unit || ""}
                  </span>

                  <span
                    style={{
                      textAlign:
                        "right",
                    }}
                  >
                    {money(
                      item.rate
                    )}
                  </span>

                  <span
                    style={{
                      textAlign:
                        "right",

                      fontWeight: 700,
                    }}
                  >
                    {money(
                      item.amount
                    )}
                  </span>
                </div>
              )
            )}

            {(transaction.items || [])
              .length === 0 && (
              <div
                style={{
                  padding: "10px",

                  textAlign:
                    "center",

                  color:
                    "#6b7280",

                  fontSize: "10px",
                }}
              >
                No products
              </div>
            )}
          </div>

          {/* =================================================
              TOTALS
          ================================================= */}

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(4, minmax(0,1fr))",

              gap: "6px",

              marginBottom: "10px",
            }}
          >
            <SummaryBox
              label="Total Qty"
              value={totalQty.toFixed(2)}
            />

            <SummaryBox
              label={
                isPurchase
                  ? "Total Amount"
                  : "Taxable Amount"
              }
              value={money(amount)}
            />

            <SummaryBox
              label="GST Amount"
              value={money(gstAmount)}
            />

            <SummaryBox
              label={
                isPurchase
                  ? "Net Amount"
                  : "Grand Total"
              }
              value={money(netAmount)}
              highlight
            />
          </div>

        
          {/* =================================================
              ACTIONS
          ================================================= */}

          <div
            style={{
              display: "flex",

              justifyContent:
                "flex-end",

              alignItems: "center",

              gap: "8px",

              paddingTop: "2px",

              borderTop:
                "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                height: "34px",

                padding: "0 16px",

                border:
                  "1px solid #9ca3af",

                borderRadius: "6px",

                background:
                  "#ffffff",

                color:
                  "#374151",

                fontSize: "11px",

                fontWeight: 700,

                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              style={{
                height: "34px",

                padding: "0 18px",

                border: "none",

                borderRadius: "6px",

                background:
                  "#166534",

                color: "#ffffff",

                fontSize: "11px",

                fontWeight: 700,

                cursor: "pointer",
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMPACT DETAIL
========================================================= */

function CompactDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <>
      <div
        style={{
          padding: "6px 8px",

          background:
            "#f8fafc",

          borderBottom:
            "1px solid #e5e7eb",

          fontSize: "10px",

          fontWeight: 700,

          color: "#374151",

          whiteSpace:
            "nowrap",
        }}
      >
        {label}
      </div>

      <div
        style={{
          padding: "6px 8px",

          borderBottom:
            "1px solid #e5e7eb",

          fontSize: "10px",

          color: "#374151",

          overflow: "hidden",

          textOverflow:
            "ellipsis",

          whiteSpace:
            "nowrap",

          minWidth: 0,
        }}
        title={value}
      >
        {value}
      </div>
    </>
  );
}

/* =========================================================
   SUMMARY BOX
========================================================= */

function SummaryBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "7px 9px",

        background: highlight
          ? "#ecfdf5"
          : "#f8fafc",

        border: highlight
          ? "1px solid #86efac"
          : "1px solid #e5e7eb",

        borderRadius: "6px",

        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "9px",

          color: "#6b7280",

          marginBottom: "2px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "12px",

          fontWeight: 800,

          color: highlight
            ? "#14532d"
            : "#374151",

          overflow: "hidden",

          textOverflow:
            "ellipsis",

          whiteSpace:
            "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}