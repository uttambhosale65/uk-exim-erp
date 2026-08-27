"use client";

import {
  MonthlyStockRow,
} from "./StockMonthlyReport";

type StockMonthlyTableProps = {
  rows: MonthlyStockRow[];
};

export default function StockMonthlyTable({
  rows,
}: StockMonthlyTableProps) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "30px",
          textAlign: "center",
          color: "#6b7280",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          background: "#ffffff",
          fontSize: "13px",
        }}
      >
        No stock data available for this month.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "850px",
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
            <th style={headerStyle}>
              #
            </th>

            <th
              style={{
                ...headerStyle,
                textAlign: "left",
              }}
            >
              Product Code
            </th>

            <th
              style={{
                ...headerStyle,
                textAlign: "left",
              }}
            >
              Product Name
            </th>

            <th style={headerStyle}>
              Unit
            </th>

            <th style={headerStyle}>
              Opening
            </th>

            <th style={headerStyle}>
              Purchase
            </th>

            <th style={headerStyle}>
              Sales
            </th>

            <th style={headerStyle}>
              Closing
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (row, index) => (
              <tr
                key={
                  row.productCode ||
                  index
                }
                style={{
                  borderBottom:
                    "1px solid #e5e7eb",
                }}
              >
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  {index + 1}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  {row.productCode}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {row.productName}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    textAlign: "center",
                  }}
                >
                  {row.unit}
                </td>

                <td
                  style={{
                    ...numberCellStyle,
                  }}
                >
                  {formatNumber(
                    row.openingStock
                  )}
                </td>

                <td
                  style={{
                    ...numberCellStyle,
                  }}
                >
                  {formatNumber(
                    row.purchaseQty
                  )}
                </td>

                <td
                  style={{
                    ...numberCellStyle,
                  }}
                >
                  {formatNumber(
                    row.salesQty
                  )}
                </td>

                <td
                  style={{
                    ...numberCellStyle,
                    fontWeight: 800,
                    color: "#14532d",
                  }}
                >
                  {formatNumber(
                    row.closingStock
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>

        <tfoot>
          <tr
            style={{
              background: "#f0fdf4",
              borderTop:
                "2px solid #14532d",
            }}
          >
            <td
              colSpan={4}
              style={{
                ...cellStyle,
                textAlign: "right",
                fontWeight: 800,
                color: "#14532d",
              }}
            >
              TOTAL
            </td>

            <td
              style={totalNumberStyle}
            >
              {formatNumber(
                rows.reduce(
                  (total, row) =>
                    total +
                    row.openingStock,
                  0
                )
              )}
            </td>

            <td
              style={totalNumberStyle}
            >
              {formatNumber(
                rows.reduce(
                  (total, row) =>
                    total +
                    row.purchaseQty,
                  0
                )
              )}
            </td>

            <td
              style={totalNumberStyle}
            >
              {formatNumber(
                rows.reduce(
                  (total, row) =>
                    total +
                    row.salesQty,
                  0
                )
              )}
            </td>

            <td
              style={{
                ...totalNumberStyle,
                color: "#14532d",
                fontWeight: 900,
              }}
            >
              {formatNumber(
                rows.reduce(
                  (total, row) =>
                    total +
                    row.closingStock,
                  0
                )
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const headerStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderRight:
    "1px solid rgba(255,255,255,0.25)",
  textAlign: "right",
  whiteSpace: "nowrap",
  fontWeight: 700,
};

const cellStyle: React.CSSProperties = {
  padding: "9px 8px",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const numberCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontVariantNumeric:
    "tabular-nums",
  fontWeight: 600,
  color: "#374151",
};

const totalNumberStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 800,
  color: "#111827",
  fontVariantNumeric:
    "tabular-nums",
};

function formatNumber(
  value: number
): string {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }
  );
}