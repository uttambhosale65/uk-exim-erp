"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { Purchase } from "./PurchaseTypes";
import { loadPurchases } from "./PurchaseStorage";

export default function PurchaseReport() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setPurchases(loadPurchases());
  }, []);

  const filteredPurchases = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return purchases;

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
        purchase.items?.some(
          (item) =>
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

      return documentMatch || itemMatch;
    });
  }, [purchases, search]);

  const totalGRN = filteredPurchases.length;

  const totalQuantity = filteredPurchases.reduce(
    (total, purchase) =>
      total + Number(purchase.totalQty ?? 0),
    0
  );

  const totalAmount = filteredPurchases.reduce(
    (total, purchase) =>
      total + Number(purchase.totalAmount ?? 0),
    0
  );

  const totalGST = filteredPurchases.reduce(
    (total, purchase) =>
      total + Number(purchase.totalGstAmount ?? 0),
    0
  );

  const totalNetAmount = filteredPurchases.reduce(
    (total, purchase) =>
      total + Number(purchase.totalNetAmount ?? 0),
    0
  );

  return (
    <>
      <style>{printStyles}</style>

      <div
        className="purchase-report-print"
        style={containerStyle}
      >
        {/* =================================================
            PRINT HEADER
        ================================================= */}

        <div className="purchase-print-header">
          <div className="companyName">
            UK EXIM ENTERPRISES
          </div>

          <div className="reportTitle">
            PURCHASE REPORT
          </div>

          <div className="reportSubtitle">
            GRN-wise Purchase Details
          </div>
        </div>

        {/* =================================================
            SCREEN HEADER
        ================================================= */}

        <div
          className="purchase-screen-header"
          style={headerStyle}
        >
          <div style={titleGroupStyle}>
            <h2 style={titleStyle}>
              📊 Purchase Register
            </h2>

            <div style={subtitleStyle}>
              GRN-wise Purchase Details
            </div>
          </div>

          <input
            type="text"
            placeholder="🔍 Search GRN / Supplier / Product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchStyle}
          />

          <button
            type="button"
            onClick={() => window.print()}
            style={printButtonStyle}
          >
            🖨️ Print Report
          </button>
        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div
          className="purchase-summary"
          style={summaryGridStyle}
        >
          <SummaryCard
            title="Total GRN"
            value={String(totalGRN)}
          />

          <SummaryCard
            title="Total Quantity"
            value={totalQuantity.toFixed(2)}
          />

          <SummaryCard
            title="Total Amount"
            value={`₹${totalAmount.toFixed(2)}`}
          />

          <SummaryCard
            title="Total GST"
            value={`₹${totalGST.toFixed(2)}`}
          />

          <SummaryCard
            title="Net Purchase"
            value={`₹${totalNetAmount.toFixed(2)}`}
            green
          />
        </div>

        {/* =================================================
            PURCHASE TABLE
        ================================================= */}

        <div
          className="purchase-table-wrapper"
          style={tableWrapperStyle}
        >
          <table style={tableStyle}>
            <thead>
              <tr
                style={{
                  background: "#14532d",
                  color: "#ffffff",
                }}
              >
                <th style={{ ...thStyle, width: "3%" }}>
                  #
                </th>

                <th style={{ ...thStyle, width: "7%" }}>
                  GRN No
                </th>

                <th style={{ ...thStyle, width: "7%" }}>
                  Date
                </th>

                <th style={{ ...thStyle, width: "8%" }}>
                  Invoice
                </th>

                <th style={{ ...thStyle, width: "12%" }}>
                  Supplier
                </th>

                <th style={{ ...thStyle, width: "15%" }}>
                  Product
                </th>

                <th style={{ ...thStyle, width: "6%" }}>
                  HSN
                </th>

                <th style={{ ...thStyle, width: "5%" }}>
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

            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      padding: "30px",
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    📋 No Purchase Records Found
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(
                  (purchase, purchaseIndex) => (
                    <PurchaseRows
                      key={purchase.id}
                      purchase={purchase}
                      purchaseIndex={purchaseIndex}
                    />
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        {filteredPurchases.length > 0 && (
          <div
            className="purchase-report-footer"
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
                onClick={() => setSearch("")}
                style={clearButtonStyle}
              >
                ✖ Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  green = false,
}: {
  title: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div
      style={{
        ...summaryCardStyle,
        background: green
          ? "#f0fdf4"
          : "#f8fafc",
        borderColor: green
          ? "#bbf7d0"
          : "#d1d5db",
      }}
    >
      <div style={summaryLabelStyle}>
        {title}
      </div>

      <div
        style={{
          ...summaryValueStyle,
          color: green
            ? "#14532d"
            : "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   PURCHASE ROWS
========================================================= */

function PurchaseRows({
  purchase,
  purchaseIndex,
}: {
  purchase: Purchase;
  purchaseIndex: number;
}) {
  const items = purchase.items ?? [];

  /* =======================================================
     EMPTY ITEM PROTECTION
  ======================================================= */

  if (items.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {items.map((item, itemIndex) => (
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

          <td style={tdCenterStyle}>
            {itemIndex === 0
              ? purchaseIndex + 1
              : ""}
          </td>

          {/* GRN */}

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
            {Number(item.qty ?? 0).toFixed(2)}
          </td>

          {/* RATE */}

          <td
            style={{
              ...tdStyle,
              textAlign: "right",
            }}
          >
            ₹{Number(item.rate ?? 0).toFixed(2)}
          </td>

          {/* AMOUNT */}

          <td
            style={{
              ...tdStyle,
              textAlign: "right",
            }}
          >
            ₹{Number(item.amount ?? 0).toFixed(2)}
          </td>

          {/* GST */}

          <td
            style={{
              ...tdStyle,
              textAlign: "center",
            }}
          >
            {Number(item.gst ?? 0).toFixed(2)}%
          </td>

          {/* GST AMOUNT */}

          <td
            style={{
              ...tdStyle,
              textAlign: "right",
            }}
          >
            ₹{Number(item.gstAmount ?? 0).toFixed(2)}
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
            ₹{Number(item.netAmount ?? 0).toFixed(2)}
          </td>
        </tr>
      ))}

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
   PRINT CSS
========================================================= */

const printStyles = `
  .purchase-print-header {
    display: none;
  }

  @media print {

    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
    }

    body * {
      visibility: hidden !important;
    }

    .purchase-report-print,
    .purchase-report-print * {
      visibility: visible !important;
    }

    .purchase-report-print {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
    }

    .purchase-screen-header {
      display: none !important;
    }

    .purchase-print-header {
      display: block !important;
      text-align: center !important;
      margin-bottom: 7px !important;
      padding-bottom: 5px !important;
      border-bottom: 2px solid #14532d !important;
    }

    .companyName {
      font-size: 17px !important;
      font-weight: 800 !important;
      color: #111827 !important;
      letter-spacing: 0.5px !important;
    }

    .reportTitle {
      margin-top: 2px !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      color: #14532d !important;
      letter-spacing: 0.5px !important;
    }

    .reportSubtitle {
      margin-top: 2px !important;
      font-size: 8px !important;
      color: #6b7280 !important;
    }

    .purchase-summary {
      margin-bottom: 7px !important;
    }

    .purchase-summary > div {
      min-height: 42px !important;
      padding: 5px 7px !important;
      border-radius: 3px !important;
    }

    .purchase-summary div {
      font-size: 8px !important;
    }

    .purchase-summary div div {
      font-size: 8px !important;
    }

    .purchase-table-wrapper {
      overflow: visible !important;
      border: 1px solid #9ca3af !important;
      border-radius: 0 !important;
    }

    .purchase-report-print table {
      width: 100% !important;
      min-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 7px !important;
    }

    .purchase-report-print th {
      padding: 4px 3px !important;
      font-size: 7px !important;
      line-height: 1.1 !important;
    }

    .purchase-report-print td {
      padding: 3px !important;
      font-size: 7px !important;
      line-height: 1.15 !important;
    }

    .purchase-report-print tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .purchase-report-print thead {
      display: table-header-group !important;
    }

    .purchase-report-footer {
      margin-top: 6px !important;
      padding: 4px 6px !important;
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 0 !important;
      font-size: 7px !important;
    }
  }
`;

/* =========================================================
   CONTAINER
========================================================= */

const containerStyle: CSSProperties = {
  background: "#ffffff",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  width: "100%",
  boxSizing: "border-box",
  overflow: "hidden",
};

/* =========================================================
   HEADER
========================================================= */

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
  width: "100%",
  flexWrap: "wrap",
};

const titleGroupStyle: CSSProperties = {
  minWidth: 0,
  flex: "1 1 auto",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#14532d",
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1.2,
};

const subtitleStyle: CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontSize: "11px",
};

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

const printButtonStyle: CSSProperties = {
  height: "34px",
  padding: "0 14px",
  background: "#14532d",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

/* =========================================================
   SUMMARY
========================================================= */

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "12px",
  width: "100%",
};

const summaryCardStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  padding: "8px 10px",
  minHeight: "58px",
  boxSizing: "border-box",
  minWidth: 0,
};

const summaryLabelStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "10px",
  fontWeight: 600,
  marginBottom: "5px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const summaryValueStyle: CSSProperties = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* =========================================================
   TABLE
========================================================= */

const tableWrapperStyle: CSSProperties = {
  width: "100%",
  overflowX: "hidden",
  overflowY: "visible",
  border: "1px solid #d1d5db",
  borderRadius: "7px",
  boxSizing: "border-box",
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  fontSize: "10px",
};

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

const tdCenterStyle: CSSProperties = {
  ...tdStyle,
  textAlign: "center",
};

/* =========================================================
   FOOTER
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

const clearButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontSize: "10px",
  fontWeight: 700,
  cursor: "pointer",
  padding: "2px 4px",
};