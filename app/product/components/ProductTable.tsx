"use client";

import { useEffect, useState } from "react";

import { Product } from "./ProductTypes";
import { loadStock } from "../../components/stock/StockStorage";

type ProductTableProps = {
  products: Product[];

  onEdit: (
    product: Product
  ) => void;

  onDelete: (
    id: string
  ) => void | Promise<void>;
};

export default function ProductTable({
  products,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const [
    search,
    setSearch,
  ] = useState("");

  /*
  =====================================================
  LIVE STOCK FROM STOCK MASTER

  Product Register मध्ये stock नेहमी
  Stock Master मधील currentStock मधून दाखवला जाईल.
  =====================================================
  */

  const [
    stockData,
    setStockData,
  ] = useState(() =>
    loadStock()
  );
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const handleView = async (productId: string) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Product details could not be loaded.");
      setViewingProduct(body.product as Product);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Product details could not be loaded.");
      setViewingProduct(null);
    } finally {
      setDetailLoading(false);
    }
  };

  /*
  =====================================================
  REFRESH STOCK
  =====================================================
  */

  useEffect(() => {
    setStockData(
      loadStock()
    );

    const handleStockUpdate = () => {
      setStockData(
        loadStock()
      );
    };

    window.addEventListener(
      "stock-updated",
      handleStockUpdate
    );

    window.addEventListener(
      "storage",
      handleStockUpdate
    );

    return () => {
      window.removeEventListener(
        "stock-updated",
        handleStockUpdate
      );

      window.removeEventListener(
        "storage",
        handleStockUpdate
      );
    };
  }, []);

  /*
  =====================================================
  GET LIVE STOCK
  =====================================================
  */

  const getLiveStock = (
    product: Product
  ) => {
    const stockItem =
      stockData.find(
        (stockRow) =>
          String(
            stockRow?.productCode || ""
          ).trim() ===
          String(
            product?.code || ""
          ).trim()
      );

    return {
      quantity:
        Number(
          stockItem?.currentStock ?? 0
        ),

      unit:
        stockItem?.unit ||
        product.unit,
    };
  };

  /*
  =====================================================
  SEARCH
  =====================================================
  */

  const filteredProducts =
    products.filter(
      (item) =>
        item.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        item.code
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        item.category
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        item.hsn
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  /*
  =====================================================
  STOCK STATUS
  =====================================================
  */

  const getStockStatus = (
    item: Product
  ) => {
    const liveStock =
      getLiveStock(item);

    const currentStock =
      liveStock.quantity;

    if (
      currentStock <= 0
    ) {
      return {
        text: "Out of Stock",
        background:
          "#fee2e2",
        color:
          "#b91c1c",
      };
    }

    if (
      currentStock <=
      Number(
        item.minimumStock || 0
      )
    ) {
      return {
        text: "Low Stock",
        background:
          "#fef3c7",
        color:
          "#b45309",
      };
    }

    return {
      text: "In Stock",
      background:
        "#dcfce7",
      color:
        "#15803d",
    };
  };

  /*
  =====================================================
  STYLES
  =====================================================
  */

  const thStyle: React.CSSProperties =
    {
      border:
        "1px solid #d1d5db",

      padding:
        "6px 3px",

      background:
        "#14532d",

      color:
        "#ffffff",

      textAlign:
        "center",

      fontSize:
        "9px",

      fontWeight:
        700,

      whiteSpace:
        "normal",

      lineHeight:
        "12px",

      overflow:
        "hidden",

      wordBreak:
        "break-word",
    };

  const tdStyle: React.CSSProperties =
    {
      border:
        "1px solid #d1d5db",

      padding:
        "5px 3px",

      fontSize:
        "9px",

      color:
        "#1f2937",

      textAlign:
        "center",

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

  /*
  =====================================================
  PAGE
  =====================================================
  */

  return (
    <div
      style={{
        marginTop:
          "20px",

        width:
          "100%",

        maxWidth:
          "100%",

        minWidth:
          0,

        boxSizing:
          "border-box",

        background:
          "#ffffff",

        padding:
          "15px",

        borderRadius:
          "10px",

        boxShadow:
          "0 2px 8px rgba(0,0,0,0.12)",

        overflowX:
          "hidden",
      }}
    >
      {/* REGISTER HEADER */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "10px",

          marginBottom:
            "12px",

          width:
            "100%",

          minWidth:
            0,

          flexWrap:
            "wrap",
        }}
      >
        <div
          style={{
            minWidth:
              0,
            flex:
              "1 1 220px",
          }}
        >
          <h2
            style={{
              color:
                "#14532d",

              margin: 0,

              fontSize:
                "18px",

              fontWeight:
                700,
            }}
          >
            📋 Product Register
          </h2>

          <div
            style={{
              marginTop:
                "3px",

              fontSize:
                "12px",

              color:
                "#6b7280",
            }}
          >
            Total Products:{" "}
            <strong>
              {
                filteredProducts.length
              }
            </strong>
          </div>
        </div>

        {/* SEARCH */}

        <input
          type="text"
          placeholder="🔍 Search Product / Code / HSN"
          value={
            search
          }
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          style={{
            width:
              "280px",

            maxWidth:
              "100%",

            flex:
              "0 1 280px",

            height:
              "36px",

            padding:
              "0 10px",

            border:
              "1px solid #d1d5db",

            borderRadius:
              "6px",

            fontSize:
              "12px",

            outline:
              "none",

            boxSizing:
              "border-box",

            minWidth:
              0,
          }}
        />
      </div>

      {/* TABLE */}

      <div
        style={{
          width:
            "100%",

          maxWidth:
            "100%",

          minWidth:
            0,

          overflowX:
            "hidden",

          border:
            "1px solid #d1d5db",

          borderRadius:
            "6px",

          boxSizing:
            "border-box",
        }}
      >
        <table
          style={{
            width:
              "100%",

            maxWidth:
              "100%",

            tableLayout:
              "fixed",

            borderCollapse:
              "collapse",

            background:
              "#ffffff",

            boxSizing:
              "border-box",
          }}
        >
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={thStyle}>
                Code
              </th>

              <th style={thStyle}>
                Product
              </th>

              <th style={thStyle}>
                Category
              </th>

              <th style={thStyle}>
                HSN
              </th>

              <th style={thStyle}>
                GST
              </th>

              <th style={thStyle}>
                UOM
              </th>

              <th style={thStyle}>
                Net Wt.
              </th>

              <th style={thStyle}>
                Base Cost
              </th>

              <th style={thStyle}>
                Packing
              </th>

              <th style={thStyle}>
                Other
              </th>

              <th style={thStyle}>
                Total Cost
              </th>

              <th style={thStyle}>
                Sale
              </th>

              <th style={thStyle}>
                MRP
              </th>

              <th style={thStyle}>
                Stock
              </th>

              <th style={thStyle}>
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map(
              (
                item,
                index
              ) => {
                const liveStock =
                  getLiveStock(
                    item
                  );

                const stockStatus =
                  getStockStatus(
                    item
                  );

                return (
                  <tr
                    key={
                      item.id
                    }
                    style={{
                      background:
                        index %
                          2 ===
                        0
                          ? "#ffffff"
                          : "#f9fafb",
                    }}
                  >
                    {/* CODE */}

                    <td
                      style={{
                        ...tdStyle,

                        fontWeight:
                          700,

                        color:
                          "#14532d",
                      }}
                      title={
                        item.code
                      }
                    >
                      {
                        item.code
                      }
                    </td>

                    {/* PRODUCT */}

                    <td
                      style={{
                        ...tdStyle,

                        fontWeight:
                          600,

                        textAlign:
                          "left",
                      }}
                      title={
                        item.name
                      }
                    >
                      {
                        item.name
                      }
                    </td>

                    {/* CATEGORY */}

                    <td
                      style={tdStyle}
                      title={
                        item.category
                      }
                    >
                      {
                        item.category
                      }
                    </td>

                    {/* HSN */}

                    <td
                      style={tdStyle}
                    >
                      {
                        item.hsn
                      }
                    </td>

                    {/* GST */}

                    <td
                      style={tdStyle}
                    >
                      {
                        item.gst
                      }
                    </td>

                    {/* UOM */}

                    <td
                      style={{
                        ...tdStyle,

                        fontWeight:
                          700,
                      }}
                    >
                      {
                        item.unit
                      }
                    </td>

                    {/* NET WEIGHT */}

                    <td
                      style={{
                        ...tdStyle,

                        textAlign:
                          "right",
                      }}
                    >
                      {
                        item.netWeight
                      }

                      {item.netWeight >
                      0
                        ? " g"
                        : ""}
                    </td>

                    {/* BASE COST */}

                    <td
                      style={{
                        ...tdStyle,

                        textAlign:
                          "right",
                      }}
                    >
                      ₹
                      {Number(
                        item.baseCost ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    {/* PACKING */}

                    <td
                      style={{
                        ...tdStyle,

                        textAlign:
                          "right",
                      }}
                    >
                      ₹
                      {Number(
                        item.packingCost ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    {/* OTHER */}

                    <td
                      style={{
                        ...tdStyle,

                        textAlign:
                          "right",
                      }}
                    >
                      ₹
                      {Number(
                        item.otherCharges ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    {/* TOTAL COST */}

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
                      ₹
                      {Number(
                        item.totalCost ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    {/* SALE */}

                    <td
                      style={{
                        ...tdStyle,

                        textAlign:
                          "right",
                      }}
                    >
                      ₹
                      {Number(
                        item.sale ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    {/* MRP */}

                    <td
                      style={{
                        ...tdStyle,

                        textAlign:
                          "right",

                        fontWeight:
                          600,
                      }}
                    >
                      ₹
                      {Number(
                        item.mrp ||
                          0
                      ).toFixed(
                        2
                      )}
                    </td>

                    {/* LIVE STOCK */}

                    <td
                      style={tdStyle}
                    >
                      <div
                        style={{
                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",
                        }}
                        title={`${liveStock.quantity} ${liveStock.unit}`}
                      >
                        <strong>
                          {
                            liveStock.quantity
                          }
                        </strong>{" "}
                        {
                          liveStock.unit
                        }
                      </div>

                      <span
                        style={{
                          display:
                            "inline-block",

                          marginTop:
                            "3px",

                          maxWidth:
                            "100%",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          background:
                            stockStatus.background,

                          color:
                            stockStatus.color,

                          padding:
                            "2px 4px",

                          borderRadius:
                            "10px",

                          fontSize:
                            "7px",

                          fontWeight:
                            700,

                          whiteSpace:
                            "nowrap",

                          boxSizing:
                            "border-box",
                        }}
                      >
                        {
                          stockStatus.text
                        }
                      </span>
                    </td>

                    {/* ACTION */}

                    <td
                      style={{
                        ...tdStyle,

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`View ${item.name}`}
                        title="View details"
                        onClick={() => void handleView(item.id)}
                        style={{
                          background: "#0f766e",
                          color: "#ffffff",
                          border: "none",
                          padding: "4px 6px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "9px",
                          marginRight: "2px",
                          minWidth: "24px",
                        }}
                      >
                        ℹ
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(
                            item
                          )
                        }
                        style={{
                          background:
                            "#2563eb",

                          color:
                            "#ffffff",

                          border:
                            "none",

                          padding:
                            "4px 6px",

                          borderRadius:
                            "4px",

                          cursor:
                            "pointer",

                          fontSize:
                            "9px",

                          fontWeight:
                            600,

                          marginRight:
                            "2px",

                          minWidth:
                            "24px",
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
                            void Promise.resolve(onDelete(item.id)).catch(() => {});
                          }
                        }}
                        style={{
                          background:
                            "#dc2626",

                          color:
                            "#ffffff",

                          border:
                            "none",

                          padding:
                            "4px 6px",

                          borderRadius:
                            "4px",

                          cursor:
                            "pointer",

                          fontSize:
                            "9px",

                          fontWeight:
                            600,

                          minWidth:
                            "24px",
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

        {filteredProducts.length ===
          0 && (
          <div
            style={{
              textAlign:
                "center",

              padding:
                "30px",

              color:
                "#6b7280",

              fontWeight:
                600,

              fontSize:
                "14px",
            }}
          >
            📦 No Products Found
          </div>
        )}
      </div>

      {(viewingProduct || detailLoading || detailError) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.55)",
          }}
        >
          <section style={{ width: "min(640px, 100%)", maxHeight: "85vh", overflowY: "auto", background: "#ffffff", borderRadius: "12px", padding: "22px", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <h2 id="product-detail-title" style={{ margin: 0, color: "#14532d" }}>Product Details</h2>
              <button type="button" onClick={() => { setViewingProduct(null); setDetailError(""); }} aria-label="Close product details">Close</button>
            </div>
            {detailLoading && <p>Loading product details…</p>}
            {detailError && <p role="alert" style={{ color: "#b91c1c" }}>{detailError}</p>}
            {viewingProduct && (
              <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px 18px", marginTop: "18px" }}>
                {([
                  ["Product ID", viewingProduct.id],
                  ["Code", viewingProduct.code],
                  ["Name", viewingProduct.name],
                  ["Category", viewingProduct.category],
                  ["HSN", viewingProduct.hsn],
                  ["GST", viewingProduct.gst],
                  ["Unit", viewingProduct.unit],
                  ["Net weight", viewingProduct.netWeight],
                  ["Stock base code", viewingProduct.stockBaseCode || "—"],
                  ["Purchase", viewingProduct.purchase],
                  ["Sale", viewingProduct.sale],
                  ["MRP", viewingProduct.mrp],
                  ["Base cost", viewingProduct.baseCost],
                  ["Packing cost", viewingProduct.packingCost],
                  ["Other charges", viewingProduct.otherCharges],
                  ["Total cost", viewingProduct.totalCost],
                  ["Product stock field", viewingProduct.stock],
                  ["Minimum stock", viewingProduct.minimumStock],
                  ["Status", viewingProduct.active ? "Active" : "Inactive"],
                ] as const).map(([label, value]) => (
                  <div key={label}>
                    <dt style={{ color: "#64748b", fontSize: "12px" }}>{label}</dt>
                    <dd style={{ margin: "3px 0 0", overflowWrap: "anywhere", fontWeight: 600 }}>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
