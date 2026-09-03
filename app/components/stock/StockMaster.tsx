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
  const [stock, setStock] =
    useState<Stock[]>([]);

  const [search, setSearch] =
    useState("");

  const [activeView, setActiveView] =
    useState<"current" | "monthly">(
      "current"
    );

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
    const confirmed =
      window.confirm(
        "Are you sure you want to reset all stock?\n\n" +
          "This will clear the current stock records."
      );

    if (!confirmed) return;

    resetStock();

    setStock([]);
  };

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredStock =
    stock.filter(
      (item) =>
        item.productName
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        item.productCode
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        item.hsn
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  /* =====================================================
     TOTAL CURRENT STOCK
  ===================================================== */

 const totalStock =
  filteredStock.reduce(
    (total, item) => {
      const product =
        loadProducts().find(
          (p) => p.code === item.productCode
        );

      const qty =
        Number(item.currentStock || 0);

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
    new Date().toLocaleDateString(
      "en-IN"
    );

  /* =====================================================
     VIEW
  ===================================================== */

  if (
    activeView === "monthly"
  ) {
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
              setActiveView(
                "current"
              )
            }
            style={{
              height: "34px",
              padding:
                "0 14px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background:
                "#ffffff",
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
              setActiveView(
                "monthly"
              )
            }
            style={{
              height: "34px",
              padding:
                "0 14px",
              border: "none",
              borderRadius: "6px",
              background:
                "#14532d",
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
              letterSpacing:
                "0.5px",
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
              letterSpacing:
                "0.3px",
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
            Product-wise Current
            Stock Details
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
              Report Date:{" "}
              {printDate}
            </span>

            <span>
              Total Products:{" "}
              {
                filteredStock.length
              }
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
              Product-wise Current
              Stock Details
            </div>
          </div>

          {/* SEARCH */}

          <input
            type="text"
            placeholder="🔍 Search Product / Code / HSN..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
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
    OPENING STOCK ADJUSTMENT
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
    onClick={() => {
      const updates: Record<string, number> = {
        P0001: 5,
        P0002: 132,
        P0003: 4,
        P0004: 16,
        P0005: 32,
        P0006: 8,
        P0007: 2,
        P0008: 0,
        P0009: 0,
      };

      setOpeningStockBulk(updates);
      setStock(loadStock());
    }}
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
              setActiveView(
                "current"
              )
            }
            style={{
              height: "34px",
              padding:
                "0 14px",
              border: "none",
              borderRadius: "6px",
              background:
                "#14532d",
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
              setActiveView(
                "monthly"
              )
            }
            style={{
              height: "34px",
              padding:
                "0 14px",
              border:
                "1px solid #14532d",
              borderRadius: "6px",
              background:
                "#ffffff",
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
              background:
                "#f8fafc",
              border:
                "1px solid #d1d5db",
              borderRadius: "7px",
              padding:
                "9px 12px",
              minHeight: "58px",
              boxSizing:
                "border-box",
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
              TOTAL CURRENT
              STOCK
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
              alignItems:
                "center",
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
                padding:
                  "0 14px",
                background:
                  "#14532d",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                cursor:
                  "pointer",
                fontWeight: 700,
                fontSize: "11px",
                minHeight: "58px",
                whiteSpace:
                  "nowrap",
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
                padding:
                  "0 14px",
                background:
                  "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                cursor:
                  "pointer",
                fontWeight: 700,
                fontSize: "11px",
                minHeight: "58px",
                whiteSpace:
                  "nowrap",
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
            background:
              "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            borderRadius: "5px",
            padding:
              "7px 10px",
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
            TOTAL CURRENT
            STOCK
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
          stock={
            filteredStock
          }
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
    </>
  );
}