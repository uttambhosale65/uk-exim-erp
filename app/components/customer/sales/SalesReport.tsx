"use client";

import { useEffect, useMemo, useState } from "react";

import { loadSales } from "./SalesStorage";
import { Sales } from "./SalesTypes";

export default function SalesReport() {
  const [sales, setSales] = useState<Sales[]>([]);
  const [search, setSearch] = useState("");

  // ==============================
  // LOAD SALES
  // ==============================

  useEffect(() => {
    setSales(loadSales());
  }, []);

  // ==============================
  // FILTER
  // ==============================

  const filteredSales = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return sales;
    }

    return sales.filter((sale) => {
      const salesNoMatch =
        sale.salesNo
          ?.toLowerCase()
          .includes(keyword);

      const invoiceMatch =
        sale.invoiceNo
          ?.toLowerCase()
          .includes(keyword);

      const customerMatch =
        sale.customerName
          ?.toLowerCase()
          .includes(keyword) ||
        sale.customerCode
          ?.toLowerCase()
          .includes(keyword);

      const dateMatch =
        sale.salesDate
          ?.toLowerCase()
          .includes(keyword);

      const productMatch =
        Array.isArray(sale.items) &&
        sale.items.some(
          (item) =>
            item.productName
              ?.toLowerCase()
              .includes(keyword) ||
            item.productCode
              ?.toLowerCase()
              .includes(keyword) ||
            item.hsn
              ?.toLowerCase()
              .includes(keyword)
        );

      return (
        salesNoMatch ||
        invoiceMatch ||
        customerMatch ||
        dateMatch ||
        productMatch
      );
    });
  }, [sales, search]);

  // ==============================
  // TOTALS
  // ==============================

  const totalSales = filteredSales.reduce(
    (total, sale) =>
      total +
      Number(sale.grandTotal || 0),
    0
  );

  const totalTaxable = filteredSales.reduce(
    (total, sale) =>
      total +
      Number(sale.taxableAmount || 0),
    0
  );

  const totalGST = filteredSales.reduce(
    (total, sale) =>
      total +
      Number(sale.gstAmount || 0),
    0
  );

  const totalQuantity = filteredSales.reduce(
    (total, sale) => {
      if (!Array.isArray(sale.items)) {
        return total;
      }

      return (
        total +
        sale.items.reduce(
          (sum, item) =>
            sum + Number(item.qty || 0),
          0
        )
      );
    },
    0
  );

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "20px",
        borderRadius: "10px",
        border: "1px solid #d1d5db",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* ==============================
          HEADER
      ============================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#14532d",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            📊 Sales Report
          </h2>

          <div
            style={{
              marginTop: "5px",
              color: "#6b7280",
              fontSize: "12px",
            }}
          >
            Sales Records:{" "}
            <strong>
              {filteredSales.length}
            </strong>
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Sales / Customer / Product"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "350px",
            maxWidth: "100%",
            height: "40px",
            padding: "0 12px",
            border:
              "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* ==============================
          SUMMARY
      ============================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(150px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {/* TOTAL QTY */}

        <div style={summaryCard}>
          <div style={summaryTitle}>
            📦 Total Quantity
          </div>

          <div style={summaryValue}>
            {totalQuantity}
          </div>
        </div>

        {/* TAXABLE */}

        <div style={summaryCard}>
          <div style={summaryTitle}>
            💰 Taxable Amount
          </div>

          <div style={summaryValue}>
            ₹{" "}
            {totalTaxable.toFixed(2)}
          </div>
        </div>

        {/* GST */}

        <div style={summaryCard}>
          <div style={summaryTitle}>
            🧾 Total GST
          </div>

          <div style={summaryValue}>
            ₹{" "}
            {totalGST.toFixed(2)}
          </div>
        </div>

        {/* GRAND TOTAL */}

        <div
          style={{
            ...summaryCard,
            background: "#f0fdf4",
            border:
              "1px solid #bbf7d0",
          }}
        >
          <div style={summaryTitle}>
            📈 Total Sales
          </div>

          <div
            style={{
              ...summaryValue,
              color: "#166534",
            }}
          >
            ₹{" "}
            {totalSales.toFixed(2)}
          </div>
        </div>
      </div>

      {/* ==============================
          REPORT TABLE
      ============================== */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          border:
            "1px solid #dbe3ea",
          borderRadius: "7px",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: 0,
            borderCollapse:
              "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#14532d",
                color: "#ffffff",
              }}
            >
              <th style={thStyle}>
                #
              </th>

              <th style={thStyle}>
                Sales No
              </th>

              <th style={thStyle}>
                Date
              </th>

              <th style={thStyle}>
                Invoice
              </th>

              <th style={thStyle}>
                Customer
              </th>

              <th style={thStyle}>
                Product
              </th>

              <th style={thStyle}>
                HSN
              </th>

              <th style={thStyle}>
                Qty
              </th>

              <th style={thStyle}>
                Unit
              </th>

              <th style={thStyle}>
                Rate
              </th>

              <th style={thStyle}>
                GST
              </th>

              <th style={thStyle}>
                Amount
              </th>

              <th style={thStyle}>
                GST Amount
              </th>

              <th style={thStyle}>
                Grand Total
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSales.length ===
            0 ? (
              <tr>
                <td
                  colSpan={14}
                  style={{
                    padding: "35px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontWeight: 600,
                  }}
                >
                  📦 No Sales Records Found
                </td>
              </tr>
            ) : (
              filteredSales.map(
                (sale, saleIndex) => {
                  const items =
                    Array.isArray(
                      sale.items
                    )
                      ? sale.items
                      : [];

                  // ==========================
                  // OLD / EMPTY SALES RECORD
                  // ==========================

                  if (
                    items.length === 0
                  ) {
                    return (
                      <tr
                        key={sale.id}
                        style={{
                          background:
                            saleIndex %
                              2 ===
                            0
                              ? "#ffffff"
                              : "#f8fafc",
                        }}
                      >
                        <td
                          style={
                            tdStyle
                          }
                        >
                          {saleIndex +
                            1}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {sale.salesNo}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {sale.salesDate}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {sale.invoiceNo ||
                            "-"}
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {sale.customerName ||
                            "-"}
                        </td>

                        <td
                          colSpan={7}
                          style={{
                            ...tdStyle,
                            textAlign:
                              "center",
                            color:
                              "#dc2626",
                          }}
                        >
                          No Product Data
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                            fontWeight: 700,
                          }}
                        >
                          ₹{" "}
                          {Number(
                            sale.grandTotal ||
                              0
                          ).toFixed(2)}
                        </td>
                      </tr>
                    );
                  }

                  // ==========================
                  // MULTI PRODUCT SALES
                  // ==========================

                  return items.map(
                    (
                      item,
                      itemIndex
                    ) => {
                      const isLastItem =
                        itemIndex ===
                        items.length -
                          1;

                      return (
                        <tr
                          key={`${sale.id}-${item.productCode}-${itemIndex}`}
                          style={{
                            background:
                              saleIndex %
                                2 ===
                              0
                                ? "#ffffff"
                                : "#f8fafc",
                          }}
                        >
                          {/* # */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {itemIndex ===
                            0
                              ? saleIndex +
                                1
                              : ""}
                          </td>

                          {/* SALES NO */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {itemIndex ===
                            0
                              ? sale.salesNo
                              : ""}
                          </td>

                          {/* DATE */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {itemIndex ===
                            0
                              ? sale.salesDate
                              : ""}
                          </td>

                          {/* INVOICE */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {itemIndex ===
                            0
                              ? sale.invoiceNo
                              : ""}
                          </td>

                          {/* CUSTOMER */}

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                itemIndex ===
                                0
                                  ? 600
                                  : 400,
                            }}
                          >
                            {itemIndex ===
                            0
                              ? sale.customerName
                              : ""}
                          </td>

                          {/* PRODUCT */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {item.productName ||
                              "-"}
                          </td>

                          {/* HSN */}

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {item.hsn ||
                              "-"}
                          </td>

                          {/* QTY */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                            }}
                          >
                            {Number(
                              item.qty ||
                                0
                            )}
                          </td>

                          {/* UNIT */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                            }}
                          >
                            {item.unit ||
                              "-"}
                          </td>

                          {/* RATE */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                            }}
                          >
                            ₹{" "}
                            {Number(
                              item.rate ||
                                0
                            ).toFixed(2)}
                          </td>

                          {/* GST */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                            }}
                          >
                            {Number(
                              item.gst ||
                                0
                            )}
                            %
                          </td>

                          {/* AMOUNT */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                            }}
                          >
                            ₹{" "}
                            {Number(
                              item.amount ||
                                0
                            ).toFixed(2)}
                          </td>

                          {/* GST AMOUNT */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                            }}
                          >
                            ₹{" "}
                            {Number(
                              item.gstAmount ||
                                0
                            ).toFixed(2)}
                          </td>

                          {/* GRAND TOTAL */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                              fontWeight: 700,
                              color:
                                "#14532d",
                            }}
                          >
                            {isLastItem
                              ? `₹${Number(
                                  sale.grandTotal ||
                                    0
                                ).toFixed(2)}`
                              : ""}
                          </td>
                        </tr>
                      );
                    }
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

// ========================================
// TABLE HEADER STYLE
// ========================================

const thStyle: React.CSSProperties =
  {
    padding: "10px 8px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    borderRight:
      "1px solid rgba(255,255,255,0.2)",
    borderBottom:
      "2px solid #0f3d24",
  };

// ========================================
// TABLE DATA STYLE
// ========================================

const tdStyle: React.CSSProperties =
  {
    padding: "9px 8px",
    borderRight:
      "1px solid #e5e7eb",
    borderBottom:
      "1px solid #e5e7eb",
    fontSize: "11px",
    color: "#374151",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

// ========================================
// SUMMARY CARD
// ========================================

const th: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
  whiteSpace: "nowrap",
};
const summaryCard: React.CSSProperties = {
  padding: "14px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const summaryTitle: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
  fontWeight: 600,
};

const summaryValue: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#1e293b",
};