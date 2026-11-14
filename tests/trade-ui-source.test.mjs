import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(path,import.meta.url),"utf8");
test("PostgreSQL purchase and sales screens use API master and transaction sources only",async()=>{
  const [purchase,sales]=await Promise.all([read("../app/transactions/client/PurchasePostgresMaster.tsx"),read("../app/transactions/client/SalesPostgresMaster.tsx")]);
  for(const source of [purchase,sales])assert.doesNotMatch(source,/localStorage|loadPurchases\(|savePurchases\(|loadSales\(|saveSales\(/i);
  assert.match(purchase,/\/api\/purchases/);assert.match(purchase,/\/api\/products/);assert.match(purchase,/\/api\/suppliers/);
  assert.match(sales,/\/api\/sales/);assert.match(sales,/\/api\/products/);assert.match(sales,/\/api\/customers/);
});
test("PostgreSQL stock screen and Dashboard use verified stock APIs",async()=>{
  const [stock,workspace]=await Promise.all([read("../app/transactions/client/StockPostgresMaster.tsx"),read("../app/ERPWorkspace.tsx")]);
  assert.match(stock,/\/api\/stock\/current/);assert.match(stock,/\/api\/stock\/ledger/);assert.doesNotMatch(stock,/loadStock\(|saveStock\(|localStorage/i);
  assert.match(workspace,/\/api\/stock\/current/);assert.match(workspace,/\/api\/dashboard\/summary/);assert.match(workspace,/TRADE_DATA_CHANGED_EVENT/);assert.doesNotMatch(workspace,/loadStock\(/);
  assert.doesNotMatch(workspace,/loadSuppliers\(|loadPurchases\(|loadSales\(/);
  assert.match(workspace,/databaseStockState\.rows/);assert.match(workspace,/minimumStock/);
});
test("legacy forms avoid LocalStorage master data when PostgreSQL lists are supplied",async()=>{
  const [purchase,sales]=await Promise.all([read("../app/components/customer/purchase/PurchaseForm.tsx"),read("../app/components/customer/sales/SalesForm.tsx")]);
  assert.match(purchase,/masterProducts \?\? loadProducts\(\)/);assert.match(purchase,/masterSuppliers \?\? loadSuppliers\(\)/);
  assert.match(sales,/masterCustomers \?\? loadCustomers\(\)/);assert.match(sales,/masterProducts \?\? loadProducts\(\)/);assert.match(sales,/existingSales \?\? loadSales\(\)/);
});

test("Purchase invoice required status agrees with the server transaction contract",async()=>{
  const source=await read("../app/components/customer/purchase/PurchaseForm.tsx");
  assert.match(source,/Please enter Supplier Invoice No\./);
  assert.match(source,/Supplier Invoice No\. <span[^>]*>\*<\/span>/);
  assert.match(source,/type="text"\s+required\s+value=\{\s*purchase\.invoiceNo/);
});

test("Sales edit retains the existing transaction number for confirmation",async()=>{
  const source=await read("../app/components/customer/sales/SalesForm.tsx");
  assert.match(source,/salesNo: editingSale\?\.salesNo \?\? salesNo/);
});

test("Stock summary separates net transaction totals from gross immutable ledger events",async()=>{
  const [dal,table]=await Promise.all([read("../app/transactions/server/stock-dal.mjs"),read("../app/components/stock/StockTable.tsx")]);
  assert.match(dal,/transaction_line_net/);
  assert.match(dal,/GROUP BY company_id,transaction_type,transaction_id,line_id,stock_code/);
  assert.match(dal,/gross_purchase/);
  assert.match(dal,/gross_sales/);
  assert.match(dal,/b\.current_stock\+coalesce\(gm\.net_delta,0\)/);
  assert.match(table,/Net Purchase/);
  assert.match(table,/Gross Ledger In/);
  assert.match(table,/Gross Ledger Out/);
});
