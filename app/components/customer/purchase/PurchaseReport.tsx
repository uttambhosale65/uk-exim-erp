"use client";

/* =========================================================
   UK EXIM ERP – PURCHASE / GRN REPORT
   VERSION 1.0 – PROFESSIONAL ERP

   LAYOUT STANDARD
   - Horizontal report layout
   - All columns visible
   - No data hiding
   - Compact professional spacing
   - Vertical rows allowed
   - Responsive screen layout
   - Print-ready structure
========================================================= */

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { Purchase } from "./PurchaseTypes";
import { loadPurchases } from "./PurchaseStorage";

/* =========================================================
   MAIN PURCHASE REPORT
========================================================= */

export default function PurchaseReport() {
  const [purchases, setPurchases] =
    useState<Purchase[]>([]);

  const [search, setSearch] =
    useState("");

  /* =======================================================
     LOAD PURCHASE DATA
  ======================================================= */

  useEffect(() => {
    setPurchases(loadPurchases());
  }, []);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredPurchases = useMemo(() => {
    const keyword =
      search.toLowerCase().trim();

    if (!keyword) {
      return purchases;
    }

    return purchases.filter(
      (purchase) => {
        const documentMatch =
          String(
            purchase.purchaseNo ?? ""
          )
            .toLowerCase()
            .includes(keyword) ||
          String(
            purchase.purchaseDate ?? ""
          )
            .toLowerCase()
            .includes(keyword) ||
          String(
            purchase.invoiceNo ?? ""
          )
            .toLowerCase()
            .includes(keyword) ||
          String(
            purchase.supplierCode ?? ""
          )
            .toLowerCase()
            .includes(keyword) ||
          String(
            purchase.supplierName ?? ""
          )
            .toLowerCase()
            .includes(keyword) ||
          String(
            purchase.remarks ?? ""
          )
            .toLowerCase()
            .includes(keyword);

        const itemMatch =
          purchase.items?.some(
            (item) =>
              String(
                item.productCode ?? ""
              )
                .toLowerCase()
                .includes(keyword) ||
              String(
                item.productName ?? ""
              )
                .toLowerCase()
                .includes(keyword) ||
              String(
                item.hsn ?? ""
              )
                .toLowerCase()
                .includes(keyword) ||
              String(
                item.unit ?? ""
              )
                .toLowerCase()
                .includes(keyword)
          ) ?? false;

        return (
          documentMatch ||
          itemMatch
        );
      }
    );
  }, [purchases, search]);

  /* =======================================================
     REPORT TOTALS
  ======================================================= */

  const totalGRN =
    filteredPurchases.length;

  const totalQuantity =
    filteredPurchases.reduce(
      (total, purchase) =>
        total +
        Number(
          purchase.totalQty ?? 0
        ),
      0
    );

  const totalAmount =
    filteredPurchases.reduce(
      (total, purchase) =>
        total +
        Number(
          purchase.totalAmount ?? 0
        ),
      0
    );

  const totalGST =
    filteredPurchases.reduce(
      (total, purchase) =>
        total +
        Number(
          purchase.totalGstAmount ?? 0
        ),
      0
    );

  const totalNetAmount =
    filteredPurchases.reduce(
      (total, purchase) =>
        total +
        Number(
          purchase.totalNetAmount ?? 0
        ),
      0
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div style={containerStyle}>

      {/* =================================================
          HEADER
      ================================================= */}

      <div style={headerStyle}>

        <div style={titleGroupStyle}>

          <h2 style={titleStyle}>
            📊 Purchase Register
          </h2>

          <div style={subtitleStyle}>
            GRN-wise Purchase Details
          </div>

        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search GRN / Supplier / Product"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={searchStyle}
        />

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div style={summaryGridStyle}>

        {/* TOTAL GRN */}

        <div style={summaryCardStyle}>

          <div style={summaryLabelStyle}>
            Total GRN
          </div>

          <div style={summaryValueStyle}>
            {totalGRN}
          </div>

        </div>

        {/* TOTAL QUANTITY */}

        <div style={summaryCardStyle}>

          <div style={summaryLabelStyle}>
            Total Quantity
          </div>

          <div style={summaryValueStyle}>
            {totalQuantity.toFixed(2)}
          </div>

        </div>

        {/* TOTAL AMOUNT */}

        <div style={summaryCardStyle}>

          <div style={summaryLabelStyle}>
            Total Amount
          </div>

          <div style={summaryValueStyle}>
            ₹
            {totalAmount.toFixed(2)}
          </div>

        </div>

        {/* TOTAL GST */}

        <div style={summaryCardStyle}>

          <div style={summaryLabelStyle}>
            Total GST
          </div>

          <div style={summaryValueStyle}>
            ₹
            {totalGST.toFixed(2)}
          </div>

        </div>

        {/* NET PURCHASE */}

        <div
          style={{
            ...summaryCardStyle,
            background: "#f0fdf4",
            borderColor: "#bbf7d0",
          }}
        >

          <div style={summaryLabelStyle}>
            Net Purchase
          </div>

          <div
            style={{
              ...summaryValueStyle,
              color: "#14532d",
            }}
          >
            ₹
            {totalNetAmount.toFixed(2)}
          </div>

        </div>

      </div>

      {/* =================================================
          PURCHASE TABLE
      ================================================= */}

      <div style={tableWrapperStyle}>

        <table style={tableStyle}>

          {/* =================================================
              TABLE HEADER
          ================================================= */}

          <thead>

            <tr
              style={{
                background: "#14532d",
                color: "#ffffff",
              }}
            >

              <th
                style={{
                  ...thStyle,
                  width: "3%",
                  textAlign: "center",
                }}
              >
                #
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "7%",
                }}
              >
                GRN No
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "7%",
                }}
              >
                Date
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "8%",
                }}
              >
                Invoice
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "12%",
                }}
              >
                Supplier
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "15%",
                }}
              >
                Product
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "6%",
                }}
              >
                HSN
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "5%",
                }}
              >
                Unit
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "6%",
                  textAlign: "right",
                }}
              >
                Qty
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "7%",
                  textAlign: "right",
                }}
              >
                Rate
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "8%",
                  textAlign: "right",
                }}
              >
                Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "5%",
                  textAlign: "center",
                }}
              >
                GST
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "8%",
                  textAlign: "right",
                }}
              >
                GST Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "8%",
                  textAlign: "right",
                }}
              >
                Net Amount
              </th>

            </tr>

          </thead>

          {/* =================================================
              TABLE BODY
          ================================================= */}

          <tbody>

            {filteredPurchases.length === 0 ? (

              <tr>

                <td
                  colSpan={14}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    padding: "30px 12px",
                    color: "#6b7280",
                    fontWeight: 600,
                  }}
                >
                  📋 No Purchase Records Found
                </td>

              </tr>

            ) : (

              filteredPurchases.map(
                (
                  purchase,
                  purchaseIndex
                ) => {

                  const items =
                    purchase.items ?? [];

                  return (
                    <PurchaseRows
                      key={purchase.id}
                      purchase={purchase}
                      purchaseIndex={
                        purchaseIndex
                      }
                      items={items}
                    />
                  );
                }
              )

            )}

          </tbody>

        </table>

      </div>

      {/* =================================================
          REPORT FOOTER SUMMARY
      ================================================= */}

      {filteredPurchases.length > 0 && (

        <div
          style={reportFooterStyle}
        >

          <span>
            Showing{" "}
            <strong>
              {filteredPurchases.length}
            </strong>{" "}
            of{" "}
            <strong>
              {purchases.length}
            </strong>{" "}
            GRN records
          </span>

          {search && (

            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              style={
                clearSearchButtonStyle
              }
            >
              ✖ Clear Search
            </button>

          )}

        </div>

      )}

    </div>
  );
}

