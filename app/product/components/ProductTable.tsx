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
  ) => void;
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

  /*
  =====================================================
  REFRESH STOCK

  Product Register render झाल्यावर
  Stock Master मधील currentStock पुन्हा load.
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
        "7px 5px",

      background:
        "#14532d",

      color:
        "#ffffff",

      textAlign:
        "center",

      fontSize:
        "10px",

      fontWeight:
        700,

      whiteSpace:
        "normal",

      lineHeight:
        "13px",
    };

  const tdStyle: React.CSSProperties =
    {
      border:
        "1px solid #d1d5db",

      padding:
        "6px 4px",

      fontSize:
        "10px",

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

        overflow:
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
            "15px",

          marginBottom:
            "12px",

          width:
            "100%",
        }}
      >
        <div>
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
              "35%",

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

          overflowX:
            "auto",

          border:
            "1px solid #d1d5db",

          borderRadius:
            "6px",
        }}
      >
        <table
          style={{
            width:
              "100%",

            minWidth:
              "1250px",

            tableLayout:
              "fixed",

            borderCollapse:
              "collapse",

            background:
              "#ffffff",
          }}
        >
          <colgroup>
            <col
              style={{
                width:
                  "5%",
              }}
            />

            <col
              style={{
                width:
                  "14%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "6%",
              }}
            />

            <col
              style={{
                width:
                  "5%",
              }}
            />

            <col
              style={{
                width:
                  "5%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "7%",
              }}
            />

            <col
              style={{
                width:
                  "6%",
              }}
            />

            <col
              style={{
                width:
                  "11%",
              }}
            />
          </colgroup>

          <thead>
            <tr>
              <th
                style={thStyle}
              >
                Code
              </th>

              <th
                style={thStyle}
              >
                Product
              </th>

              <th
                style={thStyle}
              >
                Category
              </th>

              <th
                style={thStyle}
              >
                HSN
              </th>

              <th
                style={thStyle}
              >
                GST
              </th>

              <th
                style={thStyle}
              >
                UOM
              </th>

              <th
                style={thStyle}
              >
                Net Wt.
              </th>

              <th
                style={thStyle}
              >
                Base Cost
              </th>

              <th
                style={thStyle}
              >
                Packing
              </th>

              <th
                style={thStyle}
              >
                Other
              </th>

              <th
                style={thStyle}
              >
                Total Cost
              </th>

              <th
                style={thStyle}
              >
                Sale
              </th>

              <th
                style={thStyle}
              >
                MRP
              </th>

              <th
                style={thStyle}
              >
                Stock
              </th>

              <th
                style={thStyle}
              >
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
                /*
                -----------------------------------------
                IMPORTANT

                Product Register stock आता
                Product Master item.stock मधून नाही.

                Stock Master → currentStock
                -----------------------------------------
                */

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
                      style={
                        tdStyle
                      }
                    >
                      {
                        item.category
                      }
                    </td>

                    {/* HSN */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        item.hsn
                      }
                    </td>

                    {/* GST */}

                    <td
                      style={
                        tdStyle
                      }
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

                    {/* =================================================
                       LIVE STOCK
                       Stock Master → currentStock
                    ================================================= */}

                    <td
                      style={
                        tdStyle
                      }
                    >
                      <div>
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

                          background:
                            stockStatus.background,

                          color:
                            stockStatus.color,

                          padding:
                            "2px 5px",

                          borderRadius:
                            "10px",

                          fontSize:
                            "8px",

                          fontWeight:
                            700,

                          whiteSpace:
                            "nowrap",
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
                            "4px 7px",

                          borderRadius:
                            "4px",

                          cursor:
                            "pointer",

                          fontSize:
                            "9px",

                          fontWeight:
                            600,

                          marginRight:
                            "3px",
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
                            onDelete(
                              item.id
                            );
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
                            "4px 7px",

                          borderRadius:
                            "4px",

                          cursor:
                            "pointer",

                          fontSize:
                            "9px",

                          fontWeight:
                            600,
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
    </div>
  );
}