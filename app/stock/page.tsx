"use client";

import { useEffect, useState } from "react";

import Layout from "../components/ui/Layout";
import Card from "../components/ui/Card";
import PageTitle from "../components/ui/PageTitle";

import StockTable from "../components/stock/StockTable";
import { Stock } from "../components/stock/StockTypes";

import {
  loadStock,
  saveStock,
} from "../components/stock/StockStorage";

export default function StockPage() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [search, setSearch] = useState("");

 useEffect(() => {
  const loadData = () => {
    setStock(loadStock());
  };

  loadData();

  window.addEventListener("focus", loadData);

  return () => {
    window.removeEventListener("focus", loadData);
  };
}, []);

  useEffect(() => {
    saveStock(stock);
  }, [stock]);

  const filteredStock = stock.filter((item) =>
    `${item.productCode} ${item.productName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Layout title="UK EXIM ERP">
      <PageTitle
        title="📦 Stock Register"
        subtitle="Live Stock Position"
      />

      <Card title="Stock Register">
        <input
          type="text"
          placeholder="🔍 Search Product Code / Product Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            height: "40px",
            padding: "0 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        <StockTable stock={filteredStock} />
      </Card>
    </Layout>
  );
}