"use client";

import React, { useMemo, useState } from "react";
import { Purchase } from "./PurchaseTypes";

type PurchaseTableProps = {
  purchases: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
  onPrint: (purchase: Purchase) => void;
};

/* =========================================================
   DATE DISPLAY
   Internal storage remains: YYYY-MM-DD
   User-facing display: DD/MM/YYYY
   ========================================================= */

function formatDateDisplay(dateValue: string): string {
  if (!dateValue) return "-";

  const parts = dateValue.split("-");

  if (parts.length !== 3) {
    return dateValue;
  }

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

export default function PurchaseTable({
  purchases,
  onEdit,
  onDelete,
  onPrint,
}: PurchaseTableProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const filteredPurchases = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    // नवीन GRN सर्वात वर
    const orderedPurchases = [...purchases].reverse();

    if (!keyword) return orderedPurchases;

    return orderedPurchases.filter((purchase) => {
      const headerMatch =
        purchase.purchaseNo.toLowerCase().includes(keyword) ||
        purchase.purchaseDate.toLowerCase().includes(keyword) ||
        formatDateDisplay(purchase.purchaseDate)
          .toLowerCase()
          .includes(keyword) ||
        purchase.invoiceNo.toLowerCase().includes(keyword) ||
        purchase.supplierCode.toLowerCase().includes(keyword) ||
        purchase.supplierName.toLowerCase().includes(keyword) ||
        purchase.remarks.toLowerCase().includes(keyword);

      const itemMatch = (purchase.items ?? []).some(
        (item) =>
          item.productCode.toLowerCase().includes(keyword) ||
          item.productName.toLowerCase().includes(keyword) ||
          item.hsn.toLowerCase().includes(keyword) ||
          item.unit.toLowerCase().includes(keyword)
      );

      return headerMatch || itemMatch;
    });
  }, [purchases, search]);

  const handleExpand = (id: string) => {
    setExpandedId((current) =>
      current === id ? null : id
    );
  };

  return (
    <div
      style={{
        marginTop: "22px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
          width: "100%",
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 220px",
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
            📋 Purchase Register
          </h2>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total GRN:{" "}
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

        <input
          type="text"
          placeholder="🔍 Search GRN / Supplier / Product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "330px",
            maxWidth: "100%",
            flex: "0 1 330px",
            height: "36px",
            padding: "0 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "12px",
            outline: "none",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        />
      </div>

      {/* MAIN TABLE */}

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          overflowY: "auto",
          maxHeight: "65vh",
          border: "1px solid #d1d5db",
          borderRadius: "7px",
          boxSizing: "border-box",
        }}
      >
        <table
          style={{
            width: "100%",
            maxWidth: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            fontSize: "11px",
          }}
        >
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>

          <thead>
            <tr
              style={{
                background: "#14532d",
                color: "#ffffff",
              }}
            >
              <th style={thStyle}>#</th>
              <th style={thStyle}>GRN No.</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Invoice No.</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Products</th>
              <th
                style={{
                  ...thStyle,
                  textAlign: "right",
                }}
              >
                Total Qty
              </th>
              <th
                style={{
                  ...thStyle,
                  textAlign: "right",
                }}
              >
                Total Amount
              </th>
              <th
                style={{
                  ...thStyle,
                  textAlign: "right",
                }}
              >
                GST Amount
              </th>
              <th
                style={{
                  ...thStyle,
                  textAlign: "right",
                }}
              >
                Net Amount
              </th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredPurchases.length === 0 ? (
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
                  📋 No Purchase Records Found
                </td>
              </tr>
            ) : (
              filteredPurchases.map(
                (purchase, index) => {
                  const items = purchase.items ?? [];

                  const totalQty = items.reduce(
                    (total, item) =>
                      total + Number(item.qty),
                    0
                  );

                  const totalAmount = items.reduce(
                    (total, item) =>
                      total + Number(item.amount),
                    0
                  );

                  const totalGst = items.reduce(
                    (total, item) =>
                      total + Number(item.gstAmount),
                    0
                  );

                  const totalNet = items.reduce(
                    (total, item) =>
                      total + Number(item.netAmount),
                    0
                  );

                  const isExpanded =
                    expandedId === purchase.id;

                  return (
                    <React.Fragment key={purchase.id}>
                      <tr
                        style={{
                          background: isExpanded
                            ? "#f0fdf4"
                            : index % 2 === 0
                            ? "#ffffff"
                            : "#f8fafc",
                        }}
                      >
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 700,
                            color: "#14532d",
                          }}
                          title={purchase.purchaseNo}
                        >
                          {purchase.purchaseNo}
                        </td>

                        <td style={tdStyle}>
                          {formatDateDisplay(
                            purchase.purchaseDate
                          )}
                        </td>

                        <td
                          style={tdStyle}
                          title={purchase.invoiceNo || "-"}
                        >
                          {purchase.invoiceNo || "-"}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                          }}
                          title={
                            purchase.supplierCode
                              ? `${purchase.supplierCode} - ${purchase.supplierName}`
                              : purchase.supplierName || "-"
                          }
                        >
                          {purchase.supplierCode
                            ? `${purchase.supplierCode} - ${purchase.supplierName}`
                            : purchase.supplierName || "-"}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: "24px",
                              padding: "3px 5px",
                              borderRadius: "12px",
                              background: "#dcfce7",
                              color: "#166534",
                              fontWeight: 700,
                            }}
                          >
                            {items.length}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          {totalQty.toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                          }}
                        >
                          ₹ {totalAmount.toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                          }}
                        >
                          ₹ {totalGst.toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 800,
                            color: "#14532d",
                          }}
                        >
                          ₹ {totalNet.toFixed(2)}
                        </td>

                        {/* ACTION */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "center",
                            padding: "5px 2px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "3px",
                              width: "100%",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleExpand(
                                  purchase.id
                                )
                              }
                              title={
                                isExpanded
                                  ? "Hide Products"
                                  : "View Products"
                              }
                              style={actionButtonStyle(
                                "#0f766e"
                              )}
                            >
                              {isExpanded ? "▲" : "▼"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onPrint(purchase)
                              }
                              title="Print GRN"
                              style={actionButtonStyle(
                                "#166534"
                              )}
                            >
                              🖨️
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onEdit(purchase)
                              }
                              title="Edit Complete GRN"
                              style={actionButtonStyle(
                                "#2563eb"
                              )}
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onDelete(purchase.id)
                              }
                              title="Delete Complete GRN"
                              style={actionButtonStyle(
                                "#dc2626"
                              )}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED DETAILS */}

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={11}
                            style={{
                              padding: 0,
                              background: "#f8fafc",
                              borderBottom:
                                "2px solid #d1d5db",
                            }}
                          >
                            <div
                              style={{
                                padding: "12px",
                                width: "100%",
                                minWidth: 0,
                                boxSizing: "border-box",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginBottom: "10px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "#14532d",
                                  }}
                                >
                                  📦 GRN Product Details
                                </div>

                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#6b7280",
                                  }}
                                >
                                  {items.length} Product
                                  {items.length !== 1
                                    ? "s"
                                    : ""}
                                </div>
                              </div>

                              <div
                                style={{
                                  width: "100%",
                                  maxWidth: "100%",
                                  minWidth: 0,
                                  overflowX: "hidden",
                                  overflowY: "auto",
                                  border:
                                    "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  background: "#ffffff",
                                  boxSizing: "border-box",
                                }}
                              >
                                <table
                                  style={{
                                    width: "100%",
                                    maxWidth: "100%",
                                    tableLayout: "fixed",
                                    borderCollapse:
                                      "collapse",
                                    fontSize: "10px",
                                  }}
                                >
                                  <colgroup>
                                    <col style={{ width: "5%" }} />
                                    <col style={{ width: "22%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "8%" }} />
                                    <col style={{ width: "8%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "11%" }} />
                                    <col style={{ width: "7%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "9%" }} />
                                  </colgroup>

                                  <thead>
                                    <tr
                                      style={{
                                        background: "#166534",
                                        color: "#ffffff",
                                      }}
                                    >
                                      <th style={detailThStyle}>
                                        #
                                      </th>
                                      <th style={detailThStyle}>
                                        Product
                                      </th>
                                      <th style={detailThStyle}>
                                        HSN
                                      </th>
                                      <th style={detailThStyle}>
                                        Unit
                                      </th>
                                      <th
                                        style={{
                                          ...detailThStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        Qty
                                      </th>
                                      <th
                                        style={{
                                          ...detailThStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        Rate
                                      </th>
                                      <th
                                        style={{
                                          ...detailThStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        Amount
                                      </th>
                                      <th style={detailThStyle}>
                                        GST
                                      </th>
                                      <th
                                        style={{
                                          ...detailThStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        GST Amount
                                      </th>
                                      <th
                                        style={{
                                          ...detailThStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        Net Amount
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {items.map(
                                      (item, itemIndex) => (
                                        <tr
                                          key={`${purchase.id}-${item.productCode}-${itemIndex}`}
                                          style={{
                                            background:
                                              itemIndex % 2 === 0
                                                ? "#ffffff"
                                                : "#f9fafb",
                                          }}
                                        >
                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "center",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {itemIndex + 1}
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              fontWeight: 600,
                                              whiteSpace: "normal",
                                              wordBreak:
                                                "break-word",
                                            }}
                                            title={
                                              item.productName
                                            }
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection:
                                                  "column",
                                                gap: "2px",
                                              }}
                                            >
                                              <span>
                                                {
                                                  item.productName
                                                }
                                              </span>

                                              <span
                                                style={{
                                                  fontSize: "9px",
                                                  color:
                                                    "#6b7280",
                                                }}
                                              >
                                                {
                                                  item.productCode
                                                }
                                              </span>
                                            </div>
                                          </td>

                                          <td
                                            style={
                                              detailTdStyle
                                            }
                                          >
                                            {item.hsn}
                                          </td>

                                          <td
                                            style={
                                              detailTdStyle
                                            }
                                          >
                                            {item.unit}
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "right",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {Number(
                                              item.qty
                                            ).toFixed(2)}
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "right",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.rate
                                            ).toFixed(2)}
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "right",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.amount
                                            ).toFixed(2)}
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "center",
                                            }}
                                          >
                                            {Number(
                                              item.gst
                                            ).toFixed(2)}
                                            %
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "right",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.gstAmount
                                            ).toFixed(2)}
                                          </td>

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign: "right",
                                              fontWeight: 700,
                                              color: "#14532d",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.netAmount
                                            ).toFixed(2)}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>

                                  <tfoot>
                                    <tr
                                      style={{
                                        background: "#ecfdf5",
                                        fontWeight: 700,
                                      }}
                                    >
                                      <td
                                        colSpan={4}
                                        style={{
                                          ...detailTdStyle,
                                          textAlign: "right",
                                          color: "#14532d",
                                        }}
                                      >
                                        GRN Total
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign: "right",
                                          color: "#14532d",
                                        }}
                                      >
                                        {totalQty.toFixed(2)}
                                      </td>

                                      <td
                                        style={detailTdStyle}
                                      >
                                        -
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        ₹{" "}
                                        {totalAmount.toFixed(2)}
                                      </td>

                                      <td
                                        style={detailTdStyle}
                                      >
                                        -
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign: "right",
                                        }}
                                      >
                                        ₹{" "}
                                        {totalGst.toFixed(2)}
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign: "right",
                                          color: "#14532d",
                                          fontWeight: 800,
                                        }}
                                      >
                                        ₹{" "}
                                        {totalNet.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>

      {/* REGISTER SUMMARY */}

      {filteredPurchases.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "12px",
            padding: "10px 12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              color: "#166534",
              fontWeight: 600,
            }}
          >
            Showing {filteredPurchases.length} of{" "}
            {purchases.length} GRN records
          </span>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✖ Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* MAIN TABLE HEADER */

const thStyle: React.CSSProperties = {
  padding: "7px 4px",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 700,
  borderBottom: "2px solid #0b3d20",
  whiteSpace: "normal",
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "break-word",
  lineHeight: "12px",
  boxSizing: "border-box",
};

/* MAIN TABLE DATA */

const tdStyle: React.CSSProperties = {
  padding: "7px 4px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "10px",
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxSizing: "border-box",
};

/* DETAIL TABLE HEADER */

const detailThStyle: React.CSSProperties = {
  padding: "7px 4px",
  textAlign: "left",
  fontSize: "9px",
  fontWeight: 700,
  borderBottom: "1px solid #14532d",
  whiteSpace: "normal",
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "break-word",
  lineHeight: "11px",
  boxSizing: "border-box",
};

/* DETAIL TABLE DATA */

const detailTdStyle: React.CSSProperties = {
  padding: "7px 4px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "9px",
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxSizing: "border-box",
};

/* ACTION BUTTON */

function actionButtonStyle(
  background: string
): React.CSSProperties {
  return {
    width: "24px",
    height: "24px",
    padding: 0,
    border: "none",
    borderRadius: "4px",
    background,
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}