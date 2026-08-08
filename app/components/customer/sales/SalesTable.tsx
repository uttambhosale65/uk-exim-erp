"use client";

import React from "react";
import { Sales } from "./SalesTypes";

const thStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: "7px 8px",
  textAlign: "center",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "7px 8px",
  whiteSpace: "nowrap",
};

const tdCenter: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  padding: "7px 8px",
  textAlign: "center",
  whiteSpace: "nowrap",
};

type SalesTableProps = {
  sales: Sales[];
  onEdit: (sale: Sales) => void;
  onDelete: (id: string) => void;
};

export default function SalesTable({
  sales,
  onEdit,
  onDelete,
}: SalesTableProps) {
  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1050px",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#2563eb",
              color: "#ffffff",
            }}
          >
            <th style={thStyle}>Sales No</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Product</th>
            <th style={thStyle}>HSN</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>GST</th>
            <th style={thStyle}>Grand Total</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td
                colSpan={12}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  border: "1px solid #e5e7eb",
                  color: "#6b7280",
                }}
              >
                No Sales Records Found
              </td>
            </tr>
          ) : (
            sales.map((sale, saleIndex) => {
              const items = Array.isArray(sale.items)
                ? sale.items
                : [];

              // -----------------------------------------
              // OLD / INVALID SALES RECORD
              // -----------------------------------------

              if (items.length === 0) {
                return (
                  <tr
                    key={sale.id}
                    style={{
                      background:
                        saleIndex % 2 === 0
                          ? "#ffffff"
                          : "#f9fafb",
                    }}
                  >
                    <td style={tdStyle}>
                      {sale.salesNo}
                    </td>

                    <td style={tdCenter}>
                      {sale.salesDate}
                    </td>

                    <td style={tdStyle}>
                      {sale.customerName}
                    </td>

                    <td
                      colSpan={9}
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        color: "#dc2626",
                        border:
                          "1px solid #e5e7eb",
                      }}
                    >
                      No Product Data
                    </td>
                  </tr>
                );
              }

              // -----------------------------------------
              // MULTI PRODUCT SALES
              // -----------------------------------------

              return items.map((item, itemIndex) => {
                const isFirstItem =
                  itemIndex === 0;

                return (
                  <tr
                    key={`${sale.id}-${item.productCode}-${itemIndex}`}
                    style={{
                      background:
                        saleIndex % 2 === 0
                          ? "#ffffff"
                          : "#f9fafb",
                    }}
                  >
                    {/* SALES NO */}
                    {isFirstItem && (
                      <td
                        rowSpan={items.length}
                        style={{
                          ...tdCenter,
                          fontWeight: 600,
                          verticalAlign: "middle",
                        }}
                      >
                        {sale.salesNo}
                      </td>
                    )}

                    {/* DATE */}
                    {isFirstItem && (
                      <td
                        rowSpan={items.length}
                        style={{
                          ...tdCenter,
                          verticalAlign: "middle",
                        }}
                      >
                        {sale.salesDate}
                      </td>
                    )}

                    {/* CUSTOMER */}
                    {isFirstItem && (
                      <td
                        rowSpan={items.length}
                        style={{
                          ...tdStyle,
                          verticalAlign: "middle",
                          fontWeight: 600,
                        }}
                      >
                        {sale.customerName}
                      </td>
                    )}

                    {/* PRODUCT */}
                    <td style={tdStyle}>
                      {item.productName}
                    </td>

                    {/* HSN */}
                    <td style={tdCenter}>
                      {item.hsn}
                    </td>

                    {/* UNIT */}
                    <td style={tdCenter}>
                      {item.unit}
                    </td>

                    {/* QTY */}
                    <td style={tdCenter}>
                      {item.qty}
                    </td>

                    {/* RATE */}
                    <td
                      style={{
                        ...tdCenter,
                        textAlign: "right",
                      }}
                    >
                      ₹ {item.rate.toFixed(2)}
                    </td>

                    {/* AMOUNT */}
                    <td
                      style={{
                        ...tdCenter,
                        textAlign: "right",
                      }}
                    >
                      ₹ {item.amount.toFixed(2)}
                    </td>

                    {/* GST */}
                    <td style={tdCenter}>
                      {item.gst}%
                    </td>

                    {/* GRAND TOTAL */}
                    {isFirstItem && (
                      <td
                        rowSpan={items.length}
                        style={{
                          ...tdCenter,
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            background: "#dcfce7",
                            color: "#166534",
                            padding: "5px 9px",
                            borderRadius: "20px",
                            fontWeight: 700,
                          }}
                        >
                          ₹{" "}
                          {sale.grandTotal.toFixed(
                            2
                          )}
                        </span>
                      </td>
                    )}

                    {/* ACTION */}
                    {isFirstItem && (
                      <td
                        rowSpan={items.length}
                        style={{
                          ...tdCenter,
                          verticalAlign: "middle",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onEdit(sale)
                            }
                            style={{
                              padding:
                                "5px 12px",
                              border: "none",
                              borderRadius:
                                "6px",
                              background:
                                "#2563eb",
                              color:
                                "#ffffff",
                              cursor:
                                "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onDelete(
                                sale.id
                              )
                            }
                            style={{
                              padding:
                                "5px 12px",
                              border: "none",
                              borderRadius:
                                "6px",
                              background:
                                "#dc2626",
                              color:
                                "#ffffff",
                              cursor:
                                "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              });
            })
          )}
        </tbody>
      </table>

      {/* TOTAL RECORDS */}

      <div
        style={{
          marginTop: "12px",
          fontWeight: 600,
          color: "#374151",
        }}
      >
        Total Sales Records: {sales.length}
      </div>
    </div>
  );
}