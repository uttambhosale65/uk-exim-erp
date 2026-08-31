import {
  loadStock,
  convertToStockQty,
} from "./StockStorage";
import {
  loadProducts,
} from "../../product/components/ProductStorage";
import { loadPurchases } from "../customer/purchase/PurchaseStorage";
import { loadSales } from "../customer/sales/SalesStorage";

/* =========================================================
   MONTHLY STOCK REPORT

   IMPORTANT LOGIC
   ----------------
   StockStorage is the source of truth for CURRENT STOCK.

   For the selected month:

     Opening + Purchase - Sales = Closing

   Closing is calculated backward from CURRENT STOCK by
   reversing all purchases/sales that happened AFTER the
   selected month.

   This keeps Monthly Stock Report connected to Stock Report
   and prevents historical calculations from double-counting
   opening / purchase / sales quantities.
========================================================= */

export type MonthlyStockRow = {
  productCode: string;
  productName: string;
  unit: string;
  openingStock: number;
  purchaseQty: number;
  salesQty: number;
  closingStock: number;
};

export type MonthlyStockSummary = {
  month: string;
  openingTotal: number;
  purchaseTotal: number;
  salesTotal: number;
  closingTotal: number;
  rows: MonthlyStockRow[];
};

/* =========================================================
   NUMBER HELPER
========================================================= */

function num(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

/* =========================================================
   ROUND HELPER
========================================================= */

function round3(value: number): number {
  return Number(num(value).toFixed(3));
}

/* =========================================================
   TOTAL QUANTITY → BASE STOCK UNIT

   Monthly rows may contain packet / gram quantities in
   Opening and Closing because those values originate from
   StockStorage / Product Master.

   For summary totals we convert every product quantity to
   the same base stock unit (KG) wherever the Product Master
   provides a packet net weight or Gram unit.

   Purchase / Sales rows are already converted by
   getStockQuantity(), so this helper is used only for the
   displayed Opening / Closing stock totals.
========================================================= */

function toBaseStockQty(
  productCode: string,
  quantity: number,
  productsMap: Map<string, any>
): number {
  const value = num(quantity);
  const product = productsMap.get(productCode);

  if (!product) {
    return value;
  }

  const unit = String(product.unit || '').trim();
  const netWeight = num(product.netWeight);

  if (unit === 'Pkt' && netWeight > 0) {
    return (value * netWeight) / 1000;
  }

  if (unit === 'Gram') {
    return value / 1000;
  }

  return value;
}

/* =========================================================
   VALID YEAR / MONTH
========================================================= */

function isValidYear(year: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100
  );
}

