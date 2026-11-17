"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PurchaseReport from "./components/customer/purchase/PurchaseReport";
import SalesReport from "./components/customer/sales/SalesReport";

import StockMaster from "./transactions/client/StockPostgresMaster";
import ProductMaster from "./product/components/ProductMaster";
import CustomerMaster from "./components/customer/CustomerMaster";
import SupplierMaster from "./components/supplier/SupplierMaster";
import PurchaseMaster from "./transactions/client/PurchasePostgresMaster";

import SalesPage from "./transactions/client/SalesPostgresMaster";

import { useProductCatalog } from "./product/useProductCatalog";
import { CUSTOMER_DATA_CHANGED_EVENT } from "./customer/customer-events";
import { TRADE_DATA_CHANGED_EVENT } from "./transactions/client/trade-events";

import {
  formatStockReportMonth,
  MonthlyStockSummary,
} from "./components/stock/StockMonthlyReport";

import Settings from "./components/settings/Settings";
import SettlementPostgresMaster from "./transactions/client/SettlementPostgresMaster";
import BusinessSummaryPanel from "./dashboard/BusinessSummaryPanel";
import LogoutButton from "./components/auth/LogoutButton";

/* =========================================================
   INTERNATIONAL EXPORT MODULES
   ========================================================= */

import ExportPostgresWorkspace from "./international/export/ExportPostgresWorkspace";

/* =========================================================
   MAIN HOME
   UK EXIM ERP – VERSION 1.0
========================================================= */

