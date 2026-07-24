"use client";
import SupplierMaster from "./components/supplier/SupplierMaster";
import { useState } from "react";
import ProductMaster from "./product/components/ProductMaster";
import CustomerMaster from "./components/customer/CustomerMaster";
export default function Home() {
  const [activePage, setActivePage] = useState("dashboard");

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
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    minHeight: "90px",
  };

  const renderPage = () => {
    switch (activePage) {
      case "products":
        return <ProductMaster />;
case "customers":
  return <CustomerMaster />;

    case "suppliers":
  return <SupplierMaster />;
      case "grn":
        return (
          <>
            <h2>📥 Goods Receipt Note (GRN)</h2>
            <p>Coming Soon...</p>
          </>
        );

      case "issue":
        return (
          <>
            <h2>📤 Issue (Sales)</h2>
            <p>Coming Soon...</p>
          </>
        );

      case "stock":
        return (
          <>
            <h2>📦 Stock Report</h2>
            <p>Coming Soon...</p>
          </>
        );

      case "sales":
        return (
          <>
            <h2>💰 Sales Report</h2>
            <p>Coming Soon...</p>
          </>
        );

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
            <h2 style={{ marginTop: 0 }}>Dashboard</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "15px",
              }}
            >
              <div style={card}>
                <h3>📦 Products</h3>
                <h1>0</h1>
              </div>

              <div style={card}>
                <h3>👥 Customers</h3>
                <h1>0</h1>
              </div>

              <div style={card}>
                <h3>🚚 Suppliers</h3>
                <h1>0</h1>
              </div>

              <div style={card}>
                <h3>📦 Stock</h3>
                <h1>0</h1>
              </div>

              <div style={card}>
                <h3>💰 Sales</h3>
                <h1>₹0</h1>
              </div>

              <div style={card}>
                <h3>🛒 Purchase</h3>
                <h1>₹0</h1>
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
        height: "100vh",
        background: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <aside
        style={{
          width: "200px",
          background: "#14532d",
          color: "#fff",
          padding: "10px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          🌿 UK EXIM ERP
        </h2>

        <div
          style={
            activePage === "dashboard"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("dashboard")}
        >
          🏠 Dashboard
        </div>

        <h4>MASTERS</h4>

        <div
          style={
            activePage === "products"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("products")}
        >
          📦 Products
        </div>

        <div
          style={
            activePage === "customers"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("customers")}
        >
          👥 Customers
        </div>

        <div
          style={
            activePage === "suppliers"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("suppliers")}
        >
          🚚 Suppliers
        </div>

        <h4>TRANSACTIONS</h4>

        <div
          style={
            activePage === "grn"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("grn")}
        >
          📥 GRN
        </div>

        <div
          style={
            activePage === "issue"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("issue")}
        >
          📤 Issue (Sales)
        </div>

        <h4>REPORTS</h4>

        <div
          style={
            activePage === "stock"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("stock")}
        >
          📦 Stock
        </div>

        <div
          style={
            activePage === "sales"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("sales")}
        >
          💰 Sales
        </div>

        <div
          style={
            activePage === "purchase"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("purchase")}
        >
          🛒 Purchase
        </div>

        <div
          style={
            activePage === "settings"
              ? activeMenu
              : menuItem
          }
          onClick={() => setActivePage("settings")}
        >
          ⚙️ Settings
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            height: "65px",
            background: "#fff",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 20px",
          }}
        >
          <h2>UK EXIM ENTERPRISES ERP</h2>

          <strong>
            👋 Welcome Uttam
          </strong>
        </header>

        <div
          style={{
            flex: 1,
            padding: "20px",
            overflow: "auto",
          }}
        >
          {renderPage()}
        </div>
      </main>
    </div>
  );
}