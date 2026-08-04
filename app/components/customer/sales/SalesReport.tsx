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

  const filteredSales = useMemo(() => {
    const keyword = search.toLowerCase();

    return sales.filter(
      (sale) =>
        sale.salesNo.toLowerCase().includes(keyword) ||
        sale.customerName.toLowerCase().includes(keyword) ||
        sale.productName.toLowerCase().includes(keyword) ||
        sale.invoiceNo.toLowerCase().includes(keyword)
    );
  }, [sales, search]);

  const totalSales = filteredSales.reduce(
    (total, item) => total + item.netAmount,
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}
      >
        <input
          type="text"
          placeholder="🔍 Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "320px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />

        <h3>
          Total Sales : ₹{totalSales.toFixed(2)}
        </h3>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "1350px",
          }}
        >
          <thead>
            <tr style={{ background: "#1565c0", color: "#fff" }}>
              <th style={th}>Sales No</th>
              <th style={th}>Date</th>
              <th style={th}>Invoice</th>
              <th style={th}>Customer</th>
              <th style={th}>Product</th>
              <th style={th}>HSN</th>
              <th style={th}>Qty</th>
              <th style={th}>Rate</th>
              <th style={th}>GST</th>
              <th style={th}>Net Amount</th>
            </tr>
          </thead>

          <tbody>
            {filteredSales.map((item) => (
              <tr key={item.id}>
                <td style={td}>{item.salesNo}</td>
                <td style={td}>{item.salesDate}</td>
                <td style={td}>{item.invoiceNo}</td>
                <td style={td}>{item.customerName}</td>
                <td style={td}>{item.productName}</td>
                <td style={td}>{item.hsn}</td>
                <td style={td}>{item.qty}</td>
                <td style={td}>₹{item.rate.toFixed(2)}</td>
                <td style={td}>{item.gst}%</td>
                <td style={td}>₹{item.netAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
};

const td: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "10px",
};