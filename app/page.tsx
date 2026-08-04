"use client";

import { useEffect, useState } from "react";
import PurchaseReport from "./components/customer/purchase/PurchaseReport";
import StockMaster from "./components/stock/StockMaster";
import ProductMaster from "./product/components/ProductMaster";
import CustomerMaster from "./components/customer/CustomerMaster";
import SupplierMaster from "./components/supplier/SupplierMaster";
import PurchaseMaster from "./components/customer/purchase/PurchaseMaster";
import SalesPage from "./sales/page";
import SalesReport from "./components/customer/sales/SalesReport";
import { loadProducts } from "./product/components/ProductStorage";
import { loadCustomers } from "./components/customer/CustomerStorage";
import { loadSuppliers } from "./components/supplier/SupplierStorage";
import { loadPurchases } from "./components/customer/purchase/PurchaseStorage";
import { loadSales } from "./components/customer/sales/SalesStorage";
import { loadStock } from "./components/stock/StockStorage";
export default function Home() {
  const [activePage, setActivePage] =
    useState("dashboard");

  const menuItem = {
    padding: "7px 10px",
    marginBottom: "2px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "0.2s",
  };

  const activeMenu = {
    ...menuItem,
    background: "#22c55e",
    color: "#fff",
    fontWeight: "bold",
  };

  const card = {
    background: "#fff",
    borderRadius: "10px",
    padding: "16px",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.08)",
    minHeight: "90px",
  };
  const [dashboard, setDashboard] = useState({
  products: 0,
  customers: 0,
  suppliers: 0,
  stock: 0,
  sales: 0,
  purchase: 0,
});
useEffect(() => {
  const products = loadProducts();
  const customers = loadCustomers();
  const suppliers = loadSuppliers();
  const purchases = loadPurchases();
  const sales = loadSales();
  const stock = loadStock();
console.log("Purchases:", purchases);
console.log("Sales:", sales);
  setDashboard({
    products: products.length,
    customers: customers.length,
    suppliers: suppliers.length,
  stock: stock.reduce(
  (total: number, item: any) =>
    total + Number(item.currentStock),
  0
),
    sales: sales.reduce(
      (total, sale) =>
        total + Number(sale.grandTotal ?? sale.netAmount ?? 0),
      0
    ),
    purchase: purchases.reduce(
  (total, purchase) =>
    total + purchase.netAmount,
  0
),
  });
}, [activePage]);
  const renderPage = () => {
    switch (activePage) {
      case "products":
        return <ProductMaster />;
        case "stock":
  return <StockMaster />;
      case "customers":
        return <CustomerMaster />;
        case "purchase":
  return <PurchaseReport />; 

      case "suppliers":
        return <SupplierMaster />;

      case "grn":
        return <PurchaseMaster />;

      case "issue":
  return <SalesPage />;

      case "stock":
        return (
          <>
            <h2>📦 Stock Report</h2>
            <p>Coming Soon...</p>
          </>
        );

      case "sales":
  return <SalesReport />;

      case "purchase":
        return (
          <>
            <h2>🛒 Purchase Report</h2>
            <p>Coming Soon...</p>
          </>
        );

      case "settings":
        return (
          <>
            <h2>⚙️ Settings</h2>
            <p>Coming Soon...</p>
          </>
        );

      default:
        return (
          <>
            <h2 style={{ marginTop: 0 }}>
              Dashboard
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "15px",
              }}
            >
              <div style={card}>
                <h3>📦 Products</h3>
                <h1>{dashboard.products}</h1>
              </div>

              <div style={card}>
                <h3>👥 Customers</h3>
                <h1>{dashboard.customers}</h1>
              </div>

              <div style={card}>
                <h3>🚚 Suppliers</h3>
                <h1>{dashboard.suppliers}</h1>
              </div>

              <div style={card}>
                <h3>📦 Stock</h3>
                <h1>{dashboard.stock}</h1>
              </div>

              <div style={card}>
                <h3>💰 Sales</h3>
                <h1>₹{dashboard.sales.toFixed(2)}</h1>
              </div>

              <div style={card}>
                <h3>🛒 Purchase</h3>
                <h1>₹{dashboard.purchase.toFixed(2)}</h1>
              </div>
            </div>
          </>
        );
    }
  };
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Arial",
        background: "#f3f4f6",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          background: "#111827",
          color: "#fff",
          padding: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          UK EXIM ERP
        </h2>

        <div
          style={
            activePage === "dashboard"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("dashboard")
          }
        >
          🏠 Dashboard
        </div>

        <div
          style={
            activePage === "products"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("products")
          }
        >
          📦 Product Master
        </div>

        <div
          style={
            activePage === "customers"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("customers")
          }
        >
          👥 Customer Master
        </div>

        <div
          style={
            activePage === "suppliers"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("suppliers")
          }
        >
          🚚 Supplier Master
        </div>

        <div
          style={
            activePage === "grn"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("grn")
          }
        >
          📥 Purchase (GRN)
        </div>

        <div
          style={
            activePage === "issue"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("issue")
          }
        >
          📤 Issue (Sales)
        </div>

        <div
          style={
            activePage === "stock"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("stock")
          }
        >
          📦 Stock Report
        </div>

        <div
          style={
            activePage === "purchase"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("purchase")
          }
        >
          🛒 Purchase Report
        </div>

        <div
          style={
            activePage === "sales"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("sales")
          }
        >
          💰 Sales Report
        </div>

        <div
          style={
            activePage === "settings"
              ? activeMenu
              : menuItem
          }
          onClick={() =>
            setActivePage("settings")
          }
        >
          ⚙️ Settings
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "25px",
        }}
      >
        {renderPage()}
      </div>
    </div>
  );
}