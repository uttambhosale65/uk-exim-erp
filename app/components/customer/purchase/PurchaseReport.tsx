"use client";

/* =========================================================
   UK EXIM ERP – PURCHASE / GRN REPORT
   VERSION 1.0 – PROFESSIONAL ERP ARCHITECTURE
========================================================= */

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { Purchase } from "./PurchaseTypes";
import { loadPurchases } from "./PurchaseStorage";

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
    const keyword = search
      .toLowerCase()
      .trim();

    if (!keyword) {
      return purchases;
    }

    return purchases.filter((purchase) => {
      const documentMatch =
        String(purchase.purchaseNo ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(purchase.purchaseDate ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(purchase.invoiceNo ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(purchase.supplierCode ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(purchase.supplierName ?? "")
          .toLowerCase()
          .includes(keyword) ||
        String(purchase.remarks ?? "")
          .toLowerCase()
          .includes(keyword);

      const itemMatch =
        purchase.items?.some((item) =>
          String(item.productCode ?? "")
            .toLowerCase()
            .includes(keyword) ||
          String(item.productName ?? "")
            .toLowerCase()
            .includes(keyword) ||
          String(item.hsn ?? "")
            .toLowerCase()
            .includes(keyword) ||
          String(item.unit ?? "")
            .toLowerCase()
            .includes(keyword)
        ) ?? false;

      return (
        documentMatch ||
        itemMatch
      );
    });
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
      Number(purchase.totalQty ?? 0),
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

        <div>
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
            ₹{totalAmount.toFixed(2)}
          </div>
        </div>

        {/* TOTAL GST */}

        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>
            Total GST
          </div>

          <div style={summaryValueStyle}>
            ₹{totalGST.toFixed(2)}
          </div>
        </div>

        {/* NET PURCHASE */}

        <div
          style={{
            ...summaryCardStyle,
            background: "#f0fdf4",
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
            ₹{totalNetAmount.toFixed(2)}
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
              <th style={thStyle}>#</th>

              <th style={thStyle}>
                GRN No
              </th>

              <th style={thStyle}>
                Date
              </th>

              <th style={thStyle}>
                Invoice
              </th>

              <th style={thStyle}>
                Supplier
              </th>

              <th style={thStyle}>
                Product
              </th>

              <th style={thStyle}>
                HSN
              </th>

              <th style={thStyle}>
                Unit
              </th>

              <th style={thStyle}>
                Qty
              </th>

              <th style={thStyle}>
                Rate
              </th>

              <th style={thStyle}>
                Amount
              </th>

              <th style={thStyle}>
                GST
              </th>

              <th style={thStyle}>
                GST Amount
              </th>

              <th style={thStyle}>
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
                    padding: "35px",
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
      <>
        <tr>

          <td style={tdCenterStyle}>
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
      </>
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
              )}
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
  padding: "20px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.08)",
  width: "100%",
  boxSizing: "border-box",
};

/* =========================================================
   HEADER STYLE
========================================================= */

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "18px",
};

/* =========================================================
   TITLE STYLE
========================================================= */

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#14532d",
  fontSize: "20px",
  fontWeight: 700,
};

/* =========================================================
   SUBTITLE STYLE
========================================================= */

const subtitleStyle: CSSProperties = {
  marginTop: "5px",
  color: "#6b7280",
  fontSize: "12px",
};

/* =========================================================
   SEARCH STYLE
========================================================= */

const searchStyle: CSSProperties = {
  width: "340px",
  maxWidth: "45%",
  height: "38px",
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

/* =========================================================
   SUMMARY GRID
========================================================= */

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, 1fr)",
  gap: "10px",
  marginBottom: "18px",
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const summaryCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "12px",
  minHeight: "72px",
  boxSizing: "border-box",
};

/* =========================================================
   SUMMARY LABEL
========================================================= */

const summaryLabelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: 600,
  marginBottom: "8px",
};

/* =========================================================
   SUMMARY VALUE
========================================================= */

const summaryValueStyle: CSSProperties = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: 800,
};

/* =========================================================
   TABLE WRAPPER
========================================================= */

const tableWrapperStyle: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

/* =========================================================
   TABLE STYLE
========================================================= */

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1500px",
  fontSize: "12px",
};

/* =========================================================
   TABLE HEADER STYLE
========================================================= */

const thStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "9px 8px",
  textAlign: "left",
  whiteSpace: "nowrap",
  fontSize: "11px",
  fontWeight: 700,
};

/* =========================================================
   TABLE DATA STYLE
========================================================= */

const tdStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "8px",
  whiteSpace: "nowrap",
  fontSize: "11px",
};

/* =========================================================
   TABLE CENTER STYLE
========================================================= */

const tdCenterStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};