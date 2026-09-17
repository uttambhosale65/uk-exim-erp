"use client";

import { useEffect, useState } from "react";

import {
  loadInternationalExportStock,
  saveInternationalExportStock,
} from "./InternationalExportStockStorage";

import {
  InternationalExportStock,
} from "./InternationalExportStockTypes";

import InternationalExportStockForm from "./InternationalExportStockForm";

export default function InternationalExportStockMaster() {
  const [stock, setStock] =
    useState<InternationalExportStock[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingStock, setEditingStock] =
    useState<InternationalExportStock | null>(null);

  const loadStockData = () => {
    const data =
      loadInternationalExportStock();

    setStock(data);
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const handleAddStock = () => {
    setEditingStock(null);
    setShowForm(true);
  };

  const handleEditStock = (
    item: InternationalExportStock
  ) => {
    setEditingStock(item);
    setShowForm(true);
  };

  const handleDeleteStock = (
    item: InternationalExportStock
  ) => {
    const confirmed = window.confirm(
      `Delete International Export Stock?\n\nProduct: ${item.productName}\nLot / Batch: ${item.lotBatchNo}\nAvailable: ${formatQty(item.availableQty)} ${item.unit}`
    );

    if (!confirmed) return;

    const currentStock =
      loadInternationalExportStock();

    const updatedStock =
      currentStock.filter(
        (stockItem) =>
          stockItem.id !== item.id
      );

    saveInternationalExportStock(
      updatedStock
    );

    setStock(updatedStock);

    if (
      editingStock?.id === item.id
    ) {
      setEditingStock(null);
      setShowForm(false);
    }
  };

  const handleSaveStock = (
    savedStock: InternationalExportStock
  ) => {
    const currentStock =
      loadInternationalExportStock();

    const existingIndex =
      currentStock.findIndex(
        (item) =>
          item.id === savedStock.id
      );

    let updatedStock:
      InternationalExportStock[];

    if (existingIndex >= 0) {
      updatedStock =
        currentStock.map(
          (item, index) =>
            index === existingIndex
              ? savedStock
              : item
        );
    } else {
      updatedStock = [
        savedStock,
        ...currentStock,
      ];
    }

    saveInternationalExportStock(
      updatedStock
    );

    setStock(updatedStock);

    setEditingStock(null);
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setEditingStock(null);
    setShowForm(false);
  };

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          HEADER
      ================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#14532d",
              fontSize: "20px",
              fontWeight: 900,
            }}
          >
            🌍 International Export Stock
          </h2>

          <div
            style={{
              marginTop: "3px",
              color: "#6b7280",
              fontSize: "10px",
            }}
          >
            Independent stock for export operations
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "7px",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={loadStockData}
            style={{
              border: "1px solid #14532d",
              borderRadius: "6px",
              padding: "7px 10px",
              background: "#ffffff",
              color: "#14532d",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            🔄 Refresh
          </button>

          <button
            type="button"
            onClick={handleAddStock}
            style={{
              border: "none",
              borderRadius: "6px",
              padding: "7px 12px",
              background: "#14532d",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            ➕ Add Stock
          </button>
        </div>
      </div>

      {/* =================================================
          STOCK ENTRY FORM
      ================================================== */}

      {showForm && (
        <div
          style={{
            marginBottom: "12px",
          }}
        >
          <InternationalExportStockForm
            initialData={editingStock}
            onSave={handleSaveStock}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* =================================================
          SUMMARY
      ================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <SummaryCard
          title="Products / Lots"
          value={stock.length}
          icon="📦"
        />

        <SummaryCard
          title="Available"
          value={stock.reduce(
            (total, item) =>
              total +
              Number(
                item.availableQty || 0
              ),
            0
          )}
          icon="🟢"
        />

        <SummaryCard
          title="Reserved"
          value={stock.reduce(
            (total, item) =>
              total +
              Number(
                item.reservedQty || 0
              ),
            0
          )}
          icon="🔒"
        />

        <SummaryCard
          title="Packed"
          value={stock.reduce(
            (total, item) =>
              total +
              Number(
                item.packedQty || 0
              ),
            0
          )}
          icon="📦"
        />

        <SummaryCard
          title="Shipped"
          value={stock.reduce(
            (total, item) =>
              total +
              Number(
                item.shippedQty || 0
              ),
            0
          )}
          icon="🚢"
        />
      </div>

      {/* =================================================
          STOCK TABLE
      ================================================== */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          border:
            "1px solid #e5e7eb",
          boxShadow:
            "0 2px 6px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom:
              "1px solid #e5e7eb",
            color: "#14532d",
            fontSize: "14px",
            fontWeight: 900,
          }}
        >
          📋 International Stock Register
        </div>

        {stock.length === 0 ? (
          <div
            style={{
              padding: "35px 20px",
              textAlign: "center",
              color: "#6b7280",
              fontSize: "11px",
            }}
          >
            No International Export Stock
            records found.

            <div
              style={{
                marginTop: "5px",
                fontSize: "10px",
              }}
            >
              Click{" "}
              <strong>
                ➕ Add Stock
              </strong>{" "}
              to add International Export
              Stock.
            </div>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: "1050px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f0fdf4",
                  }}
                >
                  <th
                    style={thStyle}
                  >
                    Product
                  </th>

                  <th
                    style={thStyle}
                  >
                    Lot / Batch
                  </th>

                  <th
                    style={thStyle}
                  >
                    Source
                  </th>

                  <th
                    style={thStyle}
                  >
                    Purchase Ref.
                  </th>

                  <th
                    style={thStyle}
                  >
                    Available
                  </th>

                  <th
                    style={thStyle}
                  >
                    Reserved
                  </th>

                  <th
                    style={thStyle}
                  >
                    Packed
                  </th>

                  <th
                    style={thStyle}
                  >
                    Loaded
                  </th>

                  <th
                    style={thStyle}
                  >
                    Shipped
                  </th>

                  <th
                    style={thStyle}
                  >
                    Unit
                  </th>

                  <th
                    style={thStyle}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {stock.map(
                  (item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderTop:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {/* Product */}
                      <td
                        style={tdStyle}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: "#374151",
                          }}
                        >
                          {
                            item.productName
                          }
                        </div>

                        <div
                          style={{
                            marginTop: "2px",
                            fontSize: "9px",
                            color: "#6b7280",
                          }}
                        >
                          {
                            item.productCode
                          }
                        </div>
                      </td>

                      {/* Lot */}
                      <td
                        style={tdStyle}
                      >
                        {item.lotBatchNo ||
                          "—"}
                      </td>

                      {/* Source */}
                      <td
                        style={tdStyle}
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "3px 7px",
                            borderRadius:
                              "999px",
                            background:
                              item.source ===
                              "Purchase"
                                ? "#eff6ff"
                                : "#f9fafb",
                            color:
                              item.source ===
                              "Purchase"
                                ? "#175cd3"
                                : "#475467",
                            fontSize: "9px",
                            fontWeight: 800,
                          }}
                        >
                          {item.source ||
                            "Opening Stock"}
                        </span>
                      </td>

                      {/* Purchase Reference */}
                      <td
                        style={{
                          ...tdStyle,
                          color:
                            item.purchaseReference
                              ? "#175cd3"
                              : "#98a2b3",
                        }}
                      >
                        {item.purchaseReference ||
                          "—"}
                      </td>

                      {/* Available */}
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 800,
                          color: "#15803d",
                        }}
                      >
                        {formatQty(
                          item.availableQty
                        )}
                      </td>

                      {/* Reserved */}
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 800,
                          color: "#b45309",
                        }}
                      >
                        {formatQty(
                          item.reservedQty
                        )}
                      </td>

                      {/* Packed */}
                      <td
                        style={tdStyle}
                      >
                        {formatQty(
                          item.packedQty
                        )}
                      </td>

                      {/* Loaded */}
                      <td
                        style={tdStyle}
                      >
                        {formatQty(
                          item.loadedQty
                        )}
                      </td>

                      {/* Shipped */}
                      <td
                        style={tdStyle}
                      >
                        {formatQty(
                          item.shippedQty
                        )}
                      </td>

                      {/* Unit */}
                      <td
                        style={tdStyle}
                      >
                        {item.unit}
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          ...tdStyle,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleEditStock(
                              item
                            )
                          }
                          style={
                            editButtonStyle
                          }
                        >
                          ✏️ Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteStock(
                              item
                            )
                          }
                          style={
                            deleteButtonStyle
                          }
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          INFORMATION NOTE
      ================================================== */}

      <div
        style={{
          marginTop: "10px",
          padding: "9px 11px",
          borderRadius: "7px",
          background: "#f0fdf4",
          border:
            "1px solid #bbf7d0",
          color: "#166534",
          fontSize: "10px",
          lineHeight: 1.5,
        }}
      >
        <strong>
          Stock Safety:
        </strong>{" "}
        This International Export Stock is
        completely separate from Domestic
        Stock. Export Order creation does not
        reduce this stock. Stock Reservation
        will be handled in the next stage.
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border:
          "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "9px 10px",
        boxShadow:
          "0 2px 6px rgba(0,0,0,0.05)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "9px",
          fontWeight: 700,
        }}
      >
        {icon} {title}
      </div>

      <div
        style={{
          marginTop: "5px",
          color: "#14532d",
          fontSize: "18px",
          fontWeight: 900,
          lineHeight: 1.1,
          fontVariantNumeric:
            "tabular-nums",
        }}
      >
        {Number(
          value || 0
        ).toLocaleString(
          "en-IN",
          {
            maximumFractionDigits: 3,
          }
        )}
      </div>
    </div>
  );
}

/* =========================================================
   TABLE STYLES
========================================================= */

const thStyle: React.CSSProperties = {
  padding: "8px 9px",
  textAlign: "left",
  fontSize: "9px",
  fontWeight: 800,
  color: "#374151",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 9px",
  fontSize: "10px",
  color: "#374151",
  whiteSpace: "nowrap",
};

/* =========================================================
   ACTION BUTTON STYLES
========================================================= */

const editButtonStyle: React.CSSProperties = {
  border: "1px solid #d0d5dd",
  borderRadius: "5px",
  padding: "4px 7px",
  background: "#ffffff",
  color: "#344054",
  cursor: "pointer",
  fontSize: "9px",
  fontWeight: 700,
  marginRight: "5px",
};

const deleteButtonStyle: React.CSSProperties = {
  border: "1px solid #fecdca",
  borderRadius: "5px",
  padding: "4px 7px",
  background: "#fff5f4",
  color: "#b42318",
  cursor: "pointer",
  fontSize: "9px",
  fontWeight: 700,
};

/* =========================================================
   QUANTITY FORMAT
========================================================= */

function formatQty(
  value: number
): string {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 3,
    }
  );
}