/* =========================================================
   PURCHASE ROWS
   एका GRN मधील सर्व Product Rows
========================================================= */

type PurchaseRowsProps = {
  purchase: Purchase;
  purchaseIndex: number;
  items: Purchase["items"];
};

function PurchaseRows({
  purchase,
  purchaseIndex,
  items,
}: PurchaseRowsProps) {

  const safeItems =
    items ?? [];

  /* =======================================================
     EMPTY ITEM PROTECTION
  ======================================================= */

  if (safeItems.length === 0) {

    return (
      <tr>

        <td
          style={tdCenterStyle}
        >
          {purchaseIndex + 1}
        </td>

        <td
          style={{
            ...tdStyle,
            fontWeight: 700,
            color: "#14532d",
          }}
        >
          {purchase.purchaseNo}
        </td>

        <td style={tdStyle}>
          {purchase.purchaseDate}
        </td>

        <td style={tdStyle}>
          {purchase.invoiceNo || "-"}
        </td>

        <td
          style={{
            ...tdStyle,
            fontWeight: 600,
          }}
        >
          {purchase.supplierName}
        </td>

        <td
          colSpan={9}
          style={{
            ...tdStyle,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          No Product Items
        </td>

      </tr>
    );
  }

  return (
    <>
      {/* =================================================
          PRODUCT ROWS
      ================================================= */}

      {safeItems.map(
        (item, itemIndex) => (

          <tr
            key={`${purchase.id}-${itemIndex}`}
            style={{
              background:
                itemIndex % 2 === 0
                  ? "#ffffff"
                  : "#f8fafc",
            }}
          >

            {/* # */}

            <td
              style={tdCenterStyle}
            >
              {itemIndex === 0
                ? purchaseIndex + 1
                : ""}
            </td>

            {/* GRN NO */}

            <td
              style={{
                ...tdStyle,
                fontWeight: 700,
                color: "#14532d",
              }}
            >
              {itemIndex === 0
                ? purchase.purchaseNo
                : ""}
            </td>

            {/* DATE */}

            <td style={tdStyle}>
              {itemIndex === 0
                ? purchase.purchaseDate
                : ""}
            </td>

            {/* INVOICE */}

            <td style={tdStyle}>
              {itemIndex === 0
                ? purchase.invoiceNo || "-"
                : ""}
            </td>

            {/* SUPPLIER */}

            <td
              style={{
                ...tdStyle,
                fontWeight: 600,
              }}
            >
              {itemIndex === 0
                ? purchase.supplierName
                : ""}
            </td>

            {/* PRODUCT */}

            <td
              style={{
                ...tdStyle,
                fontWeight: 600,
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: 1.2,
              }}
            >
              {item.productName}
            </td>

            {/* HSN */}

            <td style={tdStyle}>
              {item.hsn}
            </td>

            {/* UNIT */}

            <td style={tdStyle}>
              {item.unit}
            </td>

            {/* QTY */}

            <td
              style={{
                ...tdStyle,
                textAlign: "right",
              }}
            >
              {Number(
                item.qty ?? 0
              ).toFixed(2)}
            </td>

            {/* RATE */}

            <td
              style={{
                ...tdStyle,
                textAlign: "right",
              }}
            >
              ₹
              {Number(
                item.rate ?? 0
              ).toFixed(2)}
            </td>

            {/* AMOUNT */}

            <td
              style={{
                ...tdStyle,
                textAlign: "right",
              }}
            >
              ₹
              {Number(
                item.amount ?? 0
              ).toFixed(2)}
            </td>

            {/* GST */}

            <td
              style={{
                ...tdStyle,
                textAlign: "center",
              }}
            >
              {Number(
                item.gst ?? 0
              ).toFixed(2)}
              %
            </td>

            {/* GST AMOUNT */}

            <td
              style={{
                ...tdStyle,
                textAlign: "right",
              }}
            >
              ₹
              {Number(
                item.gstAmount ?? 0
              ).toFixed(2)}
            </td>

            {/* NET AMOUNT */}

            <td
              style={{
                ...tdStyle,
                textAlign: "right",
                fontWeight: 700,
                color: "#14532d",
              }}
            >
              ₹
              {Number(
                item.netAmount ?? 0
              ).toFixed(2)}
            </td>

          </tr>
        )
      )}

      {/* =================================================
          GRN TOTAL
      ================================================= */}

      <tr
        style={{
          background: "#ecfdf5",
          fontWeight: 700,
        }}
      >

        <td
          colSpan={8}
          style={{
            ...tdStyle,
            textAlign: "right",
            color: "#14532d",
            fontWeight: 800,
          }}
        >
          GRN TOTAL
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "right",
            color: "#14532d",
          }}
        >
          {Number(
            purchase.totalQty ?? 0
          ).toFixed(2)}
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "right",
            color: "#14532d",
          }}
        >
          -
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "right",
            color: "#14532d",
          }}
        >
          ₹
          {Number(
            purchase.totalAmount ?? 0
          ).toFixed(2)}
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "center",
            color: "#14532d",
          }}
        >
          -
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "right",
            color: "#14532d",
          }}
        >
          ₹
          {Number(
            purchase.totalGstAmount ?? 0
          ).toFixed(2)}
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "right",
            fontWeight: 800,
            color: "#14532d",
          }}
        >
          ₹
          {Number(
            purchase.totalNetAmount ?? 0
          ).toFixed(2)}
        </td>

      </tr>
    </>
  );
}

