"use client";

import { useState } from "react";
import { Product } from "./ProductTypes";

type ProductTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
};

export default function ProductTable({
  products,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(
    (item) =>
      item.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.code
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.category
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.hsn
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const getStockStatus = (item: Product) => {
    if (item.stock <= 0) {
      return {
        text: "Out of Stock",
        background: "#fee2e2",
        color: "#b91c1c",
      };
    }

    if (item.stock <= item.minimumStock) {
      return {
        text: "Low Stock",
        background: "#fef3c7",
        color: "#b45309",
      };
    }

    return {
      text: "In Stock",
      background: "#dcfce7",
      color: "#15803d",
    };
  };

  const thStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "7px 5px",
    background: "#14532d",
    color: "#ffffff",
    textAlign: "center",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "normal",
    lineHeight: "13px",
  };

  const tdStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "6px 4px",
    fontSize: "10px",
    color: "#1f2937",
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div
      style={{
        marginTop: "20px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        background: "#ffffff",
        padding: "15px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        overflow: "hidden",
      }}
    >
      {/* ============================
          REGISTER HEADER
      ============================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          marginBottom: "12px",
          width: "100%",
        }}
      >
        <div>
          <h2
            style={{
              color: "#14532d",
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            📋 Product Register
          </h2>

          <div
            style={{
              marginTop: "3px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Total Products:{" "}
            <strong>
              {filteredProducts.length}
            </strong>
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Product / Code / HSN"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "280px",
            maxWidth: "35%",
            height: "36px",
            padding: "0 10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "12px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* ============================
          TABLE
      ============================= */}

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
        }}
      >
        <table
          style={{
            width: "100%",
            maxWidth: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            background: "#ffffff",
          }}
        >
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={thStyle}>Code</th>

              <th style={thStyle}>Product</th>

              <th style={thStyle}>Category</th>

              <th style={thStyle}>HSN</th>

              <th style={thStyle}>GST</th>

              <th style={thStyle}>UOM</th>

              <th style={thStyle}>Net Wt.</th>

              <th style={thStyle}>Purchase</th>

              <th style={thStyle}>Sale</th>

              <th style={thStyle}>MRP</th>

              <th style={thStyle}>Opening</th>

              <th style={thStyle}>Min Stock</th>

              <th style={thStyle}>Stock Status</th>

              <th style={thStyle}>Status</th>

              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map(
              (item, index) => {
                const stockStatus =
                  getStockStatus(item);

                return (
                  <tr
                    key={item.id}
                    style={{
                      background:
                        index % 2 === 0
                          ? "#ffffff"
                          : "#f9fafb",
                    }}
                  >
                    {/* CODE */}

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 700,
                        color: "#14532d",
                      }}
                      title={item.code}
                    >
                      {item.code}
                    </td>

                    {/* PRODUCT */}

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </td>

                    {/* CATEGORY */}

                    <td
                      style={tdStyle}
                      title={item.category}
                    >
                      {item.category}
                    </td>

                    {/* HSN */}

                    <td style={tdStyle}>
                      {item.hsn}
                    </td>

                    {/* GST */}

                    <td style={tdStyle}>
                      {item.gst}
                    </td>

                    {/* UOM */}

                    <td style={tdStyle}>
                      {item.unit}
                    </td>

                    {/* NET WEIGHT */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                      }}
                    >
                      {item.netWeight}
                    </td>

                    {/* PURCHASE */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                      }}
                    >
                      ₹{item.purchase.toFixed(2)}
                    </td>

                    {/* SALE */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                      }}
                    >
                      ₹{item.sale.toFixed(2)}
                    </td>

                    {/* MRP */}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      ₹{item.mrp.toFixed(2)}
                    </td>

                    {/* OPENING */}

                    <td style={tdStyle}>
                      {item.stock}
                    </td>

                    {/* MIN STOCK */}

                    <td style={tdStyle}>
                      {item.minimumStock}
                    </td>

                    {/* STOCK STATUS */}

                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          background:
                            stockStatus.background,
                          color:
                            stockStatus.color,
                          padding: "3px 5px",
                          borderRadius: "12px",
                          fontSize: "9px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stockStatus.text}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 5px",
                          borderRadius: "12px",
                          fontSize: "9px",
                          fontWeight: 700,
                          background:
                            item.active
                              ? "#dcfce7"
                              : "#f3f4f6",
                          color:
                            item.active
                              ? "#15803d"
                              : "#6b7280",
                        }}
                      >
                        {item.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td
                      style={{
                        ...tdStyle,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(item)
                        }
                        style={{
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "9px",
                          fontWeight: 600,
                          marginRight: "3px",
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete "${item.name}"?`
                            )
                          ) {
                            onDelete(item.id);
                          }
                        }}
                        style={{
                          background: "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "9px",
                          fontWeight: 600,
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>

        {/* NO DATA */}

        {filteredProducts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "30px",
              color: "#6b7280",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            📦 No Products Found
          </div>
        )}
      </div>
    </div>
  );
}