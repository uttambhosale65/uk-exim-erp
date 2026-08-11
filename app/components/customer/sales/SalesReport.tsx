"use client";

import { useEffect, useMemo, useState } from "react";

import { loadSales } from "./SalesStorage";
import { Sales } from "./SalesTypes";

export default function SalesReport() {
  const [sales, setSales] = useState<Sales[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSales(loadSales());
  }, []);

  // --------------------------------------------------
  // FILTER SALES
  // --------------------------------------------------

  const filteredSales = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) {
      return sales;
    }

    return sales.filter((sale) => {
      const productMatch = Array.isArray(sale.items)
        ? sale.items.some((item) =>
            item.productName
              .toLowerCase()
              .includes(keyword)
          )
        : false;

      return (
        sale.salesNo
          .toLowerCase()
          .includes(keyword) ||
        sale.customerName
          .toLowerCase()
          .includes(keyword) ||
        sale.invoiceNo
          .toLowerCase()
          .includes(keyword) ||
        productMatch
      );
    });
  }, [sales, search]);

  // --------------------------------------------------
  // TOTAL SALES
  // --------------------------------------------------

  const totalSales = filteredSales.reduce(
    (total, sale) =>
      total + Number(sale.grandTotal || 0),
    0
  );

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
      }}
    >
      <h2>📤 Sales Report</h2>

      {/* SEARCH + TOTAL */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search Sales / Customer / Product..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "320px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />

        <h3>
          Total Sales : ₹
          {totalSales.toFixed(2)}
        </h3>
      </div>

      {/* SALES TABLE */}

      <div
        style={{
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "1200px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#1565c0",
                color: "#fff",
              }}
            >
              <th style={th}>
                Sales No
              </th>

              <th style={th}>
                Date
              </th>

              <th style={th}>
                Invoice
              </th>

              <th style={th}>
                Customer
              </th>

              <th style={th}>
                Product
              </th>

              <th style={th}>
                HSN
              </th>

              <th style={th}>
                Qty
              </th>

              <th style={th}>
                Rate
              </th>

              <th style={th}>
                GST
              </th>

              <th style={th}>
                Amount
              </th>

              <th style={th}>
                Grand Total
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  style={{
                    border: "1px solid #ddd",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  No Sales Records Found
                </td>
              </tr>
            ) : (
              filteredSales.map(
                (sale, saleIndex) => {
                  const items =
                    Array.isArray(sale.items)
                      ? sale.items
                      : [];

                  // --------------------------------
                  // OLD SALES RECORD
                  // --------------------------------

                  if (items.length === 0) {
                    return (
                      <tr
                        key={sale.id}
                        style={{
                          background:
                            saleIndex % 2 === 0
                              ? "#ffffff"
                              : "#f9fafb",
                        }}
                      >
                        <td style={td}>
                          {sale.salesNo}
                        </td>

                        <td style={td}>
                          {sale.salesDate}
                        </td>

                        <td style={td}>
                          {sale.invoiceNo}
                        </td>

                        <td style={td}>
                          {sale.customerName}
                        </td>

                        <td
                          colSpan={6}
                          style={{
                            ...td,
                            textAlign: "center",
                            color: "#dc2626",
                          }}
                        >
                          No Product Data
                        </td>

                        <td style={td}>
                          ₹
                          {Number(
                            sale.grandTotal || 0
                          ).toFixed(2)}
                        </td>
                      </tr>
                    );
                  }

                  // --------------------------------
                  // MULTI PRODUCT SALES
                  // --------------------------------

                  return items.map(
                    (item, itemIndex) => {
                      const isLastItem =
                        itemIndex ===
                        items.length - 1;

                      return (
                        <tr
                          key={`${sale.id}-${item.productCode}-${itemIndex}`}
                          style={{
                            background:
                              saleIndex % 2 === 0
                                ? "#ffffff"
                                : "#f9fafb",
                          }}
                        >
                          <td style={td}>
                            {sale.salesNo}
                          </td>

                          <td style={td}>
                            {sale.salesDate}
                          </td>

                          <td style={td}>
                            {sale.invoiceNo}
                          </td>

                          <td style={td}>
                            {sale.customerName}
                          </td>

                          <td style={td}>
                            {item.productName}
                          </td>

                          <td style={td}>
                            {item.hsn}
                          </td>

                          <td
                            style={{
                              ...td,
                              textAlign:
                                "center",
                            }}
                          >
                            {item.qty}
                          </td>

                          <td
                            style={{
                              ...td,
                              textAlign:
                                "right",
                            }}
                          >
                            ₹
                            {Number(
                              item.rate || 0
                            ).toFixed(2)}
                          </td>

                          <td
                            style={{
                              ...td,
                              textAlign:
                                "center",
                            }}
                          >
                            {Number(
                              item.gst || 0
                            )}
                            %
                          </td>

                          <td
                            style={{
                              ...td,
                              textAlign:
                                "right",
                            }}
                          >
                            ₹
                            {Number(
                              item.amount || 0
                            ).toFixed(2)}
                          </td>

                          <td
                            style={{
                              ...td,
                              textAlign:
                                "right",
                              fontWeight:
                                "bold",
                            }}
                          >
                            {isLastItem
                              ? `₹${Number(
                                  sale.grandTotal ||
                                    0
                                ).toFixed(2)}`
                              : ""}
                          </td>
                        </tr>
                      );
                    }
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

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const th: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
  whiteSpace: "nowrap",
};