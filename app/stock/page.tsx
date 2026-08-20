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
  const [loaded, setLoaded] = useState(false);

  /* =========================
     LOAD STOCK
  ========================= */

  useEffect(() => {
    const data = loadStock();

    setStock(data);
    setLoaded(true);

    const handleFocus = () => {
      setStock(loadStock());
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  /* =========================
     SAVE STOCK
     Initial empty state save होऊ नये
  ========================= */

  useEffect(() => {
    if (!loaded) {
      return;
    }

    saveStock(stock);
  }, [stock, loaded]);

  /* =========================
     OPENING STOCK CHANGE
  ========================= */

  const handleOpeningChange = (
    id: string,
    value: number
  ) => {
    setStock((currentStock) =>
      currentStock.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const openingStock =
          Number(value) || 0;

        const currentStockValue =
          openingStock +
          Number(item.purchaseQty || 0) -
          Number(item.salesQty || 0);

        return {
          ...item,
          openingStock,
          currentStock:
            Math.max(
              0,
              currentStockValue
            ),
        };
      })
    );
  };

  /* =========================
     SEARCH
  ========================= */

  const filteredStock =
    stock.filter((item) =>
      `${item.productCode} ${item.productName} ${item.hsn}`
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  /* =========================
     PAGE
  ========================= */

  return (
    <Layout title="UK EXIM ERP">

      <PageTitle
        title="📦 Stock Register"
        subtitle="Live Stock Position"
      />

      <Card title="Stock Register">

        <input
          type="text"
          placeholder="🔍 Search Product Code / Product Name / HSN..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          style={{
            width: "100%",
            height: "40px",
            padding: "0 12px",
            border:
              "1px solid #d1d5db",
            borderRadius: "6px",
            marginBottom: "12px",
            boxSizing:
              "border-box",
          }}
        />

       <StockTable stock={filteredStock} />

      </Card>
    </Layout>
  );
}