/* =========================================================
   CONTAINER STYLE
========================================================= */

const containerStyle: CSSProperties = {
  background: "#ffffff",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.08)",
  width: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
};

/* =========================================================
   HEADER STYLE
========================================================= */

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
  width: "100%",
};

/* =========================================================
   TITLE GROUP
========================================================= */

const titleGroupStyle: CSSProperties = {
  minWidth: 0,
  flex: "1 1 auto",
};

/* =========================================================
   TITLE STYLE
========================================================= */

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#14532d",
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1.2,
};

/* =========================================================
   SUBTITLE STYLE
========================================================= */

const subtitleStyle: CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontSize: "11px",
};

/* =========================================================
   SEARCH STYLE
========================================================= */

const searchStyle: CSSProperties = {
  width: "300px",
  maxWidth: "40%",
  height: "34px",
  padding: "0 10px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "12px",
  outline: "none",
  boxSizing: "border-box",
  flexShrink: 0,
};

/* =========================================================
   SUMMARY GRID
========================================================= */

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "12px",
  width: "100%",
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const summaryCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  padding: "8px 10px",
  minHeight: "58px",
  boxSizing: "border-box",
  minWidth: 0,
};

/* =========================================================
   SUMMARY LABEL
========================================================= */

const summaryLabelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "10px",
  fontWeight: 600,
  marginBottom: "5px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* =========================================================
   SUMMARY VALUE
