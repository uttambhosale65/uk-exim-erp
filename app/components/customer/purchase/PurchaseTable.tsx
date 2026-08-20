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
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  /* =================================================
     SEARCH
  ================================================== */

  const filteredPurchases = useMemo(() => {
    const keyword =
      search.toLowerCase().trim();

    if (!keyword) {
      return purchases;
    }

    return purchases.filter((purchase) => {
      const headerMatch =
        purchase.purchaseNo
          .toLowerCase()
          .includes(keyword) ||
        purchase.purchaseDate
          .toLowerCase()
          .includes(keyword) ||
        purchase.invoiceNo
          .toLowerCase()
          .includes(keyword) ||
        purchase.supplierCode
          .toLowerCase()
          .includes(keyword) ||
        purchase.supplierName
          .toLowerCase()
          .includes(keyword) ||
        purchase.remarks
          .toLowerCase()
          .includes(keyword);

      const itemMatch =
        (purchase.items ?? []).some(
          (item) =>
            item.productCode
              .toLowerCase()
              .includes(keyword) ||
            item.productName
              .toLowerCase()
              .includes(keyword) ||
            item.hsn
              .toLowerCase()
              .includes(keyword) ||
            item.unit
              .toLowerCase()
              .includes(keyword)
        );

      return (
        headerMatch || itemMatch
      );
    });
  }, [purchases, search]);

  /* =================================================
     EXPAND / COLLAPSE
  ================================================== */

  const handleExpand = (
    id: string
  ) => {
    setExpandedId((current) =>
      current === id ? null : id
    );
  };

  /* =================================================
     UI
  ================================================== */

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
      {/* =================================================
          REGISTER HEADER
      ================================================== */}

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

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search GRN / Supplier / Product"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "330px",
            maxWidth: "45%",
            height: "38px",
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

      {/* =================================================
          TABLE CONTAINER
      ================================================== */}

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          border:
            "1px solid #d1d5db",
          borderRadius: "7px",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "1250px",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          {/* =================================================
              HEADER
          ================================================== */}

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
                  width: "45px",
                  textAlign: "center",
                }}
              >
                #
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "110px",
                }}
              >
                GRN No.
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "105px",
                }}
              >
                Date
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "120px",
                }}
              >
                Invoice No.
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "190px",
                }}
              >
                Supplier
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "90px",
                  textAlign: "center",
                }}
              >
                Products
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "120px",
                  textAlign: "right",
                }}
              >
                Total Qty
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "130px",
                  textAlign: "right",
                }}
              >
                Total Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "120px",
                  textAlign: "right",
                }}
              >
                GST Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "140px",
                  textAlign: "right",
                }}
              >
                Net Amount
              </th>

              <th
                style={{
                  ...thStyle,
                  width: "120px",
                  textAlign: "center",
                }}
              >
                Action
              </th>
            </tr>
          </thead>

          {/* =================================================
              BODY
          ================================================== */}

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
                  const items =
                    purchase.items ?? [];

                  const totalQty =
                    items.reduce(
                      (total, item) =>
                        total +
                        Number(item.qty),
                      0
                    );

                  const totalAmount =
                    items.reduce(
                      (total, item) =>
                        total +
                        Number(item.amount),
                      0
                    );

                  const totalGst =
                    items.reduce(
                      (total, item) =>
                        total +
                        Number(
                          item.gstAmount
                        ),
                      0
                    );

                  const totalNet =
                    items.reduce(
                      (total, item) =>
                        total +
                        Number(
                          item.netAmount
                        ),
                      0
                    );

                  const isExpanded =
                    expandedId ===
                    purchase.id;

                  return (
                    <>
                      {/* =================================================
                          MAIN GRN ROW
                      ================================================== */}

                      <tr
                        key={
                          purchase.id
                        }
                        style={{
                          background:
                            isExpanded
                              ? "#f0fdf4"
                              : index %
                                  2 ===
                                0
                              ? "#ffffff"
                              : "#f8fafc",
                        }}
                      >
                        {/* NUMBER */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "center",
                          }}
                        >
                          {index + 1}
                        </td>

                        {/* GRN */}

                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 700,
                            color:
                              "#14532d",
                          }}
                        >
                          {purchase.purchaseNo}
                        </td>

                        {/* DATE */}

                        <td
                          style={tdStyle}
                        >
                          {purchase.purchaseDate}
                        </td>

                        {/* INVOICE */}

                        <td
                          style={tdStyle}
                        >
                          {purchase.invoiceNo ||
                            "-"}
                        </td>

                        {/* SUPPLIER */}

                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                          }}
                        >
                          {purchase.supplierCode
                            ? `${purchase.supplierCode} - ${purchase.supplierName}`
                            : purchase.supplierName ||
                              "-"}
                        </td>

                        {/* PRODUCT COUNT */}

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
                              minWidth:
                                "28px",
                              padding:
                                "3px 7px",
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
                            {items.length}
                          </span>
                        </td>

                        {/* TOTAL QTY */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                            fontWeight: 600,
                          }}
                        >
                          {totalQty.toFixed(
                            2
                          )}
                        </td>

                        {/* TOTAL AMOUNT */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          ₹{" "}
                          {totalAmount.toFixed(
                            2
                          )}
                        </td>

                        {/* GST */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          ₹{" "}
                          {totalGst.toFixed(
                            2
                          )}
                        </td>

                        {/* NET */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                            fontWeight: 800,
                            color:
                              "#14532d",
                          }}
                        >
                          ₹{" "}
                          {totalNet.toFixed(
                            2
                          )}
                        </td>

                        {/* ACTION */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "center",
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
                              gap: "5px",
                            }}
                          >
                            {/* EXPAND */}

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
                              style={{
                                padding:
                                  "5px 8px",
                                border:
                                  "none",
                                borderRadius:
                                  "4px",
                                background:
                                  "#0f766e",
                                color:
                                  "#ffffff",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  700,
                                cursor:
                                  "pointer",
                              }}
                            >
                              {isExpanded
                                ? "▲"
                                : "▼"}
                            </button>

                            {/* EDIT GRN */}

                            <button
                              type="button"
                              onClick={() =>
                                onEdit(
                                  purchase
                                )
                              }
                              title="Edit Complete GRN"
                              style={{
                                padding:
                                  "5px 8px",
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
                                fontWeight:
                                  600,
                                cursor:
                                  "pointer",
                              }}
                            >
                              ✏️
                            </button>

                            {/* DELETE GRN */}

                            <button
                              type="button"
                              onClick={() =>
                                onDelete(
                                  purchase.id
                                )
                              }
                              title="Delete Complete GRN"
                              style={{
                                padding:
                                  "5px 8px",
                                border:
                                  "none",
                                borderRadius:
                                  "4px",
                                background:
                                  "#dc2626",
                                color:
                                  "#ffffff",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  600,
                                cursor:
                                  "pointer",
                              }}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* =================================================
                          EXPANDED PRODUCT DETAILS
                          PART 2 CONTINUES HERE
                      ================================================== */}
                      {isExpanded && (
                        <tr
                          key={`${purchase.id}-details`}
                        >
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
                                padding: "14px 18px",
                                background: "#f8fafc",
                              }}
                            >
                              {/* =========================================
                                  PRODUCT DETAILS HEADER
                              ========================================== */}

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems: "center",
                                  marginBottom: "10px",
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

                              {/* =========================================
                                  PRODUCT DETAIL TABLE
                              ========================================== */}

                              <div
                                style={{
                                  width: "100%",
                                  overflowX: "auto",
                                  border:
                                    "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  background: "#ffffff",
                                }}
                              >
                                <table
                                  style={{
                                    width: "100%",
                                    minWidth: "900px",
                                    borderCollapse:
                                      "collapse",
                                    fontSize: "11px",
                                  }}
                                >
                                  <thead>
                                    <tr
                                      style={{
                                        background:
                                          "#166534",
                                        color:
                                          "#ffffff",
                                      }}
                                    >
                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "45px",
                                          textAlign:
                                            "center",
                                        }}
                                      >
                                        #
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          minWidth:
                                            "190px",
                                        }}
                                      >
                                        Product
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "100px",
                                        }}
                                      >
                                        HSN
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "80px",
                                        }}
                                      >
                                        Unit
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "80px",
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        Qty
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "100px",
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        Rate
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "110px",
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        Amount
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "70px",
                                          textAlign:
                                            "center",
                                        }}
                                      >
                                        GST
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "110px",
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        GST Amount
                                      </th>

                                      <th
                                        style={{
                                          ...detailThStyle,
                                          width: "120px",
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        Net Amount
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {items.map(
                                      (
                                        item,
                                        itemIndex
                                      ) => (
                                        <tr
                                          key={`${purchase.id}-${item.productCode}-${itemIndex}`}
                                          style={{
                                            background:
                                              itemIndex %
                                                2 ===
                                              0
                                                ? "#ffffff"
                                                : "#f9fafb",
                                          }}
                                        >
                                          {/* # */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign:
                                                "center",
                                              fontWeight:
                                                600,
                                            }}
                                          >
                                            {itemIndex +
                                              1}
                                          </td>

                                          {/* PRODUCT */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              fontWeight:
                                                600,
                                              color:
                                                "#374151",
                                            }}
                                          >
                                            <div
                                              style={{
                                                display:
                                                  "flex",
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
                                                  fontSize:
                                                    "10px",
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

                                          {/* HSN */}

                                          <td
                                            style={
                                              detailTdStyle
                                            }
                                          >
                                            {item.hsn}
                                          </td>

                                          {/* UNIT */}

                                          <td
                                            style={
                                              detailTdStyle
                                            }
                                          >
                                            {item.unit}
                                          </td>

                                          {/* QTY */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign:
                                                "right",
                                              fontWeight:
                                                600,
                                            }}
                                          >
                                            {Number(
                                              item.qty
                                            ).toFixed(
                                              2
                                            )}
                                          </td>

                                          {/* RATE */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign:
                                                "right",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.rate
                                            ).toFixed(
                                              2
                                            )}
                                          </td>

                                          {/* AMOUNT */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign:
                                                "right",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.amount
                                            ).toFixed(
                                              2
                                            )}
                                          </td>

                                          {/* GST */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign:
                                                "center",
                                            }}
                                          >
                                            {Number(
                                              item.gst
                                            ).toFixed(
                                              2
                                            )}
                                            %
                                          </td>

                                          {/* GST AMOUNT */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
                                              textAlign:
                                                "right",
                                            }}
                                          >
                                            ₹{" "}
                                            {Number(
                                              item.gstAmount
                                            ).toFixed(
                                              2
                                            )}
                                          </td>

                                          {/* NET AMOUNT */}

                                          <td
                                            style={{
                                              ...detailTdStyle,
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
                                              item.netAmount
                                            ).toFixed(
                                              2
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                  {/* =====================================
                                      DETAILS TOTAL
                                  ====================================== */}

                                  <tfoot>
                                    <tr
                                      style={{
                                        background:
                                          "#ecfdf5",
                                        fontWeight: 700,
                                      }}
                                    >
                                      <td
                                        colSpan={4}
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                          color:
                                            "#14532d",
                                        }}
                                      >
                                        GRN Total
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                          color:
                                            "#14532d",
                                        }}
                                      >
                                        {totalQty.toFixed(
                                          2
                                        )}
                                      </td>

                                      <td
                                        style={
                                          detailTdStyle
                                        }
                                      >
                                        -
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        ₹{" "}
                                        {totalAmount.toFixed(
                                          2
                                        )}
                                      </td>

                                      <td
                                        style={
                                          detailTdStyle
                                        }
                                      >
                                        -
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        ₹{" "}
                                        {totalGst.toFixed(
                                          2
                                        )}
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                          color:
                                            "#14532d",
                                          fontWeight:
                                            800,
                                        }}
                                      >
                                        ₹{" "}
                                        {totalNet.toFixed(
                                          2
                                        )}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>

      {/* =================================================
          REGISTER SUMMARY
      ================================================== */}

      {filteredPurchases.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginTop: "12px",
            padding: "10px 12px",
            background: "#f0fdf4",
            border:
              "1px solid #bbf7d0",
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
            Showing{" "}
            {filteredPurchases.length}{" "}
            of {purchases.length} GRN
            records
          </span>

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              style={{
                border: "none",
                background:
                  "transparent",
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

/* =====================================================
   MAIN TABLE HEADER STYLE
===================================================== */

const thStyle: React.CSSProperties = {
  padding: "10px 7px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  borderBottom:
    "2px solid #0b3d20",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* =====================================================
   MAIN TABLE DATA STYLE
===================================================== */

const tdStyle: React.CSSProperties = {
  padding: "9px 7px",
  borderBottom:
    "1px solid #e5e7eb",
  fontSize: "11px",
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* =====================================================
   PRODUCT DETAIL HEADER STYLE
===================================================== */

const detailThStyle: React.CSSProperties = {
  padding: "8px 7px",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 700,
  borderBottom:
    "1px solid #14532d",
  whiteSpace: "nowrap",
};

/* =====================================================
   PRODUCT DETAIL DATA STYLE
===================================================== */

const detailTdStyle: React.CSSProperties = {
  padding: "8px 7px",
  borderBottom:
    "1px solid #e5e7eb",
  fontSize: "10px",
  color: "#374151",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
};