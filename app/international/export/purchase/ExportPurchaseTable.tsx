"use client";

import { useMemo, useState } from "react";
import { ExportPurchase } from "./ExportPurchaseTypes";

type ExportPurchaseTableProps = {
  purchases: ExportPurchase[];
  onEdit: (purchase: ExportPurchase) => void;
  onDelete: (purchase: ExportPurchase) => void;
};

const displayDate = (value: string) => {
  const [y, m, d] = String(value || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
};

export default function ExportPurchaseTable({
  purchases,
  onEdit,
  onDelete,
}: ExportPurchaseTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...purchases]
      .sort((a, b) =>
        b.purchaseNo.localeCompare(a.purchaseNo)
      )
      .filter((purchase) => {
        if (!term) return true;

        return [
          purchase.purchaseNo,
          purchase.purchaseDate,
          purchase.supplierCode,
          purchase.supplierName,
          purchase.contactPerson,
          purchase.supplierInvoiceNo,
          purchase.currency,
          purchase.status,
          ...purchase.items.map(
            (item) =>
              `${item.productCode} ${item.productName} ${item.lotBatchNo} ${item.unit}`
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [purchases, search]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search Purchase No, Supplier, Invoice, Product, Lot..."
          style={{
            width: "min(420px, 100%)",
            padding: "7px 9px",
            border:
              "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "10px",
          }}
        />

        <div
          style={{
            fontSize: "10px",
            color: "#6b7280",
            alignSelf: "center",
          }}
        >
          {filtered.length} record(s)
        </div>
      </div>

      <div
        style={{
          overflowX: "auto",
          border:
            "1px solid #e5e7eb",
          borderRadius: "7px",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "1450px",
            borderCollapse:
              "collapse",
            fontSize: "9px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f3f4f6",
              }}
            >
              {[
                "Purchase No.",
                "Date",
                "Supplier",
                "Contact",
                "Supplier Invoice",
                "Products / Lots",
                "Currency",
                "Goods Value",
                "Purchase Value",
                "Received Qty",
                "Pending Qty",
                "Status",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  style={{
                    padding: "7px 6px",
                    borderBottom:
                      "1px solid #e5e7eb",
                    textAlign: "left",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No Export Purchase
                  records found.
                </td>
              </tr>
            ) : (
              filtered.map(
                (purchase) => {
                  const totalPurchaseQty =
                    purchase.items.reduce(
                      (total, item) =>
                        total +
                        Number(
                          item.qty || 0
                        ),
                      0
                    );

                  const totalReceivedQty =
                    purchase.items.reduce(
                      (total, item) =>
                        total +
                        Number(
                          item.receivedQty ||
                            0
                        ),
                      0
                    );

                  const totalPendingQty =
                    Math.max(
                      0,
                      totalPurchaseQty -
                        totalReceivedQty
                    );

                  return (
                    <tr
                      key={purchase.id}
                    >
                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          fontWeight: 800,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {purchase.purchaseNo}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {displayDate(
                          purchase.purchaseDate
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >
                        {purchase.supplierCode}{" "}
                        —{" "}
                        {purchase.supplierName}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >
                        {purchase.contactPerson ||
                          "-"}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >
                        {purchase.supplierInvoiceNo ||
                          "-"}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >
                        {purchase.items.map(
                          (item) => (
                            <div
                              key={`${item.productCode}-${item.lotBatchNo}`}
                              style={{
                                marginBottom:
                                  "3px",
                              }}
                            >
                              <strong>
                                {
                                  item.productCode
                                }
                              </strong>{" "}
                              —{" "}
                              {
                                item.productName
                              }{" "}
                              —{" "}
                              {Number(
                                item.qty || 0
                              ).toFixed(3)}{" "}
                              {item.unit}{" "}
                              —{" "}
                              {
                                item.lotBatchNo
                              }

                              <div
                                style={{
                                  fontSize:
                                    "8px",
                                  color:
                                    "#6b7280",
                                  marginTop:
                                    "1px",
                                }}
                              >
                                Received:{" "}
                                {Number(
                                  item.receivedQty ||
                                    0
                                ).toFixed(3)}{" "}
                                {item.unit}
                              </div>
                            </div>
                          )
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                        }}
                      >
                        {purchase.currency}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          textAlign:
                            "right",
                        }}
                      >
                        {Number(
                          purchase.totalGoodsValue ||
                            0
                        ).toFixed(2)}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          textAlign:
                            "right",
                          fontWeight: 800,
                        }}
                      >
                        {Number(
                          purchase.totalPurchaseValue ||
                            0
                        ).toFixed(2)}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          fontWeight: 800,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {totalReceivedQty.toFixed(
                          3
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          fontWeight: 800,
                          color:
                            totalPendingQty >
                            0
                              ? "#b45309"
                              : "#166534",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {totalPendingQty.toFixed(
                          3
                        )}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {purchase.status}
                      </td>

                      <td
                        style={{
                          padding:
                            "7px 6px",
                          borderBottom:
                            "1px solid #f1f5f9",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onEdit(
                              purchase
                            )
                          }
                          style={{
                            marginRight:
                              "4px",
                            border:
                              "1px solid #bbf7d0",
                            borderRadius:
                              "4px",
                            padding:
                              "4px 6px",
                            background:
                              "#f0fdf4",
                            color:
                              "#166534",
                            cursor:
                              "pointer",
                            fontSize:
                              "8px",
                            fontWeight: 800,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onDelete(
                              purchase
                            )
                          }
                          style={{
                            border:
                              "1px solid #fecaca",
                            borderRadius:
                              "4px",
                            padding:
                              "4px 6px",
                            background:
                              "#fef2f2",
                            color:
                              "#b91c1c",
                            cursor:
                              "pointer",
                            fontSize:
                              "8px",
                            fontWeight: 800,
                          }}
                        >
                          Delete
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
    </div>
  );
}