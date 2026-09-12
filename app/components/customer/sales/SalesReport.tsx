"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { loadSales } from "./SalesStorage";
import { Sales } from "./SalesTypes";

export default function SalesReport() {
  const [sales, setSales] = useState<Sales[]>([]);
  const [search, setSearch] = useState("");

  // =====================================================
  // LOAD SALES
  // =====================================================

  useEffect(() => {
    setSales(loadSales());
  }, []);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredSales = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    const orderedSales =
      [...sales].reverse();

    if (!keyword) {
      return orderedSales;
    }

    return orderedSales.filter(
      (sale) => {
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
      }
    );
  }, [sales, search]);

  // =====================================================
  // TOTALS
  // =====================================================

  const totalSales =
    filteredSales.reduce(
      (total, sale) =>
        total +
        Number(
          sale.grandTotal || 0
        ),
      0
    );

  const totalTaxable =
    filteredSales.reduce(
      (total, sale) =>
        total +
        Number(
          sale.taxableAmount || 0
        ),
      0
    );

  const totalGST =
    filteredSales.reduce(
      (total, sale) =>
        total +
        Number(
          sale.gstAmount || 0
        ),
      0
    );

  const totalQuantity =
    filteredSales.reduce(
      (total, sale) => {

        if (
          !Array.isArray(
            sale.items
          )
        ) {
          return total;
        }

        return (
          total +
          sale.items.reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.qty || 0
              ),
            0
          )
        );
      },
      0
    );

  // =====================================================
  // PRINT
  // =====================================================

  const handlePrint = () => {
    window.print();
  };

  // =====================================================
  // REPORT DATE
  // =====================================================

  const reportDate =
    new Date().toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <>
      {/* =================================================
          PRINT CSS
      ================================================= */}

      <style>
        {`
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          .sales-print-header,
          .sales-print-footer {
            display: none;
          }

          @media print {

            /*
             * Hide the normal ERP screen.
             */

            body * {
              visibility: hidden !important;
            }

            /*
             * Show only the report.
             */

            .sales-report-print-area,
            .sales-report-print-area * {
              visibility: visible !important;
            }

            /*
             * Main print area.
             */

            .sales-report-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;

              width: 100% !important;
              max-width: 100% !important;

              margin: 0 !important;
              padding: 0 !important;

              border: none !important;
              border-radius: 0 !important;

              box-shadow: none !important;

              background: #ffffff !important;

              overflow: visible !important;

              height: auto !important;
              max-height: none !important;
            }

            /*
             * Hide screen-only controls.
             */

            .sales-report-no-print {
              display: none !important;
            }

            /*
             * Show professional print header.
             */

            .sales-print-header {
              display: block !important;

              width: 100% !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            /*
             * Print footer.
             */

            .sales-print-footer {
              display: block !important;

              width: 100% !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            /*
             * IMPORTANT:
             *
             * Screen table has a fixed-height scroll area.
             * Remove that restriction completely while printing.
             */

            .sales-report-table-wrapper {
              display: block !important;

              width: 100% !important;
              max-width: 100% !important;

              height: auto !important;
              max-height: none !important;

              min-height: 0 !important;

              overflow: visible !important;
              overflow-x: visible !important;
              overflow-y: visible !important;

              border: none !important;
              border-radius: 0 !important;

              box-sizing: border-box !important;

              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            /*
             * Full report table.
             */

            .sales-report-table {
              display: table !important;

              width: 100% !important;
              max-width: 100% !important;

              min-width: 0 !important;

              table-layout: fixed !important;

              border-collapse: collapse !important;

              margin: 0 !important;

              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            /*
             * Repeat table header on every printed page.
             */

            .sales-report-table thead {
              display: table-header-group !important;
            }

            /*
             * Keep individual transaction rows together.
             */

            .sales-report-table tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            /*
             * Allow table body to continue naturally
             * across multiple A4 pages.
             */

            .sales-report-table tbody {
              display: table-row-group !important;
            }

            /*
             * Compact print columns.
             */

            .sales-report-table th {
              font-size: 8px !important;
              padding: 4px 3px !important;

              line-height: 10px !important;

              white-space: normal !important;
              word-break: break-word !important;

              overflow: visible !important;
              text-overflow: clip !important;
            }

            .sales-report-table td {
              font-size: 8px !important;
              padding: 4px 3px !important;

              line-height: 10px !important;

              overflow: visible !important;
              text-overflow: clip !important;
            }

            /*
             * Summary cards stay compact.
             */

            .sales-report-summary {
              display: grid !important;

              grid-template-columns:
                repeat(4, 1fr) !important;

              gap: 5px !important;

              width: 100% !important;

              margin-bottom: 8px !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .sales-report-summary-card {
              padding: 6px !important;

              min-height: 35px !important;

              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .sales-report-summary-title {
              font-size: 8px !important;
              margin-bottom: 3px !important;
            }

            .sales-report-summary-value {
              font-size: 11px !important;
            }

            /*
             * Make sure header/footer are visible.
             */

            .sales-print-header,
            .sales-print-header * {
              visibility: visible !important;
            }

            .sales-print-footer,
            .sales-print-footer * {
              visibility: visible !important;
            }

            /*
             * Avoid accidental horizontal clipping.
             */

            html,
            body {
              width: 100% !important;
              height: auto !important;

              overflow: visible !important;

              margin: 0 !important;
              padding: 0 !important;

              background: #ffffff !important;
            }
          }
        `}
      </style>

      {/* =================================================
          REPORT AREA
      ================================================= */}

      <div
        className="sales-report-print-area"
        style={containerStyle}
      >

        {/* =================================================
            PROFESSIONAL PRINT HEADER
        ================================================= */}

        <div className="sales-print-header">

          <div
            style={{
              textAlign: "center",
              borderBottom:
                "2px solid #14532d",
              paddingBottom: "7px",
              marginBottom: "8px",
            }}
          >

            <div
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#14532d",
                letterSpacing: "0.5px",
              }}
            >
              UK EXIM ENTERPRISES
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                color: "#111827",
                marginTop: "2px",
              }}
            >
              SALES REPORT
            </div>

            <div
              style={{
                fontSize: "9px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              Sales Register / Summary
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginTop: "5px",
                fontSize: "8px",
                color: "#4b5563",
              }}
            >
              <span>
                Report Date:{" "}
                {reportDate}
              </span>

              <span>
                Sales Records:{" "}
                {filteredSales.length}
              </span>
            </div>

          </div>

        </div>

        {/* =================================================
            SCREEN HEADER
        ================================================= */}

        <div
          className="sales-report-no-print"
          style={headerStyle}
        >

          <div
            style={{
              ...titleGroupStyle,
              minWidth: 0,
              flex: "1 1 220px",
            }}
          >

            <h2 style={titleStyle}>
              📊 Sales Report
            </h2>

            <div style={subtitleStyle}>
              Sales Records:{" "}
              <strong>
                {filteredSales.length}
              </strong>
            </div>

          </div>

          {/* SEARCH + PRINT */}

          <div
            style={{
              ...headerActionsStyle,
              minWidth: 0,
              flex: "0 1 auto",
            }}
          >

            <input
              className="sales-report-no-print"
              type="text"
              placeholder="🔍 Search Sales / Customer / Product"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              style={searchStyle}
            />

            <button
              className="sales-report-no-print"
              type="button"
              onClick={handlePrint}
              style={printButtonStyle}
            >
              🖨️ Print Report
            </button>

          </div>

        </div>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div
          className="sales-report-summary"
          style={summaryGridStyle}
        >

          {/* TOTAL QUANTITY */}

          <div
            className="sales-report-summary-card"
            style={summaryCard}
          >

            <div
              className="sales-report-summary-title"
              style={summaryTitle}
            >
              📦 Total Quantity
            </div>

            <div
              className="sales-report-summary-value"
              style={summaryValue}
            >
              {totalQuantity}
            </div>

          </div>

          {/* TAXABLE */}

          <div
            className="sales-report-summary-card"
            style={summaryCard}
          >

            <div
              className="sales-report-summary-title"
              style={summaryTitle}
            >
              💰 Taxable Amount
            </div>

            <div
              className="sales-report-summary-value"
              style={summaryValue}
            >
              ₹{" "}
              {totalTaxable.toFixed(2)}
            </div>

          </div>

          {/* GST */}

          <div
            className="sales-report-summary-card"
            style={summaryCard}
          >

            <div
              className="sales-report-summary-title"
              style={summaryTitle}
            >
              🧾 Total GST
            </div>

            <div
              className="sales-report-summary-value"
              style={summaryValue}
            >
              ₹{" "}
              {totalGST.toFixed(2)}
            </div>

          </div>

          {/* TOTAL SALES */}

          <div
            className="sales-report-summary-card"
            style={{
              ...summaryCard,
              background:
                "#f0fdf4",
              border:
                "1px solid #bbf7d0",
            }}
          >

            <div
              className="sales-report-summary-title"
              style={summaryTitle}
            >
              📈 Total Sales
            </div>

            <div
              className="sales-report-summary-value"
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

        {/* =================================================
            REPORT TABLE
        ================================================= */}

        <div
          className="sales-report-table-wrapper"
          style={tableWrapperStyle}
        >

          <table
            className="sales-report-table"
            style={tableStyle}
          >

            <colgroup>
              <col
                style={{
                  width: "4%",
                }}
              />

              <col
                style={{
                  width: "8%",
                }}
              />

              <col
                style={{
                  width: "8%",
                }}
              />

              <col
                style={{
                  width: "8%",
                }}
              />

              <col
                style={{
                  width: "13%",
                }}
              />

              <col
                style={{
                  width: "13%",
                }}
              />

              <col
                style={{
                  width: "7%",
                }}
              />

              <col
                style={{
                  width: "6%",
                }}
              />

              <col
                style={{
                  width: "6%",
                }}
              />

              <col
                style={{
                  width: "7%",
                }}
              />

              <col
                style={{
                  width: "5%",
                }}
              />

              <col
                style={{
                  width: "8%",
                }}
              />

              <col
                style={{
                  width: "7%",
                }}
              />

              <col
                style={{
                  width: "8%",
                }}
              />
            </colgroup>

            <thead>

              <tr
                style={{
                  background:
                    "#14532d",
                  color:
                    "#ffffff",
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
                      padding:
                        "35px",
                      textAlign:
                        "center",
                      color:
                        "#6b7280",
                      fontWeight:
                        600,
                    }}
                  >
                    📦 No Sales Records
                    Found
                  </td>

                </tr>

              ) : (

                filteredSales.map(
                  (
                    sale,
                    saleIndex
                  ) => {

                    const items =
                      Array.isArray(
                        sale.items
                      )
                        ? sale.items
                        : [];

                    // =========================================
                    // OLD / EMPTY SALES RECORD
                    // =========================================

                    if (
                      items.length ===
                      0
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
                            {
                              sale.salesNo
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              sale.salesDate
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              sale.invoiceNo ||
                              "-"
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              sale.customerName ||
                              "-"
                            }
                          </td>

                          <td
                            colSpan={8}
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                              color:
                                "#dc2626",
                              whiteSpace:
                                "normal",
                              wordBreak:
                                "break-word",
                            }}
                          >
                            No Product Data
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                              fontWeight:
                                700,
                            }}
                          >
                            ₹{" "}
                            {Number(
                              sale.grandTotal ||
                                0
                            ).toFixed(
                              2
                            )}
                          </td>

                        </tr>
                      );
                    }

                    // =========================================
                    // MULTI PRODUCT SALES
                    // =========================================

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
                                whiteSpace:
                                  "normal",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {itemIndex ===
                              0
                                ? sale.customerName
                                : ""}
                            </td>

                            {/* PRODUCT */}

                            <td
                              style={{
                                ...tdStyle,
                                whiteSpace:
                                  "normal",
                                wordBreak:
                                  "break-word",
                              }}
                              title={
                                item.productName ||
                                ""
                              }
                            >
                              {
                                item.productName ||
                                "-"
                              }
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
                              ).toFixed(
                                2
                              )}
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
                              ).toFixed(
                                2
                              )}
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
                              ).toFixed(
                                2
                              )}
                            </td>

                            {/* GRAND TOTAL */}

                            <td
                              style={{
                                ...tdStyle,
                                textAlign:
                                  "right",
                                fontWeight:
                                  700,
                                color:
                                  "#14532d",
                              }}
                            >
                              {isLastItem
                                ? `₹${Number(
                                    sale.grandTotal ||
                                      0
                                  ).toFixed(
                                    2
                                  )}`
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

        {/* =================================================
            PROFESSIONAL PRINT FOOTER
        ================================================= */}

        <div className="sales-print-footer">

          <div
            style={{
              borderTop:
                "1px solid #d1d5db",
              marginTop: "8px",
              paddingTop: "6px",
              fontSize: "8px",
              color: "#6b7280",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "10px",
              }}
            >

              <span>
                Prepared by:
                {" "}
                <strong>
                  UK EXIM ENTERPRISES
                </strong>
              </span>

              <span>
                Total Sales:
                {" "}
                <strong
                  style={{
                    color:
                      "#14532d",
                  }}
                >
                  ₹
                  {totalSales.toFixed(
                    2
                  )}
                </strong>
              </span>

            </div>

            <div
              style={{
                textAlign:
                  "center",
                marginTop:
                  "5px",
              }}
            >
              Designed & Developed by
              {" "}
              <strong>
                Uttam Bhosale
              </strong>
              {" | "}
              AI Development Assistant –
              {" "}
              <strong>
                ChatGPT
              </strong>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}

