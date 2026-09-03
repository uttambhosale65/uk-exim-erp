"use client";

import React, {
  useMemo,
  useState,
} from "react";

import { Sales } from "./SalesTypes";
import InvoicePrint from "./InvoicePrint";

type SalesTableProps = {
  sales: Sales[];
  onEdit: (sale: Sales) => void;
  onDelete: (id: string) => void;
  onInvoice?: (sale: Sales) => void;
};

/* =====================================================
   DATE FORMAT
===================================================== */

function formatDateDisplay(
  dateValue: string
): string {
  if (!dateValue) {
    return "-";
  }

  const parts =
    dateValue.split("-");

  if (parts.length !== 3) {
    return dateValue;
  }

  const [year, month, day] =
    parts;

  return `${day}/${month}/${year}`;
}

export default function SalesTable({
  sales = [],
  onEdit,
  onDelete,
  onInvoice,
}: SalesTableProps) {
  const [search, setSearch] =
    useState("");

  const [selectedSale, setSelectedSale] =
    useState<Sales | null>(null);

  /* =====================================================
     SORT + SEARCH SALES
  ===================================================== */

  const filteredSales = useMemo(() => {
    const orderedSales =
      [...sales].reverse();

    const keyword =
      search
        .trim()
        .toLowerCase();

    if (!keyword) {
      return orderedSales;
    }

    return orderedSales.filter(
      (sale: Sales) => {

        const customerMatch =
          sale.customerCode
            ?.toLowerCase()
            .includes(keyword) ||
          sale.customerName
            ?.toLowerCase()
            .includes(keyword);

        const displayDate =
          formatDateDisplay(
            sale.salesDate
          );

        const salesMatch =
          sale.salesNo
            ?.toLowerCase()
            .includes(keyword) ||
          sale.invoiceNo
            ?.toLowerCase()
            .includes(keyword) ||
          sale.salesDate
            ?.toLowerCase()
            .includes(keyword) ||
          displayDate
            .toLowerCase()
            .includes(keyword);

        const productMatch =
          Array.isArray(
            sale.items
          ) &&
          sale.items.some(
            (item) =>
              (
                (item.productCode ||
                  "") +
                " " +
                (item.productName ||
                  "")
              )
                .toLowerCase()
                .includes(keyword)
          );

        return Boolean(
          customerMatch ||
          salesMatch ||
          productMatch
        );
      }
    );
  }, [sales, search]);

  return (
    <div
      style={{
        background: "#ffffff",
        border:
          "1px solid #d1d5db",
        borderRadius: "10px",
        padding: "18px",
        marginTop: "18px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
        boxSizing:
          "border-box",
        overflowX: "hidden",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "15px",
          marginBottom: "15px",
          width: "100%",
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >

        <div
          style={{
            minWidth: 0,
            flex:
              "1 1 220px",
          }}
        >

          <h2
            style={{
              margin: 0,
              color: "#14532d",
              fontSize: "19px",
              fontWeight: 700,
            }}
          >
            📋 Sales Register
          </h2>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total Sales:{" "}

            <span
              style={{
                display:
                  "inline-block",
                padding:
                  "2px 8px",
                marginLeft:
                  "4px",
                borderRadius:
                  "12px",
                background:
                  "#dcfce7",
                color:
                  "#166534",
                fontWeight:
                  700,
              }}
            >
              {sales.length}
            </span>
          </div>

        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder=
            "🔍 Search Sales / Customer / Product"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          style={{
            width: "340px",
            maxWidth: "100%",
            flex:
              "0 1 340px",
            height: "40px",
            padding:
              "0 12px",
            border:
              "1px solid #d1d5db",
            borderRadius:
              "6px",
            fontSize: "13px",
            outline: "none",
            boxSizing:
              "border-box",
            minWidth: 0,
          }}
        />

      </div>

      {/* TABLE */}

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          overflowY: "auto",
          maxHeight: "65vh",
          border:
            "1px solid #dbe3ea",
          borderRadius: "7px",
          boxSizing:
            "border-box",
        }}
      >

        <table
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            tableLayout:
              "fixed",
            borderCollapse:
              "collapse",
            fontSize: "11px",
            boxSizing:
              "border-box",
          }}
        >

          <colgroup>
            <col style={{
              width: "6%"
            }} />

            <col style={{
              width: "7%"
            }} />

            <col style={{
              width: "7%"
            }} />

            <col style={{
              width: "13%"
            }} />

            <col style={{
              width: "15%"
            }} />

            <col style={{
              width: "5%"
            }} />

            <col style={{
              width: "7%"
            }} />

            <col style={{
              width: "5%"
            }} />

            <col style={{
              width: "9%"
            }} />

            <col style={{
              width: "10%"
            }} />

            <col style={{
              width: "16%"
            }} />
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
                Qty
              </th>

              <th style={thStyle}>
                Rate
              </th>

              <th style={thStyle}>
                GST
              </th>

              <th style={thStyle}>
                Grand Total
              </th>

              <th style={thStyle}>
                Status
              </th>

              <th style={thStyle}>
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredSales.length ===
            0 ? (

              <tr>

                <td
                  colSpan={11}
                  style={{
                    padding:
                      "30px",
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                    fontWeight:
                      600,
                  }}
                >
                  📦 No Sales Records Found
                </td>

              </tr>

            ) : (

              filteredSales.map(
                (
                  sale: Sales,
                  index: number
                ) => {

                  const firstItem =
                    Array.isArray(
                      sale.items
                    )
                      ? sale.items[0]
                      : undefined;

                  const productText =
                    Array.isArray(
                      sale.items
                    ) &&
                    sale.items.length >
                      1
                      ? `${
                          firstItem?.productName ||
                          "-"
                        } + ${
                          sale.items.length -
                          1
                        } more`
                      : firstItem?.productName ||
                        "-";

                  const totalQty =
                    Array.isArray(
                      sale.items
                    )
                      ? sale.items.reduce(
                          (
                            total: number,
                            item
                          ) =>
                            total +
                            Number(
                              item.qty ||
                                0
                            ),
                          0
                        )
                      : 0;

                  const firstRate =
                    firstItem?.rate ||
                    0;

                  const firstGST =
                    firstItem?.gst ||
                    0;

                  return (
                    <tr
                      key={
                        sale.id
                      }
                      style={{
                        background:
                          index %
                            2 ===
                          0
                            ? "#ffffff"
                            : "#f8fafc",
                      }}
                    >

                      {/* SALES NO */}

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          sale.salesNo
                        }
                      </td>

                      {/* DATE */}

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {formatDateDisplay(
                          sale.salesDate
                        )}
                      </td>

                      {/* INVOICE */}

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

                      {/* CUSTOMER */}

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight:
                            600,
                        }}
                        title={
                          sale.customerName ||
                          ""
                        }
                      >
                        {
                          sale.customerName ||
                          "-"
                        }
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
                          Array.isArray(
                            sale.items
                          )
                            ? sale.items
                                .map(
                                  (
                                    item
                                  ) =>
                                    item.productName
                                )
                                .join(
                                  ", "
                                )
                            : ""
                        }
                      >
                        {
                          productText
                        }
                      </td>

                      {/* QTY */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "center",
                        }}
                      >
                        {
                          totalQty
                        }
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
                          firstRate
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
                        {
                          firstGST
                        }%
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
                        ₹{" "}
                        {Number(
                          sale.grandTotal ||
                            0
                        ).toFixed(
                          2
                        )}
                      </td>

                      {/* STATUS */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "center",
                        }}
                      >

                        <span
                          style={{
                            display:
                              "inline-block",
                            maxWidth:
                              "100%",
                            padding:
                              "4px 6px",
                            borderRadius:
                              "12px",
                            fontSize:
                              "10px",
                            fontWeight:
                              700,

                            background:
                              sale.status ===
                              "Completed"
                                ? "#dcfce7"
                                : sale.status ===
                                  "Pending"
                                ? "#fef3c7"
                                : "#fee2e2",

                            color:
                              sale.status ===
                              "Completed"
                                ? "#166534"
                                : sale.status ===
                                  "Pending"
                                ? "#92400e"
                                : "#991b1b",

                            whiteSpace:
                              "nowrap",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            boxSizing:
                              "border-box",
                          }}
                        >
                          {
                            sale.status
                          }
                        </span>

                      </td>

                      {/* ACTION */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "center",
                          whiteSpace:
                            "normal",
                          padding:
                            "5px 3px",
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "center",
                            alignItems:
                              "center",
                            gap:
                              "3px",
                            flexWrap:
                              "wrap",
                            width:
                              "100%",
                          }}
                        >

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              onEdit(
                                sale
                              )
                            }
                            title="Edit Sale"
                            style={
                              actionButtonStyle(
                                "#2563eb"
                              )
                            }
                          >
                            ✏️
                          </button>

                          {/* INVOICE */}

                          <button
                            type="button"
                            onClick={() => {

                              setSelectedSale(
                                sale
                              );

                              if (
                                onInvoice
                              ) {
                                onInvoice(
                                  sale
                                );
                              }

                            }}
                            title="Open Invoice"
                            style={
                              actionButtonStyle(
                                "#14532d"
                              )
                            }
                          >
                            🧾
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              onDelete(
                                sale.id
                              )
                            }
                            title="Delete Sale"
                            style={
                              actionButtonStyle(
                                "#dc2626"
                              )
                            }
                          >
                            🗑️
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )

            )}

          </tbody>

        </table>

      </div>

      {/* INVOICE MODAL */}

      {selectedSale && (

        <div
          style={{
            position:
              "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "rgba(0,0,0,0.55)",
            zIndex:
              9999,
            overflowY:
              "auto",
            overflowX:
              "hidden",
            padding:
              "30px 15px",
            boxSizing:
              "border-box",
          }}
        >

          <div
            style={{
              background:
                "#ffffff",
              width: "100%",
              maxWidth:
                "950px",
              minWidth: 0,
              margin:
                "0 auto",
              borderRadius:
                "10px",
              padding:
                "20px",
              boxSizing:
                "border-box",
              overflowX:
                "hidden",
              boxShadow:
                "0 10px 40px rgba(0,0,0,0.3)",
            }}
          >

            <InvoicePrint
              sale={
                selectedSale
              }
              onClose={() =>
                setSelectedSale(
                  null
                )
              }
            />

          </div>

        </div>

      )}

    </div>
  );
}

/* =====================================================
   TABLE HEADER
===================================================== */

const thStyle:
  React.CSSProperties = {

  padding:
    "8px 4px",

  textAlign:
    "left",

  fontSize:
    "10px",

  fontWeight:
    700,

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

/* =====================================================
   TABLE DATA
===================================================== */

const tdStyle:
  React.CSSProperties = {

  padding:
    "8px 4px",

  borderRight:
    "1px solid #e5e7eb",

  borderBottom:
    "1px solid #e5e7eb",

  fontSize:
    "10px",

  color:
    "#374151",

  verticalAlign:
    "middle",

  overflow:
    "hidden",

  textOverflow:
    "ellipsis",

  whiteSpace:
    "nowrap",

  wordBreak:
    "break-word",

  boxSizing:
    "border-box",
};

/* =====================================================
   ACTION BUTTON
===================================================== */

function actionButtonStyle(
  background: string
): React.CSSProperties {

  return {

    width:
      "28px",

    height:
      "28px",

    padding: 0,

    border:
      "none",

    borderRadius:
      "4px",

    background,

    color:
      "#ffffff",

    fontSize:
      "11px",

    cursor:
      "pointer",

    display:
      "inline-flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    flexShrink:
      0,
  };
}