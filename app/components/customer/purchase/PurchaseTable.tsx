"use client";

import { useMemo, useState } from "react";
import { Purchase } from "./PurchaseTypes";

type PurchaseTableProps = {
  purchases: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
};

export default function PurchaseTable({
  purchases,
  onEdit,
  onDelete,
}: PurchaseTableProps) {
  const [search, setSearch] = useState("");

  const filteredPurchases = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return purchases.filter(
      (purchase) =>
        purchase.purchaseNo
          .toLowerCase()
          .includes(keyword) ||
        purchase.purchaseDate
          .toLowerCase()
          .includes(keyword) ||
        purchase.invoiceNo
          .toLowerCase()
          .includes(keyword) ||
        purchase.supplierName
          .toLowerCase()
          .includes(keyword) ||
        purchase.productName
          .toLowerCase()
          .includes(keyword) ||
        purchase.hsn
          .toLowerCase()
          .includes(keyword)
    );
  }, [purchases, search]);

  return (
    <div
      style={{
        marginTop: "22px",
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        padding: "16px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* =========================================
          PURCHASE REGISTER HEADER
      ========================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#14532d",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            📋 Purchase Register
          </h2>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total Purchases:{" "}
            <span
              style={{
                display: "inline-block",
                marginLeft: "4px",
                padding: "3px 9px",
                borderRadius: "5px",
                background: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              {purchases.length}
            </span>
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Purchase / Supplier / Product"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "330px",
            maxWidth: "40%",
            height: "38px",
            padding: "0 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* =========================================
          TABLE
      ========================================== */}

      <div
        style={{
          width: "100%",
          overflow: "hidden",
          border:
            "1px solid #d1d5db",
          borderRadius: "7px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
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
              <th
                style={{
                  ...thStyle,
                  width: "4%",
                }}
              >
                #
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "9%",
                }}
              >
                Purchase No
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "8%",
                }}
              >
                Date
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "9%",
                }}
              >
                Invoice
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "13%",
                }}
              >
                Supplier
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "13%",
                }}
              >
                Product
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "7%",
                }}
              >
                Qty
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "7%",
                }}
              >
                Rate
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "8%",
                }}
              >
                Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "6%",
                }}
              >
                GST
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "9%",
                }}
              >
                Net Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "7%",
                }}
              >
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredPurchases.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    padding: "25px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontWeight: 600,
                  }}
                >
                  📋 No Purchase Records Found
                </td>
              </tr>
            ) : (
              filteredPurchases.map(
                (purchase, index) => (
                  <tr
                    key={purchase.id}
                    style={{
                      background:
                        index % 2 === 0
                          ? "#ffffff"
                          : "#f8fafc",
                    }}
                  >
                    {/* # */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      {index + 1}
                    </td>

                    {/* PURCHASE NO */}

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: "#14532d",
                      }}
                    >
                      {purchase.purchaseNo}
                    </td>

                    {/* DATE */}

                    <td style={tdStyle}>
                      {purchase.purchaseDate}
                    </td>

                    {/* INVOICE */}

                    <td style={tdStyle}>
                      {purchase.invoiceNo || "-"}
                    </td>

                    {/* SUPPLIER */}

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                      }}
                    >
                      {purchase.supplierName}
                    </td>

                    {/* PRODUCT */}

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                      }}
                    >
                      {purchase.productName}
                    </td>

                    {/* QTY */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                      }}
                    >
                      {purchase.qty}
                      {" "}
                      {purchase.unit}
                    </td>

                    {/* RATE */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                      }}
                    >
                      ₹{" "}
                      {(
                        purchase.rate ?? 0
                      ).toFixed(2)}
                    </td>

                    {/* AMOUNT */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                      }}
                    >
                      ₹{" "}
                      {(
                        purchase.amount ?? 0
                      ).toFixed(2)}
                    </td>

                    {/* GST */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      {purchase.gst}%
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
                      ₹{" "}
                      {(
                        purchase.netAmount ?? 0
                      ).toFixed(2)}
                    </td>

                    {/* ACTION */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "center",
                          gap: "4px",
                        }}
                      >
                        <button
                          onClick={() =>
                            onEdit(purchase)
                          }
                          style={{
                            padding:
                              "5px 8px",
                            border: "none",
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
                          ✏️
                        </button>

                        <button
                          onClick={() =>
                            onDelete(
                              purchase.id
                            )
                          }
                          style={{
                            padding:
                              "5px 8px",
                            border: "none",
                            borderRadius:
                              "4px",
                            background:
                              "#dc2626",
                            color:
                              "#ffffff",
                            fontSize:
                              "11px",
                            fontWeight: 600,
                            cursor:
                              "pointer",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================
   TABLE HEADER STYLE
============================================ */

const thStyle: React.CSSProperties = {
  padding: "9px 6px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  borderBottom:
    "2px solid #0b3d20",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* ============================================
   TABLE DATA STYLE
============================================ */

const tdStyle: React.CSSProperties = {
  padding: "8px 6px",
  borderBottom:
    "1px solid #e5e7eb",
  fontSize: "11px",
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};