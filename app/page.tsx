"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PurchaseReport from "./components/customer/purchase/PurchaseReport";
import SalesReport from "./components/customer/sales/SalesReport";

import StockMaster from "./components/stock/StockMaster";
import ProductMaster from "./product/components/ProductMaster";
import CustomerMaster from "./components/customer/CustomerMaster";
import SupplierMaster from "./components/supplier/SupplierMaster";
import PurchaseMaster from "./components/customer/purchase/PurchaseMaster";

import SalesPage from "./sales/page";

import { loadProducts } from "./product/components/ProductStorage";
import { loadCustomers } from "./components/customer/CustomerStorage";
import { loadSuppliers } from "./components/supplier/SupplierStorage";
import { loadPurchases } from "./components/customer/purchase/PurchaseStorage";
import { loadSales } from "./components/customer/sales/SalesStorage";
import { loadStock } from "./components/stock/StockStorage";

import {
  getStockMonthlyReport,
  getStockReportMonths,
  formatStockReportMonth,
  MonthlyStockSummary,
} from "./components/stock/StockMonthlyReport";

import Settings from "./components/settings/Settings";

/* =========================================================
   MAIN HOME
   UK EXIM ERP – VERSION 1.0
========================================================= */

export default function Home() {
  const [activePage, setActivePage] =
    useState("dashboard");

  const [dashboard, setDashboard] = useState({
    products: 0,
    customers: 0,
    suppliers: 0,
    stock: 0,
    sales: 0,
    purchase: 0,
  });

  const [monthlyReports, setMonthlyReports] =
    useState<MonthlyStockSummary[]>([]);

  /* =======================================================
     MENU STYLE
  ======================================================= */

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
    color: "#ffffff",
    fontWeight: "bold",
  };

  /* =======================================================
     DASHBOARD CARD
  ======================================================= */

  const card = {
    background: "#ffffff",
    borderRadius: "8px",
    padding: "10px 12px",
    boxShadow:
      "0 2px 6px rgba(0,0,0,0.07)",
    minHeight: "76px",
    boxSizing: "border-box" as const,
    minWidth: 0,
  };

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  useEffect(() => {
    const products = loadProducts();
    const customers = loadCustomers();
    const suppliers = loadSuppliers();
    const purchases = loadPurchases();
    const sales = loadSales();
    const stock = loadStock();

    /* -----------------------------------------------------
       DASHBOARD TOTALS
    ----------------------------------------------------- */

    setDashboard({
      products: products.length,

      customers: customers.length,

      suppliers: suppliers.length,

      stock: stock.reduce(
        (total, item) =>
          total +
          Number(
            item.currentStock || 0
          ),
        0
      ),

      sales: sales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.grandTotal ?? 0
          ),
        0
      ),

      purchase: purchases.reduce(
        (total, purchase) =>
          total +
          Number(
            purchase.totalNetAmount ?? 0
          ),
        0
      ),
    });

    /* -----------------------------------------------------
       MONTHLY STOCK REPORT DATA
    ----------------------------------------------------- */

    const monthKeys =
      getStockReportMonths();

    const latestMonths =
      monthKeys
        .slice(0, 12)
        .reverse();

    const reports =
      latestMonths
        .map((monthKey) => {
          const parts =
            monthKey.split("-");

          const year =
            Number(parts[0]);

          const month =
            Number(parts[1]);

          if (
            !Number.isFinite(year) ||
            !Number.isFinite(month) ||
            month < 1 ||
            month > 12
          ) {
            return null;
          }

          return getStockMonthlyReport(
            year,
            month
          );
        })
        .filter(
          (
            report
          ): report is MonthlyStockSummary =>
            report !== null &&
            report.month !== ""
        );

    setMonthlyReports(reports);
  }, [activePage]);

  /* =======================================================
     CURRENT / LATEST MONTH
  ======================================================= */

  const latestMonthlyReport =
    useMemo(() => {
      if (
        monthlyReports.length === 0
      ) {
        return null;
      }

      return monthlyReports[
        monthlyReports.length - 1
      ];
    }, [monthlyReports]);

  /* =======================================================
     RENDER PAGE
  ======================================================= */

  const renderPage = () => {
    switch (activePage) {
      /* ---------------------------------------------------
         PRODUCT
      --------------------------------------------------- */

      case "products":
        return <ProductMaster />;

      /* ---------------------------------------------------
         CUSTOMER
      --------------------------------------------------- */

      case "customers":
        return <CustomerMaster />;

      /* ---------------------------------------------------
         SUPPLIER
      --------------------------------------------------- */

      case "suppliers":
        return <SupplierMaster />;

      /* ---------------------------------------------------
         PURCHASE / GRN
      --------------------------------------------------- */

      case "grn":
        return <PurchaseMaster />;

      /* ---------------------------------------------------
         SALES / ISSUE
      --------------------------------------------------- */

      case "issue":
        return <SalesPage />;

      /* ---------------------------------------------------
         STOCK REPORT
      --------------------------------------------------- */

      case "stock":
        return <StockMaster />;

      /* ---------------------------------------------------
         PURCHASE REPORT
      --------------------------------------------------- */

      case "purchase":
        return <PurchaseReport />;

      /* ---------------------------------------------------
         SALES REPORT
      --------------------------------------------------- */

      case "sales":
        return <SalesReport />;

      /* ---------------------------------------------------
         SETTINGS
      --------------------------------------------------- */

      case "settings":
        return <Settings />;

      /* ---------------------------------------------------
         DASHBOARD
      --------------------------------------------------- */

      default:
        return (
          <>
            {/* =============================================
                DASHBOARD HEADER
            ============================================== */}

            <div
              style={{
                marginBottom: "10px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  marginBottom: "2px",
                  color: "#14532d",
                  fontSize: "22px",
                  fontWeight: 800,
                }}
              >
                Dashboard
              </h2>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "11px",
                }}
              >
                UK EXIM ENTERPRISES ERP Overview
              </div>
            </div>

            {/* =============================================
                MAIN DASHBOARD CARDS
                COMPACT – 6 CARDS IN ONE ROW
            ============================================== */}

            <div
              className="dashboard-main-cards"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(6, minmax(0, 1fr))",
                gap: "8px",
                width: "100%",
              }}
            >
              {/* PRODUCTS */}

              <DashboardMainCard
                title="Products"
                value={String(
                  dashboard.products
                )}
                icon="📦"
                color="#14532d"
                cardStyle={card}
              />

              {/* CUSTOMERS */}

              <DashboardMainCard
                title="Customers"
                value={String(
                  dashboard.customers
                )}
                icon="👥"
                color="#14532d"
                cardStyle={card}
              />

              {/* SUPPLIERS */}

              <DashboardMainCard
                title="Suppliers"
                value={String(
                  dashboard.suppliers
                )}
                icon="🚚"
                color="#14532d"
                cardStyle={card}
              />

              {/* CURRENT STOCK */}

              <DashboardMainCard
                title="Current Stock"
                value={Number(
                  latestMonthlyReport?.closingTotal ??
                    dashboard.stock
                ).toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 3,
                  }
                )}
                icon="📦"
                color="#14532d"
                cardStyle={card}
                suffix=" KG"
              />

              {/* SALES */}

              <DashboardMainCard
                title="Sales"
                value={`₹${dashboard.sales.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`}
                icon="💰"
                color="#c2410c"
                cardStyle={card}
              />

              {/* PURCHASE */}

              <DashboardMainCard
                title="Purchase"
                value={`₹${dashboard.purchase.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`}
                icon="🛒"
                color="#1d4ed8"
                cardStyle={card}
              />
            </div>

            {/* =============================================
                MONTHLY STOCK SUMMARY
            ============================================== */}

            <div
              style={{
                marginTop: "12px",
                background: "#ffffff",
                borderRadius: "8px",
                padding: "12px",
                boxShadow:
                  "0 2px 6px rgba(0,0,0,0.07)",
                border:
                  "1px solid #e5e7eb",
                boxSizing:
                  "border-box",
                width: "100%",
                minWidth: 0,
              }}
            >
              {/* SECTION HEADER */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "9px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: "#14532d",
                      fontSize: "16px",
                      fontWeight: 800,
                    }}
                  >
                    📊 Monthly Stock Movement
                  </h3>

                  <div
                    style={{
                      marginTop: "2px",
                      color: "#6b7280",
                      fontSize: "10px",
                    }}
                  >
                    Opening, Purchase, Sales and Closing stock
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActivePage("stock")
                  }
                  style={{
                    border: "none",
                    borderRadius: "6px",
                    padding: "7px 10px",
                    background: "#14532d",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  📦 Open Stock Report
                </button>
              </div>

              {/* ===========================================
                  LATEST MONTH CARDS
              ============================================ */}

              {latestMonthlyReport ? (
                <>
                  <div
                    className="dashboard-monthly-cards"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(4, minmax(0, 1fr))",
                      gap: "7px",
                      marginBottom: "10px",
                      width: "100%",
                    }}
                  >
                    <DashboardMetric
                      title="Opening"
                      value={
                        latestMonthlyReport.openingTotal
                      }
                      icon="📦"
                    />

                    <DashboardMetric
                      title="Purchase"
                      value={
                        latestMonthlyReport.purchaseTotal
                      }
                      icon="📥"
                    />

                    <DashboardMetric
                      title="Sales"
                      value={
                        latestMonthlyReport.salesTotal
                      }
                      icon="📤"
                    />

                    <DashboardMetric
                      title="Closing"
                      value={
                        latestMonthlyReport.closingTotal
                      }
                      icon="📊"
                    />
                  </div>

                  {/* =========================================
                      STOCK ALERTS
                  ========================================== */}

                  <StockAlerts />

                  {/* =========================================
                      MONTHLY SALES VS PURCHASE
                  ========================================== */}

                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "9px",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        marginBottom: "7px",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            color: "#14532d",
                            fontSize: "14px",
                            fontWeight: 800,
                          }}
                        >
                          💰 Monthly Sales vs Purchase
                        </h3>

                        <div
                          style={{
                            marginTop: "2px",
                            color: "#6b7280",
                            fontSize: "10px",
                          }}
                        >
                          Month-wise business value
                        </div>
                      </div>
                    </div>

                    <div
                      className="dashboard-business-cards"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: "7px",
                      }}
                    >
                      {/* MONTHLY SALES */}

                      <div
                        style={{
                          padding: "9px 11px",
                          border:
                            "1px solid #dbeafe",
                          borderRadius: "7px",
                          background: "#eff6ff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "#1d4ed8",
                          }}
                        >
                          💰 MONTHLY SALES
                        </div>

                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "18px",
                            fontWeight: 900,
                            color: "#1d4ed8",
                            lineHeight: 1.1,
                          }}
                        >
                          ₹
                          {(() => {
                            const d =
                              new Date();

                            const y =
                              d.getFullYear();

                            const m =
                              d.getMonth();

                            return loadSales()
                              .reduce(
                                (
                                  t,
                                  s
                                ) => {
                                  const x =
                                    new Date(
                                      s.salesDate
                                    );

                                  return x.getFullYear() ===
                                    y &&
                                    x.getMonth() ===
                                      m
                                    ? t +
                                        Number(
                                          s.grandTotal ??
                                            0
                                        )
                                    : t;
                                },
                                0
                              )
                              .toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits:
                                    2,
                                  maximumFractionDigits:
                                    2,
                                }
                              );
                          })()}
                        </div>
                      </div>

                      {/* TOTAL PURCHASE */}

                      <div
                        style={{
                          padding: "9px 11px",
                          border:
                            "1px solid #ede9fe",
                          borderRadius: "7px",
                          background: "#f5f3ff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            color: "#6d28d9",
                          }}
                        >
                          🛒 TOTAL PURCHASE
                        </div>

                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "18px",
                            fontWeight: 900,
                            color: "#6d28d9",
                            lineHeight: 1.1,
                          }}
                        >
                          ₹
                          {dashboard.purchase.toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits:
                                2,
                              maximumFractionDigits:
                                2,
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* =========================================
                      MONTHLY STOCK MOVEMENT GRAPH
                  ========================================== */}

                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "9px",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <MonthlyStockMovementGraph
                      reports={
                        monthlyReports
                      }
                    />
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#6b7280",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: "7px",
                    fontSize: "11px",
                  }}
                >
                  📦 Monthly stock data will
                  appear here after Purchase
                  or Sales transactions are
                  recorded.
                </div>
              )}
            </div>
          </>
        );
    }
  };

  /* =========================================================
     STOCK ALERTS
  ========================================================= */

  function StockAlerts() {
    const stock = loadStock();

    const negativeStock =
      stock.filter(
        (item) =>
          Number(
            item.currentStock || 0
          ) < 0
      );

    const lowStock =
      stock.filter((item) => {
        const current =
          Number(
            item.currentStock || 0
          );

        const minimum =
          Number(
            (item as any)
              .minimumStock || 0
          );

        return (
          minimum > 0 &&
          current >= 0 &&
          current <= minimum
        );
      });

    const hasAlerts =
      negativeStock.length > 0 ||
      lowStock.length > 0;

    return (
      <div
        style={{
          marginTop: "8px",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "6px",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "#374151",
            }}
          >
            ⚠️ Stock Alerts
          </div>

          {!hasAlerts && (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: "12px",
                background: "#dcfce7",
                color: "#15803d",
                fontSize: "9px",
                fontWeight: 700,
              }}
            >
              ✅ All Stock Normal
            </span>
          )}
        </div>

        {/* NEGATIVE STOCK */}

        {negativeStock.length > 0 && (
          <div
            style={{
              marginBottom: "7px",
              padding: "7px 9px",
              borderRadius: "7px",
              border:
                "1px solid #fecaca",
              background: "#fef2f2",
            }}
          >
            <div
              style={{
                color: "#b91c1c",
                fontSize: "10px",
                fontWeight: 800,
                marginBottom: "5px",
              }}
            >
              🔴 NEGATIVE STOCK
            </div>

            <div
              style={{
                display: "grid",
                gap: "4px",
              }}
            >
              {negativeStock.map(
                (item) => (
                  <div
                    key={
                      item.productCode
                    }
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "8px",
                      padding:
                        "5px 7px",
                      background:
                        "#ffffff",
                      borderRadius:
                        "5px",
                      border:
                        "1px solid #fee2e2",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      {
                        item.productCode
                      }{" "}
                      —{" "}
                      {
                        item.productName
                      }
                    </span>

                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 900,
                        color: "#b91c1c",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      Stock:{" "}
                      {Number(
                        item.currentStock ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits:
                            3,
                        }
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* LOW STOCK */}

        {lowStock.length > 0 && (
          <div
            style={{
              padding: "7px 9px",
              borderRadius: "7px",
              border:
                "1px solid #fde68a",
              background: "#fffbeb",
            }}
          >
            <div
              style={{
                color: "#b45309",
                fontSize: "10px",
                fontWeight: 800,
                marginBottom: "5px",
              }}
            >
              🟡 LOW STOCK
            </div>

            <div
              style={{
                display: "grid",
                gap: "4px",
              }}
            >
              {lowStock.map(
                (item) => (
                  <div
                    key={
                      item.productCode
                    }
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "8px",
                      padding:
                        "5px 7px",
                      background:
                        "#ffffff",
                      borderRadius:
                        "5px",
                      border:
                        "1px solid #fef3c7",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#374151",
                      }}
                    >
                      {
                        item.productCode
                      }{" "}
                      —{" "}
                      {
                        item.productName
                      }
                    </span>

                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 900,
                        color: "#b45309",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      Stock:{" "}
                      {Number(
                        item.currentStock ||
                          0
                      ).toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits:
                            3,
                        }
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =======================================================
     MAIN LAYOUT
  ======================================================= */

  return (
    <>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          width: "100%",
          fontFamily:
            "Arial, Helvetica, sans-serif",
          background: "#f3f4f6",
        }}
      >
        {/* =================================================
            SIDEBAR
        ================================================== */}

        <div
          className="erp-sidebar"
          style={{
            width: "240px",
            flexShrink: 0,
            boxSizing: "border-box",
            background: "#111827",
            color: "#ffffff",
            padding: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "18px",
              fontSize: "20px",
            }}
          >
            UK EXIM ERP
          </h2>

          {/* DASHBOARD */}

          <div
            style={
              activePage ===
              "dashboard"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "dashboard"
              )
            }
          >
            🏠 Dashboard
          </div>

          {/* PRODUCT MASTER */}

          <div
            style={
              activePage ===
              "products"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "products"
              )
            }
          >
            📦 Product Master
          </div>

          {/* CUSTOMER MASTER */}

          <div
            style={
              activePage ===
              "customers"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "customers"
              )
            }
          >
            👥 Customer Master
          </div>

          {/* SUPPLIER MASTER */}

          <div
            style={
              activePage ===
              "suppliers"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "suppliers"
              )
            }
          >
            🚚 Supplier Master
          </div>

          {/* PURCHASE GRN */}

          <div
            style={
              activePage ===
              "grn"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "grn"
              )
            }
          >
            📥 Purchase (GRN)
          </div>

          {/* ISSUE SALES */}

          <div
            style={
              activePage ===
              "issue"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "issue"
              )
            }
          >
            📤 Issue (Sales)
          </div>

          {/* STOCK REPORT */}

          <div
            style={
              activePage ===
              "stock"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "stock"
              )
            }
          >
            📦 Stock Report
          </div>

          {/* PURCHASE REPORT */}

          <div
            style={
              activePage ===
              "purchase"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "purchase"
              )
            }
          >
            🛒 Purchase Report
          </div>

          {/* SALES REPORT */}

          <div
            style={
              activePage ===
              "sales"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "sales"
              )
            }
          >
            💰 Sales Report
          </div>

          {/* SETTINGS */}

          <div
            style={
              activePage ===
              "settings"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "settings"
              )
            }
          >
            ⚙️ Settings
          </div>
        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================== */}

        <div
          className="erp-main-content"
          style={{
            flex: 1,
            minWidth: 0,
            width: 0,
            maxWidth: "100%",
            padding: "16px",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          {renderPage()}

          {/* =================================================
              FOOTER
          ================================================== */}

          {activePage ===
            "dashboard" && (
            <div
              style={{
                marginTop: "20px",
                paddingTop: "10px",
                borderTop:
                  "1px solid #d1d5db",
                overflow: "hidden",
                whiteSpace: "nowrap",
                width: "100%",
                boxSizing:
                  "border-box",
              }}
            >
              <div
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  paddingLeft:
                    "100%",
                  animation:
                    "ukEximFooterMove 18s linear infinite",
                  fontSize: "10px",
                  color: "#6b7280",
                }}
              >
                <img
                  src="/uklogo.png"
                  alt="UK EXIM Logo"
                  style={{
                    width: "30px",
                    height: "30px",
                    objectFit:
                      "contain",
                    flexShrink: 0,
                  }}
                />

                <span>
                  Designed and Developed by{" "}
                  <strong
                    style={{
                      color: "#14532d",
                      fontSize: "11px",
                    }}
                  >
                    Uttam Bhosale
                  </strong>
                </span>

                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                  }}
                >
                  •
                </span>

                <span>
                  UK EXIM ERP Version 1.0
                </span>
              </div>

              <style>{`
                @keyframes ukEximFooterMove {
                  from {
                    transform: translateX(0);
                  }

                  to {
                    transform: translateX(-100%);
                  }
                }

                @media (max-width: 1200px) {
                  .dashboard-main-cards {
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  }
                }

                @media (max-width: 800px) {
                  .dashboard-main-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }

                  .dashboard-monthly-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                }

                @media (max-width: 600px) {
                  .dashboard-main-cards,
                  .dashboard-monthly-cards,
                  .dashboard-business-cards {
                    grid-template-columns: 1fr !important;
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          PRINT STYLE
      ===================================================== */}

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          .erp-sidebar {
            display: none !important;
          }

          .erp-main-content {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          button,
          input,
          select {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

/* =========================================================
   DASHBOARD MAIN CARD
========================================================= */

function DashboardMainCard({
  title,
  value,
  icon,
  color,
  cardStyle,
  suffix,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  cardStyle: React.CSSProperties;
  suffix?: string;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          color: "#374151",
          fontSize: "11px",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span>{icon}</span>

        <span
          style={{
            overflow: "hidden",
            textOverflow:
              "ellipsis",
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          marginTop: "6px",
          color,
          fontSize:
            title === "Sales" ||
            title === "Purchase"
              ? "15px"
              : "20px",
          fontWeight: 800,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow:
            "ellipsis",
          fontVariantNumeric:
            "tabular-nums",
        }}
      >
        {value}
        {suffix && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD METRIC
========================================================= */

function DashboardMetric({
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
        background: "#f8fafc",
        border:
          "1px solid #d1d5db",
        borderRadius: "7px",
        padding: "8px 10px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "#6b7280",
          marginBottom: "3px",
        }}
      >
        {icon} {title}
      </div>

      <div
        style={{
          fontSize: "17px",
          fontWeight: 900,
          color: "#14532d",
          fontVariantNumeric:
            "tabular-nums",
          lineHeight: 1.1,
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
   MONTHLY STOCK GRAPH

   Uses the actual Monthly Stock Report data.
========================================================= */

function MonthlyStockGraph({
  reports,
}: {
  reports: MonthlyStockSummary[];
}) {
  if (
    reports.length === 0
  ) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#6b7280",
          border:
            "1px solid #e5e7eb",
          borderRadius: "7px",
          fontSize: "11px",
        }}
      >
        No monthly stock data
        available.
      </div>
    );
  }

  const width = 900;
  const height = 260;

  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const values =
    reports.map(
      (report) =>
        Number(
          report.closingTotal || 0
        )
    );

  const maxValue =
    Math.max(
      ...values,
      0
    );

  const minValue =
    Math.min(
      ...values,
      0
    );

  const range =
    maxValue -
    minValue;

  const safeRange =
    range === 0
      ? 1
      : range;

  const points =
    reports.map(
      (report, index) => {
        const x =
          reports.length === 1
            ? paddingLeft +
              chartWidth / 2
            : paddingLeft +
              (index /
                (reports.length - 1)) *
                chartWidth;

        const y =
          paddingTop +
          ((maxValue -
            Number(
              report.closingTotal ||
                0
            )) /
            safeRange) *
            chartHeight;

        return {
          x,
          y,
          value:
            Number(
              report.closingTotal ||
                0
            ),
          label:
            formatStockReportMonth(
              report.month
            ),
        };
      }
    );

  const polylinePoints =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        minWidth: 0,
      }}
    >
      <div
        style={{
          minWidth: "700px",
          width: "100%",
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="260"
          role="img"
          aria-label="Monthly closing stock graph"
        >
          {/* GRID */}

          {[0, 1, 2, 3, 4].map(
            (line) => {
              const y =
                paddingTop +
                (line / 4) *
                  chartHeight;

              return (
                <line
                  key={
                    `grid-${line}`
                  }
                  x1={
                    paddingLeft
                  }
                  y1={y}
                  x2={
                    width -
                    paddingRight
                  }
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            }
          )}

          {/* AXIS */}

          <line
            x1={
              paddingLeft
            }
            y1={
              paddingTop
            }
            x2={
              paddingLeft
            }
            y2={
              height -
              paddingBottom
            }
            stroke="#9ca3af"
            strokeWidth="1"
          />

          <line
            x1={
              paddingLeft
            }
            y1={
              height -
              paddingBottom
            }
            x2={
              width -
              paddingRight
            }
            y2={
              height -
              paddingBottom
            }
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* Y LABELS */}

          <text
            x={
              paddingLeft -
              8
            }
            y={
              paddingTop +
              4
            }
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {maxValue.toLocaleString(
              "en-IN"
            )}
          </text>

          <text
            x={
              paddingLeft -
              8
            }
            y={
              paddingTop +
              chartHeight
            }
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {minValue.toLocaleString(
              "en-IN"
            )}
          </text>

          {/* LINE */}

          <polyline
            points={
              polylinePoints
            }
            fill="none"
            stroke="#14532d"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* POINTS */}

          {points.map(
            (point, index) => (
              <g
                key={`${point.label}-${index}`}
              >
                <circle
                  cx={
                    point.x
                  }
                  cy={
                    point.y
                  }
                  r="4"
                  fill="#ffffff"
                  stroke="#14532d"
                  strokeWidth="2"
                />

                <title>
                  {point.label}
                  {" — "}
                  Closing Stock:{" "}
                  {point.value.toLocaleString(
                    "en-IN",
                    {
                      maximumFractionDigits:
                        3,
                    }
                  )}
                </title>

                <text
                  x={
                    point.x
                  }
                  y={
                    height -
                    paddingBottom +
                    17
                  }
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7280"
                >
                  {shortMonthLabel(
                    reports[
                      index
                    ].month
                  )}
                </text>
              </g>
            )
          )}

          {/* GRAPH TITLE */}

          <text
            x={
              paddingLeft
            }
            y="11"
            fontSize="10"
            fontWeight="700"
            fill="#374151"
          >
            Monthly Closing Stock
          </text>
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
   MONTHLY STOCK MOVEMENT GRAPH
========================================================= */

function MonthlyStockMovementGraph({
  reports,
}: {
  reports: MonthlyStockSummary[];
}) {
  if (reports.length === 0) {
    return (
      <div
        style={{
          padding: "15px",
          textAlign: "center",
          color: "#6b7280",
          fontSize: "10px",
          border:
            "1px solid #e5e7eb",
          borderRadius: "7px",
        }}
      >
        No monthly stock data available.
      </div>
    );
  }

  const width = 900;
  const height = 250;

  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const series = [
    {
      key: "opening",
      label: "Opening",
      values: reports.map(
        (report) =>
          Number(
            report.openingTotal || 0
          )
      ),
    },
    {
      key: "purchase",
      label: "Purchase",
      values: reports.map(
        (report) =>
          Number(
            report.purchaseTotal || 0
          )
      ),
    },
    {
      key: "sales",
      label: "Sales",
      values: reports.map(
        (report) =>
          Number(
            report.salesTotal || 0
          )
      ),
    },
    {
      key: "closing",
      label: "Closing",
      values: reports.map(
        (report) =>
          Number(
            report.closingTotal || 0
          )
      ),
    },
  ];

  const allValues =
    series.flatMap(
      (item) =>
        item.values
    );

  const maxValue =
    Math.max(
      ...allValues,
      0
    );

  const minValue =
    Math.min(
      ...allValues,
      0
    );

  const range =
    maxValue - minValue;

  const safeRange =
    range === 0
      ? 1
      : range;

  const getY = (
    value: number
  ) => {
    return (
      paddingTop +
      ((maxValue - value) /
        safeRange) *
        chartHeight
    );
  };

  const getX = (
    index: number
  ) => {
    if (
      reports.length === 1
    ) {
      return (
        paddingLeft +
        chartWidth / 2
      );
    }

    return (
      paddingLeft +
      (index /
        (reports.length - 1)) *
        chartWidth
    );
  };

  const getPolyline = (
    values: number[]
  ) => {
    return values
      .map(
        (
          value,
          index
        ) =>
          `${getX(
            index
          )},${getY(
            value
          )}`
      )
      .join(" ");
  };

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        minWidth: 0,
      }}
    >
      <div
        style={{
          minWidth: "700px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom: "5px",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#374151",
            }}
          >
            📊 Monthly Stock Movement
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              fontSize: "10px",
              fontWeight: 700,
              color: "#374151",
            }}
          >
            <LegendItem
              color="#2563eb"
              label="Opening"
            />

            <LegendItem
              color="#7c3aed"
              label="Purchase"
            />

            <LegendItem
              color="#ea580c"
              label="Sales"
            />

            <LegendItem
              color="#14532d"
              label="Closing"
            />
          </div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="250"
          role="img"
          aria-label="Monthly stock movement graph"
        >
          {/* GRID */}

          {[0, 1, 2, 3, 4].map(
            (line) => {
              const y =
                paddingTop +
                (line / 4) *
                  chartHeight;

              return (
                <line
                  key={`grid-${line}`}
                  x1={paddingLeft}
                  y1={y}
                  x2={
                    width -
                    paddingRight
                  }
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            }
          )}

          {/* AXIS */}

          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={
              height -
              paddingBottom
            }
            stroke="#9ca3af"
            strokeWidth="1"
          />

          <line
            x1={paddingLeft}
            y1={
              height -
              paddingBottom
            }
            x2={
              width -
              paddingRight
            }
            y2={
              height -
              paddingBottom
            }
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {/* Y LABELS */}

          <text
            x={
              paddingLeft - 8
            }
            y={
              paddingTop + 4
            }
            textAnchor="end"
            fontSize="9"
            fill="#6b7280"
          >
            {maxValue.toLocaleString(
              "en-IN"
            )}
          </text>

          <text
            x={
              paddingLeft - 8
            }
            y={
              paddingTop +
              chartHeight
            }
            textAnchor="end"
            fontSize="9"
            fill="#6b7280"
          >
            {minValue.toLocaleString(
              "en-IN"
            )}
          </text>

          {/* OPENING LINE */}

          <polyline
            points={getPolyline(
              series[0].values
            )}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* PURCHASE LINE */}

          <polyline
            points={getPolyline(
              series[1].values
            )}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* SALES LINE */}

          <polyline
            points={getPolyline(
              series[2].values
            )}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* CLOSING LINE */}

          <polyline
            points={getPolyline(
              series[3].values
            )}
            fill="none"
            stroke="#14532d"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* X LABELS */}

          {reports.map(
            (
              report,
              index
            ) => (
              <text
                key={`${report.month}-${index}`}
                x={getX(index)}
                y={
                  height -
                  paddingBottom +
                  16
                }
                textAnchor="middle"
                fontSize="8"
                fill="#6b7280"
              >
                {shortMonthLabel(
                  report.month
                )}
              </text>
            )
          )}

          {/* POINTS */}

          {series.map(
            (item) =>
              item.values.map(
                (
                  value,
                  index
                ) => (
                  <circle
                    key={`${item.key}-${index}`}
                    cx={getX(index)}
                    cy={getY(value)}
                    r="3"
                    fill="#ffffff"
                    stroke={
                      item.key ===
                      "opening"
                        ? "#2563eb"
                        : item.key ===
                          "purchase"
                        ? "#7c3aed"
                        : item.key ===
                          "sales"
                        ? "#ea580c"
                        : "#14532d"
                    }
                    strokeWidth="1.5"
                  >
                    <title>
                      {
                        item.label
                      }{" "}
                      —{" "}
                      {
                        shortMonthLabel(
                          reports[
                            index
                          ].month
                        )
                      }{" "}
                      —{" "}
                      {value.toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits:
                            3,
                        }
                      )}
                    </title>
                  </circle>
                )
              )
          )}
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
   GRAPH LEGEND ITEM
========================================================= */

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />

      {label}
    </span>
  );
}

/* =========================================================
   SHORT MONTH LABEL
========================================================= */

function shortMonthLabel(
  monthKey: string
): string {
  const parts =
    String(
      monthKey || ""
    ).split("-");

  if (
    parts.length !== 2
  ) {
    return monthKey;
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return monthKey;
  }

  const date =
    new Date(
      year,
      month - 1,
      1
    );

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "short",
      year: "2-digit",
    }
  );
}