"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import StockMonthlyTable from "./StockMonthlyTable";

import {
  getStockMonthlyReport,
  getStockReportMonths,
  formatStockReportMonth,
  MonthlyStockSummary,
} from "./StockMonthlyReport";

/* =========================================================
   STOCK MONTHLY PAGE
========================================================= */

export default function StockMonthlyPage() {
  const [months, setMonths] =
    useState<string[]>([]);

  const [selectedMonth, setSelectedMonth] =
    useState("");

  const [report, setReport] =
    useState<MonthlyStockSummary | null>(
      null
    );

  const [refreshKey, setRefreshKey] =
    useState(0);

  /* =======================================================
     LOAD AVAILABLE MONTHS
  ======================================================= */

  useEffect(() => {
    const availableMonths =
      getStockReportMonths();

    setMonths(availableMonths);

    if (
      availableMonths.length > 0
    ) {
      setSelectedMonth(
        (current) =>
          current &&
          availableMonths.includes(
            current
          )
            ? current
            : availableMonths[0]
      );
    }
  }, [refreshKey]);

  /* =======================================================
     CALCULATE SELECTED MONTH
  ======================================================= */

  useEffect(() => {
    if (!selectedMonth) {
      setReport(null);
      return;
    }

    const parts =
      selectedMonth.split("-");

    if (parts.length !== 2) {
      setReport(null);
      return;
    }

    const year =
      Number(parts[0]);

    const month =
      Number(parts[1]);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12
    ) {
      setReport(null);
      return;
    }

    const monthlyReport =
      getStockMonthlyReport(
        year,
        month
      );

    setReport(
      monthlyReport
    );
  }, [
    selectedMonth,
    refreshKey,
  ]);

  /* =======================================================
     DISPLAY VALUES
  ======================================================= */

  const summary = useMemo(() => {
    if (!report) {
      return {
        opening: 0,
        purchase: 0,
        sales: 0,
        closing: 0,
      };
    }

    return {
      opening:
        report.openingTotal,

      purchase:
        report.purchaseTotal,

      sales:
        report.salesTotal,

      closing:
        report.closingTotal,
    };
  }, [report]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = () => {
    setRefreshKey(
      (value) => value + 1
    );
  };

  /* =======================================================
     PRINT
  ======================================================= */

  const handlePrint = () => {
    window.print();
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <>
      {/* ===================================================
          PRINT STYLE
      =================================================== */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          .monthly-stock-print-area,
          .monthly-stock-print-area * {
            visibility: visible !important;
          }

          .monthly-stock-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
          }

          .monthly-stock-no-print {
            display: none !important;
          }

          .monthly-stock-print-header {
            display: block !important;
          }
        }

        @media screen {
          .monthly-stock-print-header {
            display: none;
          }
        }
      `}</style>

      {/* ===================================================
          MAIN CONTAINER
      =================================================== */}

      <div
        className="monthly-stock-print-area"
        style={{
          width: "100%",
          maxWidth: "1600px",
          margin: "0 auto",
          padding: "14px",
          boxSizing: "border-box",
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* =================================================
            PRINT HEADER
        ================================================= */}

        <div
          className="monthly-stock-print-header"
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
            }}
          >
            MONTHLY STOCK REPORT
          </div>

          <div
            style={{
              marginTop: "3px",
              fontSize: "10px",
              color: "#6b7280",
            }}
          >
            {selectedMonth
              ? formatStockReportMonth(
                  selectedMonth
                )
              : "Monthly Stock"}
          </div>
        </div>

        {/* =================================================
            SCREEN HEADER
        ================================================= */}

        <div
          className="monthly-stock-no-print"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "14px",
            width: "100%",
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#14532d",
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              📊 Monthly Stock Report
            </h2>

            <div
              style={{
                marginTop: "4px",
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              Product-wise monthly stock
              movement
            </div>
          </div>

          {/* =================================================
              CONTROLS
          ================================================= */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  e.target.value
                )
              }
              style={{
                height: "36px",
                minWidth: "180px",
                padding:
                  "0 10px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "6px",
                background:
                  "#ffffff",
                color: "#111827",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
              }}
            >
              {months.length ===
              0 ? (
                <option value="">
                  No Month Available
                </option>
              ) : (
                months.map(
                  (month) => (
                    <option
                      key={month}
                      value={month}
                    >
                      {formatStockReportMonth(
                        month
                      )}
                    </option>
                  )
                )
              )}
            </select>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              style={{
                height: "36px",
                padding:
                  "0 12px",
                border: "none",
                borderRadius: "6px",
                background:
                  "#2563eb",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              🔄 Refresh
            </button>

            <button
              type="button"
              onClick={
                handlePrint
              }
              style={{
                height: "36px",
                padding:
                  "0 12px",
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
              🖨️ Print
            </button>
          </div>
        </div>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "10px",
            width: "100%",
            marginBottom: "14px",
          }}
        >
          {/* OPENING */}

          <SummaryCard
            title="OPENING STOCK"
            value={summary.opening}
            icon="📦"
            background="#f8fafc"
            valueColor="#374151"
          />

          {/* PURCHASE */}

          <SummaryCard
            title="MONTHLY PURCHASE"
            value={summary.purchase}
            icon="📥"
            background="#eff6ff"
            valueColor="#1d4ed8"
          />

          {/* SALES */}

          <SummaryCard
            title="MONTHLY SALES"
            value={summary.sales}
            icon="📤"
            background="#fff7ed"
            valueColor="#c2410c"
          />

          {/* CLOSING */}

          <SummaryCard
            title="CLOSING STOCK"
            value={summary.closing}
            icon="📊"
            background="#f0fdf4"
            valueColor="#15803d"
          />
        </div>

        {/* =================================================
            FORMULA
        ================================================= */}

        <div
          style={{
            marginBottom: "14px",
            padding:
              "9px 12px",
            background:
              "#f8fafc",
            border:
              "1px solid #e5e7eb",
            borderRadius: "7px",
            fontSize: "12px",
            color: "#374151",
            textAlign: "center",
          }}
        >
          <strong>
            Closing Stock
          </strong>{" "}
          = Opening Stock + Monthly
          Purchase − Monthly Sales
        </div>

        {/* =================================================
            MONTHLY TABLE
        ================================================= */}

        {report ? (
          <StockMonthlyTable
            rows={
              report.rows
            }
          />
        ) : (
          <div
            style={{
              padding: "35px",
              textAlign: "center",
              color: "#6b7280",
              background:
                "#ffffff",
              border:
                "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            📦 No monthly stock
            data available.
          </div>
        )}

        {/* =================================================
            PRINT FOOTER
        ================================================= */}

        <div
          className="monthly-stock-print-header"
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
            Monthly Stock Report
          </span>

          <span>
            Generated by UK EXIM ERP
          </span>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

type SummaryCardProps = {
  title: string;
  value: number;
  icon: string;
  background: string;
  valueColor: string;
};

function SummaryCard({
  title,
  value,
  icon,
  background,
  valueColor,
}: SummaryCardProps) {
  return (
    <div
      style={{
        background,
        border:
          "1px solid #d1d5db",
        borderRadius: "8px",
        padding:
          "10px 12px",
        minHeight: "72px",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "#6b7280",
          fontSize: "10px",
          fontWeight: 700,
          marginBottom: "6px",
        }}
      >
        <span>{icon}</span>

        <span>
          {title}
        </span>
      </div>

      <div
        style={{
          color: valueColor,
          fontSize: "20px",
          fontWeight: 900,
          fontVariantNumeric:
            "tabular-nums",
          overflow: "hidden",
          textOverflow:
            "ellipsis",
        }}
      >
        {Number(
          value || 0
        ).toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
          }
        )}
      </div>
    </div>
  );
}