export default function Home() {
  const { products } = useProductCatalog();
  const [activePage, setActivePage] =
    useState("dashboard");

  const [showPendingPayments, setShowPendingPayments] =
    useState(false);

  const [dashboard, setDashboard] = useState<
    | { status: "loading" }
    | { status: "ready"; supplierCount: number; sales: number; purchase: number; pendingSalesCount: number; monthlySales: number; monthlyGstSales: number; monthlyNonGstSales: number; pendingSales: Array<{ id: string; salesNo: string; salesDate: string; customerName: string; paymentMode: string; invoiceTotal: string }> }
    | { status: "error" }
  >({ status: "loading" });
  const [customerCountState, setCustomerCountState] = useState<
    | { status: "loading" }
    | { status: "ready"; count: number }
    | { status: "error" }
  >({ status: "loading" });
  const [databaseStockState,setDatabaseStockState]=useState<
    {status:"loading"}|{status:"ready";value:number;rows:Array<{productCode:string;productName:string;currentStock:number;minimumStock:number}>}|{status:"empty"}|{status:"error"}
  >({status:"loading"});

  const [monthlyReports, setMonthlyReports] =
    useState<MonthlyStockSummary[]>([]);
  const [monthlyFinancials, setMonthlyFinancials] = useState<
    | { status: "loading" }
    | { status: "ready"; months: Array<{ month: string; sales: number; purchase: number }> }
    | { status: "error" }
  >({ status: "loading" });

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
    padding: "6px 10px",
    boxShadow:
      "0 2px 6px rgba(0,0,0,0.07)",
    minHeight: "70px",
    boxSizing: "border-box" as const,
    minWidth: 0,
  };

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  useEffect(() => {
    let current = true;
    const loadCustomerCount = async () => {
      if (current) setCustomerCountState({ status: "loading" });
      try {
        const response = await fetch("/api/customers/count", { cache: "no-store" });
        if (!response.ok) throw new Error("Customer count request failed.");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || typeof (data as { count?: unknown }).count !== "number"
          || !Number.isSafeInteger((data as { count: number }).count) || (data as { count: number }).count < 0) {
          throw new Error("Customer count response was invalid.");
        }
        if (current) setCustomerCountState({ status: "ready", count: (data as { count: number }).count });
      } catch {
        if (current) setCustomerCountState({ status: "error" });
      }
    };
    void loadCustomerCount();
    window.addEventListener(CUSTOMER_DATA_CHANGED_EVENT, loadCustomerCount);
    return () => {
      current = false;
      window.removeEventListener(CUSTOMER_DATA_CHANGED_EVENT, loadCustomerCount);
    };
  }, [activePage]);

  useEffect(() => {
    let current = true;
    const loadMonthlyFinancials = async () => {
      setMonthlyFinancials({ status: "loading" });
      try {
        const now = new Date();
        const periods = Array.from({ length: 6 }, (_, index) => {
          const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
          return { year: date.getFullYear(), month: date.getMonth() + 1 };
        });
        const months = await Promise.all(periods.map(async ({ year, month }) => {
          const response = await fetch(`/api/dashboard/summary?year=${year}&month=${month}`, {
            cache: "no-store",
            credentials: "same-origin",
          });
          if (!response.ok) throw new Error("Monthly business summary request failed.");
          const data = await response.json() as Record<string, unknown>;
          const sales = Number(data.monthlySalesTotal);
          const purchase = Number(data.monthlyPurchaseTotal);
          if (!Number.isFinite(sales) || !Number.isFinite(purchase)) {
            throw new Error("Monthly business summary response was invalid.");
          }
          return { month: `${year}-${String(month).padStart(2, "0")}`, sales, purchase };
        }));
        if (current) setMonthlyFinancials({ status: "ready", months });
      } catch {
        if (current) setMonthlyFinancials({ status: "error" });
      }
    };
    void loadMonthlyFinancials();
    window.addEventListener(TRADE_DATA_CHANGED_EVENT, loadMonthlyFinancials);
    window.addEventListener("focus", loadMonthlyFinancials);
    return () => {
      current = false;
      window.removeEventListener(TRADE_DATA_CHANGED_EVENT, loadMonthlyFinancials);
      window.removeEventListener("focus", loadMonthlyFinancials);
    };
  }, [activePage]);

  useEffect(() => {
    let current = true;
    const refreshDashboardSummary = async () => {
      if (current) {
        setDashboard({ status: "loading" });
        setMonthlyReports([]);
      }
      try {
        const now = new Date();
        const response = await fetch(`/api/dashboard/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("Dashboard summary request failed.");
        const data = await response.json() as Record<string, unknown>;
        const numericFields = ["supplierCount", "purchaseTotal", "salesTotal", "pendingSalesCount", "monthlySalesTotal", "monthlyGstSalesTotal", "monthlyNonGstSalesTotal"];
        if (numericFields.some((field) => !Number.isFinite(Number(data[field]))) || !Array.isArray(data.pendingSales)
          || !Array.isArray(data.monthlyStock)) {
          throw new Error("Dashboard summary response was invalid.");
        }
        const pendingSales = data.pendingSales as Array<Record<string, unknown>>;
        if (pendingSales.some((sale) => typeof sale.id !== "string" || typeof sale.salesNo !== "string"
          || typeof sale.salesDate !== "string" || typeof sale.customerName !== "string"
          || typeof sale.paymentMode !== "string" || !Number.isFinite(Number(sale.invoiceTotal)))) {
          throw new Error("Dashboard pending sales response was invalid.");
        }
        const monthlyReportsFromDatabase = (data.monthlyStock as Array<Record<string, unknown>>).map((report) => {
          const fields = ["openingTotal", "purchaseTotal", "salesTotal", "closingTotal"];
          if (typeof report.month !== "string" || fields.some((field) => !Number.isFinite(Number(report[field])))) {
            throw new Error("Dashboard stock movement response was invalid.");
          }
          return {
            month: report.month,
            openingTotal: Number(report.openingTotal),
            purchaseTotal: Number(report.purchaseTotal),
            salesTotal: Number(report.salesTotal),
            closingTotal: Number(report.closingTotal),
            rows: [],
          } satisfies MonthlyStockSummary;
        });
        const pendingSalesCount = Number(data.pendingSalesCount);
        if (!Number.isSafeInteger(pendingSalesCount) || pendingSalesCount !== pendingSales.length) {
          throw new Error("Dashboard pending sales count did not match its records.");
        }
        if (current) setDashboard({
          status: "ready",
          supplierCount: Number(data.supplierCount),
          purchase: Number(data.purchaseTotal),
          sales: Number(data.salesTotal),
          pendingSalesCount,
          monthlySales: Number(data.monthlySalesTotal),
          monthlyGstSales: Number(data.monthlyGstSalesTotal),
          monthlyNonGstSales: Number(data.monthlyNonGstSalesTotal),
          pendingSales: pendingSales as Array<{ id: string; salesNo: string; salesDate: string; customerName: string; paymentMode: string; invoiceTotal: string }>,
        });
        if (current) setMonthlyReports(monthlyReportsFromDatabase);
      } catch {
        if (current) {
          setDashboard({ status: "error" });
          setMonthlyReports([]);
        }
      }
    };
    void refreshDashboardSummary();
    window.addEventListener(TRADE_DATA_CHANGED_EVENT, refreshDashboardSummary);
    window.addEventListener("focus", refreshDashboardSummary);
    return () => {
      current = false;
      window.removeEventListener(TRADE_DATA_CHANGED_EVENT, refreshDashboardSummary);
      window.removeEventListener("focus", refreshDashboardSummary);
    };
  }, [activePage]);

  useEffect(()=>{
    let current=true;
    const refreshStock=async()=>{
      if(current)setDatabaseStockState({status:"loading"});
      try{
        const response=await fetch("/api/stock/current",{cache:"no-store"});
        if(!response.ok)throw new Error("Stock request failed.");
        const payload:unknown=await response.json();
        const rows=(payload as {stock?:unknown})?.stock;
        if(!Array.isArray(rows))throw new Error("Stock response was invalid.");
        if(!rows.length){if(current)setDatabaseStockState({status:"empty"});return;}
        const normalizedRows=rows.map(row=>{
          const item=row as {productCode?:unknown;productName?:unknown;currentStock?:unknown;minimumStock?:unknown};
          const quantity=Number(item.currentStock),minimum=Number(item.minimumStock);
          if(!Number.isFinite(quantity)||!Number.isFinite(minimum))throw new Error("Stock quantity was invalid.");
          if(typeof item.productCode!=="string"||typeof item.productName!=="string")throw new Error("Stock product identity was invalid.");
          return {productCode:item.productCode,productName:item.productName,currentStock:quantity,minimumStock:minimum};
        });
        const value=normalizedRows.reduce((total,row)=>total+row.currentStock,0);
        if(current)setDatabaseStockState({status:"ready",value,rows:normalizedRows});
      }catch{if(current)setDatabaseStockState({status:"error"});}
    };
    void refreshStock();
    window.addEventListener(TRADE_DATA_CHANGED_EVENT,refreshStock);
    window.addEventListener("focus",refreshStock);
    return()=>{current=false;window.removeEventListener(TRADE_DATA_CHANGED_EVENT,refreshStock);window.removeEventListener("focus",refreshStock);};
  },[]);

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
    if (products.length === 0 && activePage !== "products") {
      return (
        <section role="status" style={{ padding: 24, background: "#fff", borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>No products in the PostgreSQL catalog</h2>
          <p>No legacy LocalStorage products were loaded. Open Product Master to add products before using dependent modules.</p>
          <button onClick={() => setActivePage("products")}>Open Product Master</button>
        </section>
      );
    }
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

      case "payments":
        return <div style={{ display: "grid", gap: 14 }}><SettlementPostgresMaster kind="receipt" /><SettlementPostgresMaster kind="supplierPayment" /></div>;

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT WORKSPACE
      --------------------------------------------------- */

      case "international-export":
        return (
          <InternationalExportWorkspace
            onOpen={(page) =>
              setActivePage(page)
            }
          />
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT CUSTOMER
      --------------------------------------------------- */

      case "export-customer":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Customer Master"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="customers" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT ENQUIRY
      --------------------------------------------------- */

      case "export-enquiry":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Enquiry"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="enquiry" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT QUOTATION
      --------------------------------------------------- */

      case "export-quotation":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Quotation"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="quotation" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL PROFORMA INVOICE
      --------------------------------------------------- */

      case "export-proforma":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Proforma Invoice"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="proforma_invoice" />
          </InternationalModuleWrapper>
        );
/* ---------------------------------------------------
   INTERNATIONAL EXPORT PURCHASE
--------------------------------------------------- */

      case "export-purchase":
        return (
          <InternationalModuleWrapper
            title="🌍 International Export Purchase"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="purchase" />
          </InternationalModuleWrapper>
        );

/* ---------------------------------------------------
   INTERNATIONAL EXPORT STOCK
--------------------------------------------------- */

case "export-stock":
  return (
    <InternationalModuleWrapper
      title="🌍 International Export Stock"
      onBack={() =>
        setActivePage(
          "international-export"
        )
      }
    >
      <ExportPostgresWorkspace kind="stock" />
    </InternationalModuleWrapper>
  );

/* ---------------------------------------------------
   INTERNATIONAL EXPORT COMMERCIAL INVOICE
--------------------------------------------------- */

      case "export-reservation":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Stock Reservation"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="reservation" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT PACKING
      --------------------------------------------------- */

      case "export-packing":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Packing"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="packing" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT SHIPMENT
      --------------------------------------------------- */

      case "export-shipment":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Shipment"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="shipment" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT COMMERCIAL INVOICE
      --------------------------------------------------- */

      case "export-invoice":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Commercial Invoice"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="commercial_invoice" />
          </InternationalModuleWrapper>
        );

      /* ---------------------------------------------------
         INTERNATIONAL EXPORT ORDER
      --------------------------------------------------- */

      case "export-order":
        return (
          <InternationalModuleWrapper
            title="🌍 Export Order"
            onBack={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            <ExportPostgresWorkspace kind="order" />
          </InternationalModuleWrapper>
        );

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
              className="erp-dashboard"
            >
            <div
              className="dashboard-heading"
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
                Domestic Business Overview · Live company-scoped PostgreSQL figures
              </div>

            </div>

            {/* =============================================
                DOMESTIC BUSINESS KPI CARDS
            ============================================== */}

            <div
              className="dashboard-main-cards"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "8px",
                width: "100%",
              }}
            >
              {/* PRODUCTS */}

              <DashboardMainCard
                title="Products"
                value={String(products.length)}
                icon="📦"
                color="#14532d"
                cardStyle={card}
              />

              {/* CUSTOMERS */}

              <DashboardMainCard
                title="Customers"
                value={customerCountState.status === "ready"
                  ? String(customerCountState.count)
                  : customerCountState.status === "loading" ? "Loading" : "Unavailable"}
                icon="👥"
                color="#14532d"
                cardStyle={card}
                ariaLabel={customerCountState.status === "error"
                  ? "Customer count unavailable because the customer service request failed"
                  : customerCountState.status === "loading"
                    ? "Customer count loading"
                    : `Total domestic customers, including active and inactive: ${customerCountState.count}`}
              />

              {customerCountState.status === "error" && (
                <p role="alert" style={{ gridColumn: "1 / -1", margin: 0, color: "#b91c1c", fontSize: "12px" }}>
                  Customer count could not be loaded. Retry by refreshing the Dashboard.
                </p>
              )}

              {/* SUPPLIERS */}

              <DashboardMainCard
                title="Suppliers"
                value={dashboard.status === "ready" ? String(dashboard.supplierCount) : dashboard.status === "loading" ? "Loading" : "Unavailable"}
                icon="🚚"
                color="#14532d"
                cardStyle={card}
              />

              {/* CURRENT STOCK */}

              <DashboardMainCard
                title="Current Stock"
                value={databaseStockState.status==="ready"?databaseStockState.value.toLocaleString("en-IN",{maximumFractionDigits:3}):databaseStockState.status==="loading"?"Loading":databaseStockState.status==="empty"?"Unavailable":"Error"}
                icon="📦"
                color="#14532d"
                cardStyle={card}
                suffix={databaseStockState.status==="ready"?" KG":""}
              />
              {databaseStockState.status==="error"&&<p role="alert" style={{gridColumn:"1 / -1",margin:0,color:"#b91c1c",fontSize:12}}>PostgreSQL stock could not be loaded. Refresh the Dashboard to retry.</p>}
              {databaseStockState.status==="empty"&&<p role="status" style={{gridColumn:"1 / -1",margin:0,color:"#92400e",fontSize:12}}>Stock is unavailable until a verified baseline is imported.</p>}

              {/* SALES */}

              <DashboardMainCard
                title="All-time Sales"
                value={dashboard.status === "ready" ? `₹${dashboard.sales.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}` : dashboard.status === "loading" ? "Loading" : "Unavailable"}
                icon="💰"
                color="#c2410c"
                cardStyle={card}
              />

              {/* PURCHASE */}

              <DashboardMainCard
                title="All-time Purchase"
                value={dashboard.status === "ready" ? `₹${dashboard.purchase.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}` : dashboard.status === "loading" ? "Loading" : "Unavailable"}
                icon="🛒"
                color="#1d4ed8"
                cardStyle={card}
              />

              {/* PENDING PAYMENT */}

              <DashboardMainCard
                title="Pending Payments"
                value={dashboard.status === "ready" ? `${dashboard.pendingSalesCount} invoices` : dashboard.status === "loading" ? "Loading" : "Unavailable"}
                icon="⏳"
                color="#b45309"
                cardStyle={card}
                onClick={() => setShowPendingPayments(true)}
                ariaLabel="Sales marked Pending; receipt records and outstanding payment balances are unavailable"
              />

              {dashboard.status === "error" && (
                <p role="alert" style={{ gridColumn: "1 / -1", margin: 0, color: "#b91c1c", fontSize: 12 }}>
                  Supplier and transaction summary could not be loaded from PostgreSQL. Refresh the Dashboard to retry.
                </p>
              )}
            </div>

            {/* =============================================
                MONTHLY STOCK SUMMARY
            ============================================== */}

            <div className="dashboard-chart-layout">
            <div
              className="dashboard-stock-panel"
              style={{
                marginTop: "8px",
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
                className="dashboard-stock-heading"
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
                    📊 Stock Summary
                  </h3>

                  <div
                    style={{
                      marginTop: "2px",
                      color: "#6b7280",
                      fontSize: "10px",
                    }}
                  >
                    PostgreSQL movements from the verified 6 Nov 2026 baseline onward; earlier monthly stock movement is unavailable.
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

              <div className="dashboard-stock-layout">
                  <section className="dashboard-stock-summary" aria-label="Stock summary">
                  {latestMonthlyReport ? (
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
                      title="Net Purchase"
                      value={
                        latestMonthlyReport.purchaseTotal
                      }
                      icon="📥"
                    />

                    <DashboardMetric
                      title="Net Sales"
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
                  ) : (
                    <div className="dashboard-stock-unavailable" role={dashboard.status === "error" ? "alert" : "status"}>
                      {dashboard.status === "loading"
                        ? "Loading verified PostgreSQL monthly stock figures…"
                        : dashboard.status === "error"
                          ? "Stock summary could not be loaded from PostgreSQL."
                          : "Verified monthly stock figures are unavailable for the current period."}
                    </div>
                  )}

                  {/* =========================================
                      STOCK ALERTS
                  ========================================== */}

                  <StockAlerts />

                  </section>

                  {/* =========================================
                      MONTHLY STOCK MOVEMENT GRAPH
                  ========================================== */}

                  <section
                    className="dashboard-stock-chart"
                    aria-label="Monthly stock movement chart"
                    style={{
                      marginTop: "4px",
                      paddingTop: "4px",
                      borderTop:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <MonthlyStockMovementGraph
                      reports={
                        monthlyReports
                      }
                      status={dashboard.status}
                    />
                  </section>
              </div>
            </div>
            <MonthlySalesPurchaseGraph data={monthlyFinancials} />
            </div>
            </div>
          </>
        );
    }
  };

  /* =========================================================
     STOCK ALERTS
  ========================================================= */

  function StockAlerts() {
    const stock = databaseStockState.status === "ready" ? databaseStockState.rows : [];
    const negativeStock = stock.filter((item) => item.currentStock < 0);
    const lowStock = stock.filter((item) => item.minimumStock > 0 && item.currentStock >= 0 && item.currentStock <= item.minimumStock);

    const hasAlerts =
      negativeStock.length > 0 ||
      lowStock.length > 0;

    return (
      <div
        style={{
          marginTop: "3px",
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

          {databaseStockState.status === "loading" && <span role="status">Loading PostgreSQL stock…</span>}
          {databaseStockState.status === "error" && <span role="alert">Stock alerts unavailable.</span>}
          {databaseStockState.status === "empty" && <span role="status">No verified stock baseline.</span>}
          {databaseStockState.status === "ready" && !hasAlerts && (
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

  /* =========================================================
     MAIN LAYOUT
  ========================================================= */

  return (
    <>
      <div
        className={activePage === "dashboard" ? "erp-app-shell dashboard-shell" : "erp-app-shell"}
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
          className={activePage === "dashboard" ? "erp-sidebar dashboard-sidebar" : "erp-sidebar"}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "240px",
            height: "100vh",
            flexShrink: 0,
            boxSizing: "border-box",
            background: "#111827",
            color: "#ffffff",
            padding: "20px",
            overflowY: "auto",
            zIndex: 1000,
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

          <div style={activePage === "payments" ? activeMenu : menuItem} onClick={() => setActivePage("payments")}>
            💳 Receipts & Payments
          </div>

          {/* =================================================
              INTERNATIONAL EXPORT
          ================================================== */}

          <div
            style={
              activePage ===
                "international-export" ||
              activePage ===
                "export-customer" ||
              activePage ===
                "export-enquiry" ||
              activePage ===
                "export-quotation" ||
              activePage ===
                "export-proforma" ||
              activePage ===
                "export-order" ||
              activePage ===
                "export-purchase" ||
              activePage ===
                "export-stock" ||
              activePage ===
                "export-reservation" ||
              activePage ===
                "export-packing" ||
              activePage ===
                "export-shipment" ||
              activePage ===
                "export-invoice"
                ? activeMenu
                : menuItem
            }
            onClick={() =>
              setActivePage(
                "international-export"
              )
            }
          >
            🌍 International Export
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

          <div style={{ marginTop: "18px", borderTop: "1px solid #374151", paddingTop: "18px" }}>
            <LogoutButton />
          </div>
        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================== */}

        <div
          className={activePage === "dashboard" ? "erp-main-content dashboard-page" : "erp-main-content"}
          style={{
            flex: 1,
            minWidth: 0,
            width: "calc(100% - 240px)",
            marginLeft: "240px",
            maxWidth: "calc(100% - 240px)",
            padding: "16px",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          {renderPage()}

          {/* =================================================
              FOOTER
          ================================================= */}

          {activePage ===
            "dashboard" && (
            <div
              className="dashboard-footer"
              style={{
                marginTop: "6px",
                padding: "6px 2px 0",
                borderTop:
                  "1px solid #d1d5db",
                width: "100%",
                boxSizing:
                  "border-box",
              }}
            >
              <div className="dashboard-brand-ticker" aria-label="UK EXIM ENTERPRISES, UTTAM HALDI, वाईच्या कुशीतील उत्तम सातारी हळद. Delivering Indian purity across continents.">
                <div className="dashboard-brand-ticker-track">
                  <span><strong>UK EXIM ENTERPRISES</strong><span className="ticker-separator">✦</span><strong>UTTAM HALDI</strong><span>वाईच्या कुशीतील उत्तम सातारी हळद</span><span>Delivering Indian purity across continents</span></span>
                  <span aria-hidden="true"><strong>UK EXIM ENTERPRISES</strong><span className="ticker-separator">✦</span><strong>UTTAM HALDI</strong><span>वाईच्या कुशीतील उत्तम सातारी हळद</span><span>Delivering Indian purity across continents</span></span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  flexWrap: "wrap",
                  gap: "7px",
                  color: "#6b7280",
                }}
              >
                <img
                  src="/uklogo.png"
                  alt="UK EXIM Logo"
                  style={{
                  width: "22px",
                  height: "22px",
                    objectFit:
                      "contain",
                    flexShrink: 0,
                  }}
                />

                <span style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                  Designed & Developed by{" "}
                  <strong
                    style={{
                      color: "#14532d",
                      fontSize: "11px",
                      fontWeight: 900,
                    }}
                  >
                    Uttam Bhosale
                  </strong>
                </span>

                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 800 }}>
                  •
                </span>

                <strong
                  style={{
                    color: "#14532d",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  BUILT FOR BUSINESS.
                </strong>

                <strong
                  style={{
                    color: "#b58a32",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  DESIGNED FOR TRUST.
                </strong>

                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 800 }}>
                  •
                </span>

                <span style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                  UK EXIM ERP Version 1.0
                </span>
              </div>

              <style>{`
                .dashboard-shell {
                  height: 100vh;
                  min-height: 0 !important;
                  overflow: hidden;
                }

                .dashboard-page {
                  display: flex;
                  flex-direction: column;
                  height: 100vh;
                  min-height: 0 !important;
                  overflow-x: hidden;
                  overflow-y: auto;
                  padding: 10px !important;
                }

                .erp-dashboard {
                  display: grid;
                  grid-template-rows: auto auto minmax(0, 1fr);
                  align-content: start;
                  gap: 10px;
                  width: 100%;
                  max-width: 1680px;
                  min-width: 0;
                  min-height: 0;
                  flex: 0 0 auto;
                  margin: 0 auto;
                }

                .dashboard-heading {
                  margin-bottom: 0 !important;
                }

                .dashboard-heading h2 {
                  font-size: 20px !important;
                  letter-spacing: -0.025em;
                }

                .dashboard-heading { padding: 2px 2px 4px; }
                .dashboard-heading > div { color: #64748b !important; font-size: 12px !important; }

                .dashboard-main-cards {
                  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                  gap: 6px !important;
                }

                .dashboard-chart-layout {
                  display: grid;
                  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
                  align-items: stretch;
                  gap: 10px;
                  min-width: 0;
                }

                .dashboard-main-cards > div {
                  min-height: 78px !important;
                  padding: 10px 11px !important;
                  border: 1px solid #e2e8f0;
                  border-top: 3px solid #15803d;
                  border-radius: 10px !important;
                  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.055) !important;
                  background: linear-gradient(155deg, #ffffff, #fbfdfb) !important;
                }

                .dashboard-main-cards > div:hover {
                  border-color: #bbd7c3;
                  box-shadow: 0 7px 18px rgba(15, 23, 42, 0.09) !important;
                  transform: translateY(-1px);
                  transition: transform 150ms ease, box-shadow 150ms ease;
                }

                .dashboard-main-cards > div > div:first-child { color: #536273 !important; font-size: 11px !important; font-weight: 650; }
                .dashboard-main-cards .dashboard-kpi-value {
                  font-size: clamp(13px, 1vw, 17px) !important;
                  overflow-wrap: normal;
                  white-space: normal !important;
                  overflow: visible !important;
                  text-overflow: clip !important;
                  letter-spacing: -0.025em;
                }

                .dashboard-main-cards > p {
                  align-self: center;
                  font-size: 10px !important;
                  line-height: 1.25;
                }

                .dashboard-business-summary {
                  padding: 9px !important;
                  overflow: visible;
                }

                .dashboard-business-summary > h3 {
                  line-height: 1.2;
                }

                .dashboard-business-summary .dashboard-export-summary-cards {
                  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
                  gap: 6px !important;
                }

                .dashboard-business-summary .dashboard-payment-summary-cards {
                  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                  gap: 6px !important;
                }

                .dashboard-business-summary button {
                  overflow-wrap: anywhere;
                }

                .dashboard-stock-panel {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  min-height: 0;
                  height: 100%;
                  box-sizing: border-box;
                  margin-top: 0 !important;
                  padding: 10px !important;
                  overflow: visible;
                }

                .dashboard-stock-heading {
                  flex: 0 0 auto;
                  margin-bottom: 0 !important;
                }

                .dashboard-stock-heading h3 {
                  font-size: 14px !important;
                }

                .dashboard-stock-layout {
                  display: grid;
                  grid-template-columns: minmax(300px, 0.65fr) minmax(0, 1.35fr);
                  gap: 16px;
                  min-height: 0;
                }

                .dashboard-stock-summary,
                .dashboard-stock-chart {
                  min-width: 0;
                  min-height: 0;
                }

                .dashboard-stock-summary {
                  overflow: visible;
                }

                .dashboard-stock-unavailable {
                  margin-bottom: 8px;
                  padding: 10px;
                  border: 1px solid #e5e7eb;
                  border-radius: 7px;
                  color: #6b7280;
                  background: #f8fafc;
                  font-size: 12px;
                }

                .dashboard-stock-summary .dashboard-monthly-cards {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 5px !important;
                  margin-bottom: 5px !important;
                }

                .dashboard-stock-summary .dashboard-monthly-cards > div {
                  padding: 6px 7px !important;
                }

                .dashboard-stock-chart {
                  display: flex;
                  align-items: center;
                  margin: 0 !important;
                  padding: 0 0 0 8px !important;
                  border-top: 0 !important;
                  border-left: 1px solid #e5e7eb;
                  overflow: visible;
                }

                .dashboard-stock-chart > div,
                .dashboard-stock-chart > div > div {
                  width: 100% !important;
                  min-width: 0 !important;
                  overflow: visible !important;
                }

                .dashboard-stock-chart svg {
                  display: block;
                  max-width: 100%;
                }

                .dashboard-monthly-financial-chart {
                  min-width: 0;
                  height: 100%;
                  box-sizing: border-box;
                  padding: 12px 15px 8px;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  background: linear-gradient(155deg, #ffffff, #fbfcff);
                  box-shadow: 0 5px 18px rgba(15, 23, 42, 0.05);
                }

                .dashboard-monthly-financial-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
                .dashboard-financial-bar { transition: opacity 140ms ease, filter 140ms ease; outline: none; }
                .dashboard-financial-bar:hover,
                .dashboard-financial-bar:focus-visible { filter: brightness(0.88); stroke: #0f172a; stroke-width: 1.5; }

                .dashboard-brand-ticker {
                  height: 28px;
                  display: flex;
                  align-items: center;
                  overflow: hidden;
                  border-radius: 7px;
                  margin: 0 0 5px;
                  color: #334155;
                  background: linear-gradient(90deg, #f8fafc, #f1f7f2, #f8fafc);
                  border: 1px solid #e8eee9;
                }

                .dashboard-brand-ticker-track {
                  display: flex;
                  width: max-content;
                  align-items: center;
                  animation: ukexim-brand-ticker 34s linear infinite;
                  will-change: transform;
                }

                .dashboard-brand-ticker-track > span {
                  display: inline-flex;
                  align-items: center;
                  gap: 22px;
                  padding-right: 42px;
                  white-space: nowrap;
                  font-size: 11px;
                  letter-spacing: 0.025em;
                }

                .dashboard-brand-ticker-track strong:first-child { color: #123148; letter-spacing: 0.13em; }
                .dashboard-brand-ticker-track strong:nth-child(3) { color: #15803d; letter-spacing: 0.12em; }
                .ticker-separator { color: #c39b3b; font-size: 12px; }

                @keyframes ukexim-brand-ticker {
                  from { transform: translateX(0); }
                  to { transform: translateX(-50%); }
                }

                @media (prefers-reduced-motion: reduce) {
                  .dashboard-brand-ticker-track { animation: none; }
                  .dashboard-main-cards > div:hover { transform: none; }
                }

                .dashboard-footer {
                  flex: 0 0 auto;
                  min-height: 28px;
                  margin-top: 4px !important;
                  padding-top: 5px !important;
                }

                .dashboard-footer > div {
                  align-items: center;
                  min-height: 22px;
                }

                .dashboard-footer span,
                .dashboard-footer strong {
                  font-size: 11px !important;
                }

                @media (max-width: 1200px) {
                  .dashboard-shell {
                    height: auto;
                    min-height: 100vh;
                    overflow: visible;
                  }

                  .dashboard-page {
                    height: auto;
                    min-height: 100vh !important;
                    overflow: visible;
                  }

                  .erp-dashboard {
                    display: flex;
                    flex-direction: column;
                    gap: 9px;
                  }

                  .dashboard-main-cards {
                    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                  }

                  .dashboard-chart-layout {
                    grid-template-columns: minmax(0, 1fr);
                  }

                  .dashboard-stock-layout {
                    grid-template-columns: minmax(0, 1fr);
                  }

                  .dashboard-stock-chart {
                    border-left: 0;
                    border-top: 1px solid #e5e7eb !important;
                    padding: 6px 0 0 !important;
                  }

                  .dashboard-stock-panel {
                    overflow: visible;
                  }

                  .dashboard-stock-summary {
                    overflow: visible;
                  }

                  .dashboard-business-summary .dashboard-export-summary-cards {
                    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                  }

                  .dashboard-business-summary .dashboard-payment-summary-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                }

                @media (max-width: 800px) {
                  .dashboard-shell {
                    height: auto;
                    min-height: 100vh;
                    overflow: visible;
                  }

                  .dashboard-page {
                    height: auto;
                    min-height: 100vh !important;
                    overflow: visible;
                  }

                  .erp-dashboard {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                  }

                  .dashboard-main-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }

                  .dashboard-chart-layout {
                    grid-template-columns: minmax(0, 1fr);
                  }

                  .dashboard-monthly-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }

                  .dashboard-stock-panel {
                    overflow: visible;
                  }

                  .dashboard-stock-layout {
                    display: flex;
                    flex-direction: column;
                  }

                  .dashboard-stock-summary {
                    overflow: visible;
                  }

                  .dashboard-stock-chart {
                    border-top: 1px solid #e5e7eb !important;
                    padding-top: 8px !important;
                  }

                  .dashboard-business-summary .dashboard-export-summary-cards {
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  }

                  .dashboard-business-summary .dashboard-payment-summary-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                }

                @media (max-width: 600px) {
                  .dashboard-sidebar {
                    width: 150px !important;
                    padding: 10px !important;
                  }

                  .dashboard-page {
                    width: calc(100% - 150px) !important;
                    max-width: calc(100% - 150px) !important;
                    margin-left: 150px !important;
                    padding: 10px !important;
                  }

                  .dashboard-main-cards,
                  .dashboard-monthly-cards,
                  .dashboard-business-cards {
                    grid-template-columns: 1fr !important;
                  }

                  .dashboard-business-summary .dashboard-payment-summary-cards {
                    grid-template-columns: 1fr !important;
                  }

                  .dashboard-business-summary .dashboard-export-summary-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          PENDING PAYMENT LIST
      ===================================================== */}

      {showPendingPayments && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 2000,
            boxSizing: "border-box",
          }}
          onClick={() => setShowPendingPayments(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1000px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "10px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
              padding: "16px",
              boxSizing: "border-box",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#92400e",
                    fontSize: "18px",
                    fontWeight: 900,
                  }}
                >
                  ⏳ Pending Payment List
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    color: "#6b7280",
                    fontSize: "10px",
                  }}
                >
                    Sales marked Pending. Receipts and remaining balances are not recorded.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPendingPayments(false)}
                style={{
                  border: "none",
                  borderRadius: "6px",
                  padding: "7px 10px",
                  background: "#374151",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                ✕ Close
              </button>
            </div>

            {(() => {
              const pendingSales = dashboard.status === "ready" ? dashboard.pendingSales : [];

              if (dashboard.status === "loading") return <p role="status">Loading pending payments…</p>;
              if (dashboard.status === "error") return <p role="alert">Pending payment details are unavailable. Refresh the Dashboard to retry.</p>;
              if (pendingSales.length === 0) {
                return (
                  <div
                    style={{
                      padding: "25px",
                      textAlign: "center",
                      color: "#6b7280",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  >
                    No pending payment sales found.
                  </div>
                );
              }

              return (
                <>
                  <div
                    style={{
                      marginBottom: "10px",
                      padding: "9px 11px",
                      borderRadius: "7px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    Receipt allocations and outstanding balances are unavailable. Invoice totals below are shown for reference only.
                  </div>

                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "700px",
                        fontSize: "10px",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "#f3f4f6",
                            color: "#374151",
                          }}
                        >
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                            Sales No.
                          </th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                            Date
                          </th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                            Customer
                          </th>
                          <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                            Payment Mode
                          </th>
                          <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
                            Invoice Total (not balance)
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {pendingSales.map((sale) => (
                          <tr key={sale.id}>
                            <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                              {sale.salesNo}
                            </td>
                            <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                              {sale.salesDate}
                            </td>
                            <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                              {sale.customerName || "—"}
                            </td>
                            <td style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                              {sale.paymentMode || "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                borderBottom: "1px solid #f1f5f9",
                                textAlign: "right",
                                fontWeight: 900,
                                color: "#b45309",
                              }}
                            >
                              ₹
                              {Number(sale.invoiceTotal ?? 0).toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

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
   INTERNATIONAL EXPORT WORKSPACE
========================================================= */

function InternationalExportWorkspace({
  onOpen,
}: {
  onOpen: (
    page:
      | "export-customer"
      | "export-enquiry"
      | "export-quotation"
      | "export-proforma"
      | "export-order"
      | "export-purchase"
      | "export-stock"
      | "export-reservation"
      | "export-packing"
      | "export-shipment"
      | "export-invoice"
  ) => void;
}) {
  return (
    <main className="export-landing">
      <style>{`
        .export-landing { width:100%; min-width:0; display:grid; gap:8px; }
        .export-landing-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:2px 2px 4px; }
        .export-landing-header h1 { margin:0; color:#15364b; font-size:22px; line-height:1.2; }
        .export-landing-header p { margin:4px 0 0; color:#64748b; font-size:11px; }
        .export-landing-brand { color:#15803d; font-size:10px; font-weight:750; letter-spacing:.12em; white-space:nowrap; }
        @media (max-width: 620px) { .export-landing-header { align-items:flex-start; flex-direction:column; } .export-landing-brand { white-space:normal; } }
      `}</style>
      <header className="export-landing-header">
        <div>
          <h1>International Export</h1>
          <p>Company-scoped export source inventory, owner review and module access</p>
        </div>
        <div className="export-landing-brand">UK EXIM ENTERPRISES · UTTAM HALDI</div>
      </header>
      <BusinessSummaryPanel view="export" onOpen={(page) => onOpen(page as Parameters<typeof onOpen>[0])} />
    </main>
  );
}
/* =========================================================
   INTERNATIONAL MODULE WRAPPER
========================================================= */

function InternationalModuleWrapper({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
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
          gap: "10px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "#14532d",
            fontSize: "18px",
            fontWeight: 900,
          }}
        >
          {title}
        </div>

        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            borderRadius: "6px",
            padding: "7px 10px",
            background: "#14532d",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 800,
          }}
        >
          ← Export Workspace
        </button>
      </div>

      {children}
    </div>
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
  onClick,
  ariaLabel,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  cardStyle: React.CSSProperties;
  suffix?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="dashboard-kpi-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          "space-between",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        className="dashboard-kpi-value"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          color: "#374151",
          fontSize: "10px",
          lineHeight: 1.15,
          whiteSpace: "normal",
          minWidth: 0,
        }}
      >
        <span style={{ flexShrink: 0 }}>{icon}</span>

        <span
          style={{
            minWidth: 0,
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
          whiteSpace: "normal",
          overflowWrap: "normal",
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
  const height = 75;

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
          minWidth: 0,
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

function MonthlySalesPurchaseGraph({
  data,
}: {
  data:
    | { status: "loading" }
    | { status: "ready"; months: Array<{ month: string; sales: number; purchase: number }> }
    | { status: "error" };
}) {
  if (data.status !== "ready") {
    return (
      <section className="dashboard-monthly-financial-chart" aria-labelledby="monthly-financial-title">
        <h3 id="monthly-financial-title" style={{ margin: "0 0 3px", color: "#15364b", fontSize: 15 }}>Monthly Sales vs Purchase</h3>
        <p role={data.status === "error" ? "alert" : "status"} style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
          {data.status === "loading" ? "Loading verified PostgreSQL monthly totals…" : "Monthly business totals could not be loaded from PostgreSQL."}
        </p>
      </section>
    );
  }

  const width = 1000;
  const height = 238;
  const left = 86;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const maxValue = Math.max(1, ...data.months.flatMap((month) => [month.sales, month.purchase]));
  const ceiling = Math.pow(10, Math.floor(Math.log10(maxValue))) * Math.ceil(maxValue / Math.pow(10, Math.floor(Math.log10(maxValue))));
  const tickValue = ceiling / 4;
  const formatMoney = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAxis = (value: number) => value >= 100000 ? `₹${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L` : value >= 1000 ? `₹${(value / 1000).toLocaleString("en-IN", { maximumFractionDigits: 0 })}k` : `₹${Math.round(value)}`;
  const monthLabel = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  };
  const groupWidth = plotWidth / data.months.length;
  const barWidth = Math.min(34, groupWidth * 0.28);

  return (
    <section className="dashboard-monthly-financial-chart" aria-labelledby="monthly-financial-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 id="monthly-financial-title" style={{ margin: 0, color: "#15364b", fontSize: 15, letterSpacing: "-0.015em" }}>Monthly Sales vs Purchase</h3>
          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 11 }}>Domestic business · Last 6 months · PostgreSQL</p>
        </div>
        <div aria-label="Chart legend" style={{ display: "flex", gap: 16, color: "#475569", fontSize: 11, fontWeight: 650 }}>
          <span><i style={{ display: "inline-block", width: 9, height: 9, marginRight: 6, borderRadius: 2, background: "#16834a" }} />Sales</span>
          <span><i style={{ display: "inline-block", width: 9, height: 9, marginRight: 6, borderRadius: 2, background: "#4e79a7" }} />Purchase</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly domestic Sales and Purchase totals for the last six months, in Indian rupees">
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = ceiling - tick * tickValue;
          const y = top + (tick / 4) * plotHeight;
          return <g key={tick}>
            <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e8edf2" strokeWidth="1" />
            <text x={left - 12} y={y + 4} textAnchor="end" fill="#718096" fontSize="11">{formatAxis(value)}</text>
          </g>;
        })}
        {data.months.map((month, index) => {
          const center = left + groupWidth * (index + 0.5);
          const salesHeight = (month.sales / ceiling) * plotHeight;
          const purchaseHeight = (month.purchase / ceiling) * plotHeight;
          const xSales = center - barWidth - 2;
          const xPurchase = center + 2;
          return <g key={month.month}>
            <rect className="dashboard-financial-bar" tabIndex={0} x={xSales} y={top + plotHeight - salesHeight} width={barWidth} height={Math.max(0, salesHeight)} rx="4" fill="#16834a">
              <title>{`${monthLabel(month.month)} Sales: ${formatMoney(month.sales)}`}</title>
            </rect>
            <rect className="dashboard-financial-bar" tabIndex={0} x={xPurchase} y={top + plotHeight - purchaseHeight} width={barWidth} height={Math.max(0, purchaseHeight)} rx="4" fill="#4e79a7">
              <title>{`${monthLabel(month.month)} Purchase: ${formatMoney(month.purchase)}`}</title>
            </rect>
            <text x={center} y={height - 14} textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">{monthLabel(month.month)}</text>
          </g>;
        })}
      </svg>
    </section>
  );
}

function MonthlyStockMovementGraph({
  reports,
  status,
}: {
  reports: MonthlyStockSummary[];
  status: "loading" | "ready" | "error";
}) {
  if (reports.length === 0) {
    return (
      <div
        role={status === "error" ? "alert" : "status"}
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
        {status === "loading"
          ? "Loading verified PostgreSQL stock movements…"
          : status === "error"
            ? "Monthly stock movements could not be loaded from PostgreSQL."
            : "No verified PostgreSQL monthly stock movement data is available for this period."}
      </div>
    );
  }

  const width = 900;
  const height = 270;

  const paddingLeft = 76;
  const paddingRight = 24;
  const paddingTop = 30;
  const paddingBottom = 48;

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
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            justifyItems: "start",
            marginBottom: "4px",
            gap: "5px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
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
              gap: "10px",
              flexWrap: "nowrap",
              whiteSpace: "nowrap",
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
          height="auto"
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

          <text
            x={paddingLeft}
            y={18}
            fontSize="10"
            fontWeight="700"
            fill="#64748b"
          >
            Quantity (KG)
          </text>

          {/* Y LABELS */}

          <text
            x={
              paddingLeft - 8
            }
            y={
              paddingTop + 4
            }
            textAnchor="end"
            fontSize="11"
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
            fontSize="11"
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
                fontSize="10"
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
                    r="4"
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
                    strokeWidth="2"
                    tabIndex={0}
                    aria-label={`${item.label}, ${shortMonthLabel(reports[index].month)}: ${value.toLocaleString("en-IN", { maximumFractionDigits: 3 })} KG`}
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
                      )} KG
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
