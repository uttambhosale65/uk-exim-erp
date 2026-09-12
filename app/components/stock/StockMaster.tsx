"use client";

import { useEffect, useState } from "react";
import { loadProducts } from "../../product/components/ProductStorage";
import StockTable from "./StockTable";
import StockMonthlyPage from "./StockMonthlyPage";

import { Stock } from "./StockTypes";

import {
  loadStock,
  resetStock,
  setOpeningStockBulk,
} from "./StockStorage";

export default function StockMaster() {
  const [stock, setStock] = useState<Stock[]>([]);

  const [search, setSearch] = useState("");

  const [activeView, setActiveView] =
    useState<"current" | "monthly">("current");

  const [showOpeningEditor, setShowOpeningEditor] =
    useState(false);

  const [openingValues, setOpeningValues] =
    useState<Record<string, string>>({});

  /* =====================================================
     LOAD STOCK
  ===================================================== */

  useEffect(() => {
    setStock(loadStock());
  }, []);

  /* =====================================================
     RESET STOCK
  ===================================================== */

  const handleResetStock = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all stock?\n\n" +
        "This will clear the current stock records."
    );

    if (!confirmed) return;

    resetStock();

    setStock([]);
  };

  /* =====================================================
     OPENING STOCK EDITOR
  ===================================================== */

  const handleOpenOpeningEditor = () => {
    const currentStock = loadStock();

    const values: Record<string, string> = {};

    currentStock.forEach((item) => {
      values[item.productCode] = String(
        Number(item.openingStock || 0)
      );
    });

    setOpeningValues(values);
    setShowOpeningEditor(true);
  };

  /* =====================================================
     OPENING STOCK CHANGE
  ===================================================== */

  const handleOpeningChange = (
    productCode: string,
    value: string
  ) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    setOpeningValues((previous) => ({
      ...previous,
      [productCode]: value,
    }));
  };

  /* =====================================================
     SAVE OPENING STOCK
  ===================================================== */

  const handleSaveOpeningStock = () => {
    const updates: Record<string, number> = {};

    Object.entries(openingValues).forEach(
      ([productCode, value]) => {
        const qty =
          value.trim() === ""
            ? 0
            : Number(value);

        if (!Number.isFinite(qty) || qty < 0) {
          return;
        }

        updates[productCode] = qty;
      }
    );

    const confirmed = window.confirm(
      "Save Opening Stock?\n\n" +
        "This will update the Opening Stock values for the displayed stock items.\n\n" +
        "Purchase and Sales transactions will NOT be changed."
    );

    if (!confirmed) return;

    setOpeningStockBulk(updates);

    const refreshedStock = loadStock();

    setStock(refreshedStock);
    setShowOpeningEditor(false);

    window.alert(
      "Opening Stock saved successfully."
    );
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredStock = stock.filter(
    (item) =>
      item.productName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.productCode
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.hsn
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  /* =====================================================
     TOTAL CURRENT STOCK
  ===================================================== */

  const products = loadProducts();

  const totalStock = filteredStock.reduce(
    (total, item) => {
      const product = products.find(
        (p) => p.code === item.productCode
      );

      const qty = Number(
        item.currentStock || 0
      );

      if (
        product?.unit === "Pkt" &&
        Number(product.netWeight) > 0
      ) {
        return (
          total +
          (qty * Number(product.netWeight)) / 1000
        );
      }

      return total + qty;
    },
    0
  );

  /* =====================================================
     PRINT DATE
  ===================================================== */

  const printDate =
    new Date().toLocaleDateString("en-IN");

  /* =====================================================
     MONTHLY VIEW
  ===================================================== */

  if (activeView === "monthly") {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "10px",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {/* =================================================
            VIEW SWITCH
        ================================================== */}

        <div
          className="stock-view-switch"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setActiveView("current")
            }
            style={{
              height: "34px",
              padding: "0 14px",
              border:
                "1px solid #d1d5db",
              borderRadius: "6px",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            📦 Current Stock
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveView("monthly")
            }
            style={{
              height: "34px",
              padding: "0 14px",
              border: "none",
              borderRadius: "6px",
              background: "#14532d",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            📊 Monthly Stock
          </button>
        </div>

        <StockMonthlyPage />
      </div>
    );
  }

  /* =====================================================
     CURRENT STOCK VIEW
  ===================================================== */

  return (
    <>
      {/* =================================================
          PRINT STYLE
      ================================================== */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          .stock-print-area,
          .stock-print-area * {
            visibility: visible !important;
          }

          .stock-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .stock-no-print {
            display: none !important;
          }

          .stock-print-header {
            display: block !important;
          }

          .stock-print-summary {
            display: flex !important;
          }
        }

        @media screen {
          .stock-print-header {
            display: none;
          }

          .stock-print-summary {
            display: none;
          }
        }
      `}</style>

      {/* =================================================
          MAIN STOCK REPORT
      ================================================== */}

      <div
        className="stock-print-area"
        style={{
          background: "#ffffff",
          padding: "14px",
          borderRadius: "10px",
          border:
            "1px solid #d1d5db",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: "1600px",
          margin: "0 auto",
          boxSizing: "border-box",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* =================================================
            PROFESSIONAL PRINT HEADER
        ================================================== */}

        <div
          className="stock-print-header"
          style={{
            textAlign: "center",
            borderBottom:
              "2px solid #14532d",
            paddingBottom: "8px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#111827",
              letterSpacing: "0.5px",
            }}
          >
            UK EXIM ENTERPRISES
          </div>

          <div
            style={{
              marginTop: "3px",
              fontSize: "14px",
              fontWeight: 800,
              color: "#14532d",
              letterSpacing: "0.3px",
            }}
          >
            STOCK REPORT
          </div>

          <div
            style={{
              marginTop: "3px",
              fontSize: "9px",
              color: "#6b7280",
            }}
          >
            Product-wise Current Stock
            Details
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginTop: "6px",
              fontSize: "9px",
              color: "#374151",
            }}
          >
            <span>
              Report Date: {printDate}
            </span>

            <span>
              Total Products:{" "}
              {filteredStock.length}
            </span>
          </div>
        </div>

        {/* =================================================
            SCREEN HEADER
        ================================================== */}

        <div
          className="stock-no-print"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
            width: "100%",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#14532d",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              📦 Stock Report
            </h2>

            <div
              style={{
                marginTop: "4px",
                color: "#6b7280",
                fontSize: "11px",
              }}
            >
              Product-wise Current Stock
              Details
            </div>
          </div>

          {/* SEARCH */}

          <input
            type="text"
            placeholder="🔍 Search Product / Code / HSN..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              width: "300px",
              maxWidth: "100%",
              height: "34px",
              padding: "0 10px",
              border:
                "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
              flexShrink: 1,
            }}
          />
        </div>

        {/* =================================================
            OPENING STOCK ACTION
        ================================================== */}

        <div
          className="stock-no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={
              handleOpenOpeningEditor
            }
            style={{
              height: "34px",
              padding: "0 14px",
              border: "none",
              borderRadius: "6px",
              background: "#14532d",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "11px",
            }}
          >
            🔧 Set Opening Stock
          </button>
        </div>

        {/* =================================================
            STOCK VIEW BUTTONS
        ================================================== */}

        <div
          className="stock-no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setActiveView("current")
            }
            style={{
              height: "34px",
              padding: "0 14px",
              border: "none",
              borderRadius: "6px",
              background: "#14532d",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "11px",
            }}
          >
            📦 Current Stock
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveView("monthly")
            }
            style={{
              height: "34px",
              padding: "0 14px",
              border:
                "1px solid #14532d",
              borderRadius: "6px",
              background: "#ffffff",
              color: "#14532d",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "11px",
            }}
          >
            📊 Monthly Stock
          </button>
        </div>

        {/* =================================================
            SCREEN SUMMARY
        ================================================== */}

        <div
          className="stock-no-print"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) auto",
            gap: "8px",
            marginBottom: "12px",
            width: "100%",
            minWidth: 0,
          }}
        >
          {/* TOTAL CURRENT STOCK */}

          <div
            style={{
              background: "#f8fafc",
              border:
                "1px solid #d1d5db",
              borderRadius: "7px",
              padding: "9px 12px",
              minHeight: "58px",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "10px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              TOTAL CURRENT STOCK
            </div>

            <div
              style={{
                color: "#14532d",
                fontSize: "18px",
                fontWeight: 800,
              }}
            >
              {totalStock.toFixed(3)} KG
            </div>
          </div>

          {/* BUTTONS */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            {/* PRINT */}

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              style={{
                padding: "0 14px",
                background: "#14532d",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "11px",
                minHeight: "58px",
                whiteSpace: "nowrap",
              }}
            >
              🖨️ Print Report
            </button>

            {/* RESET */}

            <button
              type="button"
              onClick={
                handleResetStock
              }
              style={{
                padding: "0 14px",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "11px",
                minHeight: "58px",
                whiteSpace: "nowrap",
              }}
            >
              🗑️ Reset Stock
            </button>
          </div>
        </div>

        {/* =================================================
            PRINT SUMMARY
        ================================================== */}

        <div
          className="stock-print-summary"
          style={{
            display: "none",
            justifyContent:
              "space-between",
            alignItems: "center",
            background: "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            borderRadius: "5px",
            padding: "7px 10px",
            marginBottom: "10px",
            fontSize: "10px",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#374151",
            }}
          >
            TOTAL CURRENT STOCK
          </span>

          <span
            style={{
              fontWeight: 800,
              fontSize: "13px",
              color: "#14532d",
            }}
          >
            {totalStock.toFixed(3)} KG
          </span>
        </div>

        {/* =================================================
            STOCK TABLE
        ================================================== */}

        <StockTable
          stock={filteredStock}
        />

        {/* =================================================
            PRINT FOOTER
        ================================================== */}

        <div
          className="stock-print-header"
          style={{
            marginTop: "10px",
            paddingTop: "6px",
            borderTop:
              "1px solid #d1d5db",
            display: "flex",
            justifyContent:
              "space-between",
            fontSize: "8px",
            color: "#6b7280",
          }}
        >
          <span>
            UK EXIM ENTERPRISES
          </span>

          <span>
            Stock Report
          </span>

          <span>
            Generated by UK EXIM ERP
          </span>
        </div>
      </div>

      {/* =====================================================
          OPENING STOCK MODAL
      ===================================================== */}

      {showOpeningEditor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "820px",
              background: "#ffffff",
              borderRadius: "10px",
              boxShadow:
                "0 10px 35px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            {/* HEADER */}

            <div
              style={{
                padding:
                  "12px 16px",
                background: "#14532d",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                  }}
                >
                  Opening Stock Entry
                </div>

                <div
                  style={{
                    marginTop: "2px",
                    fontSize: "10px",
                    opacity: 0.9,
                  }}
                >
                  Enter the actual opening
                  stock quantity.
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowOpeningEditor(
                    false
                  )
                }
                style={{
                  width: "30px",
                  height: "30px",
                  border: "none",
                  borderRadius: "5px",
                  background:
                    "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            {/* BODY */}

            <div
              style={{
                padding: "14px 16px",
                maxHeight: "65vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    fontSize: "11px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#f3f4f6",
                      }}
                    >
                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "8px 10px",
                          borderBottom:
                            "1px solid #d1d5db",
                        }}
                      >
                        Product Code
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "8px 10px",
                          borderBottom:
                            "1px solid #d1d5db",
                        }}
                      >
                        Product Name
                      </th>

                      <th
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "8px 10px",
                          borderBottom:
                            "1px solid #d1d5db",
                        }}
                      >
                        Unit
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                          padding:
                            "8px 10px",
                          borderBottom:
                            "1px solid #d1d5db",
                        }}
                      >
                        Opening Stock
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stock.map(
                      (item) => {
                        const product =
                          products.find(
                            (p) =>
                              p.code ===
                              item.productCode
                          );

                        return (
                          <tr
                            key={
                              item.productCode
                            }
                          >
                            <td
                              style={{
                                padding:
                                  "7px 10px",
                                borderBottom:
                                  "1px solid #e5e7eb",
                                fontWeight: 700,
                              }}
                            >
                              {
                                item.productCode
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "7px 10px",
                                borderBottom:
                                  "1px solid #e5e7eb",
                              }}
                            >
                              {
                                item.productName
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "7px 10px",
                                borderBottom:
                                  "1px solid #e5e7eb",
                                textAlign:
                                  "center",
                              }}
                            >
                              {
                                product?.unit ||
                                item.unit
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "7px 10px",
                                borderBottom:
                                  "1px solid #e5e7eb",
                                textAlign:
                                  "right",
                              }}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  openingValues[
                                    item
                                      .productCode
                                  ] ??
                                  "0"
                                }
                                onChange={(
                                  e
                                ) =>
                                  handleOpeningChange(
                                    item.productCode,
                                    e.target
                                      .value
                                  )
                                }
                                style={{
                                  width:
                                    "130px",
                                  maxWidth:
                                    "100%",
                                  height:
                                    "30px",
                                  padding:
                                    "0 8px",
                                  border:
                                    "1px solid #cbd5e1",
                                  borderRadius:
                                    "5px",
                                  textAlign:
                                    "right",
                                  fontSize:
                                    "11px",
                                  boxSizing:
                                    "border-box",
                                  outline:
                                    "none",
                                }}
                              />
                            </td>
                          </tr>
                        );
                      }
                    )}

                    {stock.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding:
                              "20px",
                            textAlign:
                              "center",
                            color:
                              "#6b7280",
                          }}
                        >
                          No stock records
                          available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* IMPORTANT NOTE */}

              <div
                style={{
                  marginTop: "10px",
                  padding:
                    "9px 11px",
                  background:
                    "#fffbeb",
                  border:
                    "1px solid #fde68a",
                  borderRadius: "6px",
                  color: "#92400e",
                  fontSize: "10px",
                  lineHeight: 1.5,
                }}
              >
                <strong>
                  Accounting Note:
                </strong>{" "}
                Opening Stock is a starting
                stock balance. It does not
                create a Purchase transaction
                and it does not change existing
                Purchase or Sales entries.
              </div>
            </div>

            {/* FOOTER */}

            <div
              style={{
                padding:
                  "10px 16px",
                borderTop:
                  "1px solid #e5e7eb",
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowOpeningEditor(
                    false
                  )
                }
                style={{
                  height: "34px",
                  padding:
                    "0 16px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "6px",
                  background:
                    "#ffffff",
                  color: "#374151",
                  cursor:
                    "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSaveOpeningStock
                }
                style={{
                  height: "34px",
                  padding:
                    "0 16px",
                  border: "none",
                  borderRadius: "6px",
                  background:
                    "#14532d",
                  color: "#ffffff",
                  cursor:
                    "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                💾 Save Opening Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}