// =====================================================
// CONTAINER STYLE
// =====================================================

const containerStyle: CSSProperties = {
  background: "#ffffff",
  padding: "20px",
  borderRadius: "10px",
  border:
    "1px solid #d1d5db",
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.08)",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
};

// =====================================================
// HEADER STYLE
// =====================================================

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "18px",
  flexWrap: "wrap",
  width: "100%",
  minWidth: 0,
};

// =====================================================
// TITLE GROUP
// =====================================================

const titleGroupStyle: CSSProperties = {
  minWidth: 0,
};

// =====================================================
// TITLE
// =====================================================

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#14532d",
  fontSize: "20px",
  fontWeight: 700,
};

// =====================================================
// SUBTITLE
// =====================================================

const subtitleStyle: CSSProperties = {
  marginTop: "5px",
  color: "#6b7280",
  fontSize: "12px",
};

// =====================================================
// HEADER ACTIONS
// =====================================================

const headerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

// =====================================================
// SEARCH
// =====================================================

const searchStyle: CSSProperties = {
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
};

// =====================================================
// PRINT BUTTON
// =====================================================

const printButtonStyle: CSSProperties = {
  height: "40px",
  padding: "0 16px",
  background: "#14532d",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

// =====================================================
// SUMMARY GRID
// =====================================================

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "20px",
  width: "100%",
  minWidth: 0,
};