========================================================= */

const summaryValueStyle: CSSProperties = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* =========================================================
   TABLE WRAPPER
========================================================= */

const tableWrapperStyle: CSSProperties = {
  width: "100%",
  overflowX: "hidden",
  overflowY: "visible",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  boxSizing: "border-box",
};

/* =========================================================
   TABLE STYLE

   IMPORTANT:
   No fixed min-width.
   All 14 columns remain visible.
========================================================= */

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  fontSize: "10px",
};

/* =========================================================
   TABLE HEADER STYLE
========================================================= */

const thStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "6px 4px",
  textAlign: "left",
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: 1.15,
  fontSize: "9px",
  fontWeight: 700,
  verticalAlign: "middle",
};

/* =========================================================
   TABLE DATA STYLE
========================================================= */

const tdStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "5px 4px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: "9px",
  lineHeight: 1.2,
  verticalAlign: "middle",
  boxSizing: "border-box",
};

/* =========================================================
   TABLE CENTER STYLE
========================================================= */

const tdCenterStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

/* =========================================================
   REPORT FOOTER
========================================================= */

const reportFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginTop: "10px",
  padding: "7px 10px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "6px",
  color: "#166534",
  fontSize: "10px",
  fontWeight: 600,
};

/* =========================================================
   CLEAR SEARCH BUTTON
========================================================= */

const clearSearchButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontSize: "10px",
  fontWeight: 700,
  cursor: "pointer",
  padding: "2px 4px",
};