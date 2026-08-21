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

export default function SalesTable({
  sales = [],
  onEdit,
  onDelete,
  onInvoice,
}: SalesTableProps) {
  const [search, setSearch] = useState("");

  const [selectedSale, setSelectedSale] =
    useState<Sales | null>(null);

  const filteredSales = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return sales;
    }

    return sales.filter((sale) => {
      const customerMatch =
        sale.customerCode
          ?.toLowerCase()
          .includes(keyword) ||
        sale.customerName
          ?.toLowerCase()
          .includes(keyword);

      const salesMatch =
        sale.salesNo
          ?.toLowerCase()
          .includes(keyword) ||
        sale.invoiceNo
          ?.toLowerCase()
          .includes(keyword) ||
        sale.salesDate
          ?.toLowerCase()
          .includes(keyword);

      const productMatch =
        sale.items?.some((item) =>
          (
            (item.productCode || "") +
            " " +
            (item.productName || "")
          )
            .toLowerCase()
            .includes(keyword)
        );

      return Boolean(
        customerMatch ||
        salesMatch ||
        productMatch
      );
    });
  }, [sales, search]);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        padding: "18px",
        marginTop: "18px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* =========================
          HEADER
      ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          marginBottom: "15px",
        }}
      >
        <div>
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
                display: "inline-block",
                padding: "2px 8px",
                marginLeft: "4px",
                borderRadius: "12px",
                background: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              {sales.length}
            </span>
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
            width: "340px",
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

      {/* =========================
          TABLE
      ========================= */}

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
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#14532d",
                color: "#ffffff",
              }}
            >
              <th
                style={{
                  ...thStyle,
                  width: "75px",
                }}
              >
                Sales No
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "85px",
                }}
              >
                Date
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "90px",
                }}
              >
                Invoice
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "170px",
                }}
              >
                Customer
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "180px",
                }}
              >
                Product
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "55px",
                }}
              >
                Qty
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "80px",
                }}
              >
                Rate
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "70px",
                }}
              >
                GST
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "100px",
                }}
              >
                Grand Total
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "100px",
                }}
              >
                Status
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "220px",
                }}
              >
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  style={{
                    padding: "30px",
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
                (sale, index) => {
                  const firstItem =
                    sale.items?.[0];

                  const productText =
                    sale.items &&
                    sale.items.length > 1
                      ? `${
                          firstItem?.productName ||
                          "-"
                        } + ${
                          sale.items.length - 1
                        } more`
                      : firstItem?.productName ||
                        "-";

                  const totalQty =
                    sale.items?.reduce(
                      (
                        total: number,
                        item
                      ) =>
                        total +
                        Number(
                          item.qty || 0
                        ),
                      0
                    ) || 0;

                  const firstRate =
                    firstItem?.rate || 0;

                  const firstGST =
                    firstItem?.gst || 0;

                  return (
                    <tr
                      key={sale.id}
                      style={{
                        background:
                          index % 2 === 0
                            ? "#ffffff"
                            : "#f8fafc",
                      }}
                    >
                      {/* SALES NO */}

                      <td style={tdStyle}>
                        {sale.salesNo}
                      </td>

                      {/* DATE */}

                      <td style={tdStyle}>
                        {sale.salesDate}
                      </td>

                      {/* INVOICE NO */}

                      <td style={tdStyle}>
                        {sale.invoiceNo ||
                          "-"}
                      </td>

                      {/* CUSTOMER */}

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 600,
                        }}
                        title={
                          sale.customerName
                        }
                      >
                        {sale.customerName ||
                          "-"}
                      </td>

                      {/* PRODUCT */}

                      <td
                        style={tdStyle}
                        title={sale.items
                          ?.map(
                            (item) =>
                              item.productName
                          )
                          .join(", ")}
                      >
                        {productText}
                      </td>

                      {/* QTY */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                        }}
                      >
                        {totalQty}
                      </td>

                      {/* RATE */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                        }}
                      >
                        ₹{" "}
                        {Number(
                          firstRate
                        ).toFixed(2)}
                      </td>

                      {/* GST */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                        }}
                      >
                        {firstGST}%
                      </td>

                      {/* GRAND TOTAL */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#14532d",
                        }}
                      >
                        ₹{" "}
                        {Number(
                          sale.grandTotal ||
                            0
                        ).toFixed(2)}
                      </td>

                      {/* STATUS */}

                      <td style={tdStyle}>
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "4px 9px",
                            borderRadius:
                              "12px",
                            fontSize:
                              "11px",
                            fontWeight: 700,
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
                          }}
                        >
                          {sale.status}
                        </span>
                      </td>

                      {/* =========================
                          ACTION BUTTONS
                      ========================= */}

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "center",
                          whiteSpace:
                            "nowrap",
                        }}
                      >

                        {/* EDIT */}

                        <button
                          type="button"
                          onClick={() =>
                            onEdit(sale)
                          }
                          style={{
                            padding:
                              "6px 9px",
                            marginRight:
                              "5px",
                            border:
                              "none",
                            borderRadius:
                              "4px",
                            background:
                              "#2563eb",
                            color:
                              "#ffffff",
                            fontSize:
                              "11px",
                            fontWeight: 600,
                            cursor:
                              "pointer",
                          }}
                        >
                          ✏️ Edit
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
                          style={{
                            padding:
                              "6px 9px",
                            marginRight:
                              "5px",
                            border:
                              "none",
                            borderRadius:
                              "4px",
                            background:
                              "#14532d",
                            color:
                              "#ffffff",
                            fontSize:
                              "11px",
                            fontWeight: 600,
                            cursor:
                              "pointer",
                          }}
                        >
                          🧾 Invoice
                        </button>

     {/* DELETE */}

<button
  type="button"
  onClick={() =>
    onDelete(sale.id)
  }
  style={{
    padding: "6px 9px",
    border: "none",
    borderRadius: "4px",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
  }}
>
  🗑️ Delete
</button>
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>

      {/* =========================
          GST INVOICE
      ========================= */}

      {selectedSale && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 9999,
      overflowY: "auto",
      padding: "30px 15px",
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        background: "#ffffff",
        width: "100%",
        maxWidth: "950px",
        margin: "0 auto",
        borderRadius: "10px",
        padding: "20px",
        boxSizing: "border-box",
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.3)",
      }}
    >
      <InvoicePrint
        sale={selectedSale}
        onClose={() =>
          setSelectedSale(null)
        }
      />
    </div>
  </div>
)}
    </div>
  );
}

/* =========================
   TABLE HEADER STYLE
========================= */

const thStyle: React.CSSProperties = {
  padding: "9px 7px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  borderRight:
    "1px solid rgba(255,255,255,0.2)",
  borderBottom:
    "2px solid #0f3d24",
  whiteSpace: "nowrap",
};

/* =========================
   TABLE DATA STYLE
========================= */

const tdStyle: React.CSSProperties = {
  padding: "9px 7px",
  borderRight:
    "1px solid #e5e7eb",
  borderBottom:
    "1px solid #e5e7eb",
  fontSize: "11px",
  color: "#374151",
  verticalAlign: "middle",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};