// =====================================================
// SUMMARY CARD
// =====================================================

const summaryCard: CSSProperties = {
  padding: "14px",
  borderRadius: "8px",
  background: "#f8fafc",
  border:
    "1px solid #e2e8f0",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
};

// =====================================================
// SUMMARY TITLE
// =====================================================

const summaryTitle: CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "6px",
  fontWeight: 600,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

// =====================================================
// SUMMARY VALUE
// =====================================================

const summaryValue: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#1e293b",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

// =====================================================
// TABLE WRAPPER
// =====================================================

const tableWrapperStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
  overflowY: "auto",
  maxHeight: "65vh",
  border:
    "1px solid #dbe3ea",
  borderRadius: "7px",
  boxSizing: "border-box",
};

// =====================================================
// TABLE
// =====================================================

const tableStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  borderCollapse:
    "collapse",
  fontSize: "11px",
  tableLayout: "fixed",
  boxSizing: "border-box",
};

// =====================================================
// TABLE HEADER
// =====================================================

const thStyle: CSSProperties = {
  padding: "8px 4px",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 700,
  borderRight:
    "1px solid rgba(255,255,255,0.2)",
  borderBottom:
    "2px solid #0f3d24",
  whiteSpace:
    "normal",
  overflow:
    "hidden",
  textOverflow:
    "ellipsis",
  wordBreak:
    "break-word",
  lineHeight:
    "12px",
  boxSizing:
    "border-box",
};

// =====================================================
// TABLE DATA
// =====================================================

const tdStyle: CSSProperties = {
  padding: "7px 4px",
  borderRight:
    "1px solid #e5e7eb",
  borderBottom:
    "1px solid #e5e7eb",
  fontSize: "10px",
  color: "#374151",
  verticalAlign:
    "middle",
  whiteSpace:
    "nowrap",
  overflow:
    "hidden",
  textOverflow:
    "ellipsis",
  wordBreak:
    "break-word",
  boxSizing:
    "border-box",
};