function isValidMonth(month: number): boolean {
  return (
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

/* =========================================================
   DATE HELPER

   Supports:
   YYYY-MM-DD
   DD/MM/YYYY
   DD-MM-YYYY
   ISO Date / Date String

   Invalid / impossible dates are rejected.
========================================================= */

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  /* -------------------------------------------------------
     YYYY-MM-DD
  ------------------------------------------------------- */

  const isoMatch = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/
  );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    if (
      !isValidYear(year) ||
      !isValidMonth(month) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /* -------------------------------------------------------
     DD/MM/YYYY
  ------------------------------------------------------- */

  const slashMatch = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
  );

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    if (
      !isValidYear(year) ||
      !isValidMonth(month) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /* -------------------------------------------------------
     DD-MM-YYYY
  ------------------------------------------------------- */

  const dashMatch = text.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})/
  );

  if (dashMatch) {
    const day = Number(dashMatch[1]);
    const month = Number(dashMatch[2]);
    const year = Number(dashMatch[3]);

    if (
      !isValidYear(year) ||
      !isValidMonth(month) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  /* -------------------------------------------------------
     Native Date fallback
  ------------------------------------------------------- */

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();

  if (
    !isValidYear(year) ||
    !isValidMonth(month) ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

/* =========================================================
   MONTH KEY HELPER

   Always returns:
   YYYY-MM

   Example:
   2026-08
========================================================= */

function createMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (
    !isValidYear(year) ||
    !isValidMonth(month)
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

/* =========================================================
   GET MONTH START
========================================================= */

function getMonthStart(
  year: number,
  month: number
): Date {
  return new Date(
    year,
    month - 1,
    1
  );
}

/* =========================================================
   GET NEXT MONTH START
========================================================= */

function getNextMonthStart(
  year: number,
  month: number
): Date {
  return new Date(
    year,
    month,
    1
  );
}

/* =========================================================
   PRODUCT / STOCK HELPERS
========================================================= */

function getStockTargetCode(
  productCode: string,
  productsMap: Map<string, any>
): string {
  const product = productsMap.get(productCode);

  if (!product) {
    return productCode;
  }

  return (
    String(product.stockBaseCode || "").trim() ||
    String(product.code || productCode).trim()
  );
}

function getStockQuantity(
  productCode: string,
  quantity: unknown,
  productsMap: Map<string, any>
): number {
  const product = productsMap.get(productCode);

  if (!product) {
    return 0;
  }

  return convertToStockQty(
    num(quantity),
    String(product.unit || ""),
    num(product.netWeight)
  );
}

/* =========================================================
   GET MONTHLY REPORT

   The current StockMaster/StockStorage value is the source
   of truth for current closing stock.

   For an older month:

     Current Stock
       - Purchases after selected month
       + Sales after selected month
     = Selected Month Closing

     Selected Month Closing
       - Selected Month Purchase
       + Selected Month Sales
     = Selected Month Opening

   Therefore:

     Opening + Purchase - Sales = Closing

   exactly for the selected month, while the closing remains
   connected to the live Stock Report.
========================================================= */

export function getStockMonthlyReport(
  year: number,
  month: number
): MonthlyStockSummary {
  if (
    !isValidYear(year) ||
    !isValidMonth(month)
  ) {
    return {
      month: "",
      openingTotal: 0,
      purchaseTotal: 0,
      salesTotal: 0,
      closingTotal: 0,
      rows: [],
    };
  }

  const stock = loadStock();
  const purchases = loadPurchases();
  const sales = loadSales();
  const products = loadProducts();

  const monthStart = getMonthStart(
    year,
    month
  );

  const nextMonthStart = getNextMonthStart(
    year,
    month
  );

  const productsMap = new Map<string, any>();

  products.forEach((product) => {
    const code = String(
      product?.code || ""
    ).trim();

    if (code) {
      productsMap.set(code, product);
    }
  });

  const rowsMap = new Map<
    string,
    MonthlyStockRow
  >();

  /* =======================================================
     CURRENT STOCK MASTER

     CurrentStock is the live closing stock from StockStorage.
     We do NOT rebuild current stock from transaction history.
  ======================================================= */

  stock.forEach((item) => {
    const productCode = String(
      item?.productCode || ""
    ).trim();

    if (!productCode) {
      return;
    }

    rowsMap.set(
      productCode,
      {
        productCode,
        productName: String(
          item?.productName || ""
        ),
        unit: String(
          item?.unit || ""
        ),
        openingStock: 0,
        purchaseQty: 0,
        salesQty: 0,
        closingStock: num(
          item?.currentStock
        ),
      }
    );
  });

  /* =======================================================
     TRANSACTION AGGREGATION

     For each transaction we determine its stock-base product.
     Example:
       100 packets × 200g = 20 KG

     Packet purchase/sale therefore affects the loose/base
     stock product, exactly like StockStorage.
  ======================================================= */

  purchases.forEach((purchase) => {
    const date = parseDate(
      purchase?.purchaseDate
    );

    if (!date || !Array.isArray(purchase?.items)) {
      return;
    }

    purchase.items.forEach((item) => {
      const code = String(
        item?.productCode || ""
      ).trim();

      if (!code) {
        return;
      }

      const stockProductCode =
        getStockTargetCode(
          code,
          productsMap
        );

      const row = rowsMap.get(
        stockProductCode
      );

      if (!row) {
        return;
      }

      const qty = getStockQuantity(
        code,
        item?.qty,
        productsMap
      );

      if (qty <= 0) {
        return;
      }

      /* Purchase inside selected month */
      if (
        date >= monthStart &&
        date < nextMonthStart
      ) {
        row.purchaseQty += qty;
        return;
      }

      /*
        Purchase after selected month increases current stock.
        To reconstruct the selected month's closing, remove it.
      */
      if (date >= nextMonthStart) {
        row.closingStock -= qty;
      }
    });
  });

  sales.forEach((sale) => {
    const date = parseDate(
      sale?.salesDate
    );

    if (!date || !Array.isArray(sale?.items)) {
      return;
    }

    sale.items.forEach((item) => {
      const code = String(
        item?.productCode || ""
      ).trim();

      if (!code) {
        return;
      }

      const stockProductCode =
        getStockTargetCode(
          code,
          productsMap
        );

      const row = rowsMap.get(
        stockProductCode
      );

      if (!row) {
        return;
      }

      const qty = getStockQuantity(
        code,
        item?.qty,
        productsMap
      );

      if (qty <= 0) {
        return;
      }

      /* Sales inside selected month */
      if (
        date >= monthStart &&
        date < nextMonthStart
      ) {
        row.salesQty += qty;
        return;
      }

      /*
        Sale after selected month reduced current stock.
        Add it back to reconstruct selected month's closing.
      */
      if (date >= nextMonthStart) {
        row.closingStock += qty;
      }
    });
  });

  /* =======================================================
     CALCULATE OPENING

     Closing = Opening + Purchase - Sales

     Therefore:
     Opening = Closing - Purchase + Sales
  ======================================================= */

  rowsMap.forEach((row) => {
    row.closingStock = round3(
      row.closingStock
    );

    row.purchaseQty = round3(
      row.purchaseQty
    );

    row.salesQty = round3(
      row.salesQty
    );

    row.openingStock = round3(
      row.closingStock -
        row.purchaseQty +
        row.salesQty
    );

    row.closingStock = round3(
      row.openingStock +
        row.purchaseQty -
        row.salesQty
    );
  });

  /* =======================================================
     PRODUCT SORT
  ======================================================= */

  const rows = Array.from(
    rowsMap.values()
  ).sort((a, b) =>
    a.productCode.localeCompare(
      b.productCode
    )
  );

  /* =======================================================
     TOTALS
  ======================================================= */

  /* -------------------------------------------------------
     SUMMARY TOTALS

     Opening / Closing can contain packet quantities because
     they originate from Product Master / Stock Master.
     Convert those values to the common base unit for the
     summary cards.

     Purchase / Sales are already converted to stock-base
     quantities during transaction aggregation.
  ------------------------------------------------------- */

  const openingTotal = rows.reduce(
    (total, row) =>
      total +
      toBaseStockQty(
        row.productCode,
        row.openingStock,
        productsMap
      ),
    0
  );

  const purchaseTotal = rows.reduce(
    (total, row) =>
      total + row.purchaseQty,
    0
  );

  const salesTotal = rows.reduce(
    (total, row) =>
      total + row.salesQty,
    0
  );

  const closingTotal = rows.reduce(
    (total, row) =>
      total +
      toBaseStockQty(
        row.productCode,
        row.closingStock,
        productsMap
      ),
    0
  );

  return {
    month: `${year}-${String(
      month
    ).padStart(2, "0")}`,
    openingTotal: round3(
      openingTotal
    ),
    purchaseTotal: round3(
      purchaseTotal
    ),
    salesTotal: round3(
      salesTotal
    ),
    closingTotal: round3(
      closingTotal
    ),
    rows,
  };
}

/* =========================================================
   CURRENT MONTH
========================================================= */

export function getCurrentStockMonthlyReport(): MonthlyStockSummary {
  const today = new Date();

  return getStockMonthlyReport(
    today.getFullYear(),
    today.getMonth() + 1
  );
}

/* =========================================================
   MONTH LIST

   Used by Month Dropdown.

   Returns only valid YYYY-MM values and always includes
   the current month.
========================================================= */

export function getStockReportMonths(): string[] {
  const purchases = loadPurchases();
  const sales = loadSales();
  const months = new Set<string>();

  purchases.forEach((purchase) => {
    const date = parseDate(
      purchase?.purchaseDate
    );

    if (!date) {
      return;
    }

    const key = createMonthKey(date);

    if (key) {
      months.add(key);
    }
  });

  sales.forEach((sale) => {
    const date = parseDate(
      sale?.salesDate
    );

    if (!date) {
      return;
    }

    const key = createMonthKey(date);

    if (key) {
      months.add(key);
    }
  });

  /* Always include current month */
  const today = new Date();
  const currentKey = createMonthKey(today);

  if (currentKey) {
    months.add(currentKey);
  }

  return Array.from(months)
    .filter((key) =>
      /^\d{4}-\d{2}$/.test(key)
    )
    .filter((key) => {
      const parts = key.split("-");
      const year = Number(parts[0]);
      const month = Number(parts[1]);

      return (
        isValidYear(year) &&
        isValidMonth(month)
      );
    })
    .sort((a, b) =>
      b.localeCompare(a)
    );
}

/* =========================================================
   FORMAT MONTH

   2026-08
   → August 2026
========================================================= */

export function formatStockReportMonth(
  monthKey: string
): string {
  const match = String(
    monthKey || ""
  ).match(
    /^(\d{4})-(\d{2})$/
  );

  if (!match) {
    return "Invalid Month";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !isValidYear(year) ||
    !isValidMonth(month)
  ) {
    return "Invalid Month";
  }

  const date = new Date(
    year,
    month - 1,
    1
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
}
