import {
  loadStock,
  convertToStockQty,
} from "./StockStorage";

import {
  loadProducts,
} from "../../product/components/ProductStorage";

import {
  loadPurchases,
} from "../customer/purchase/PurchaseStorage";

import {
  loadSales,
} from "../customer/sales/SalesStorage";

/* =========================================================
   MONTHLY STOCK REPORT

   VERSION 1.1
   ---------------------------------------------------------
   IMPORTANT STOCK ACCOUNTING RULE

   For every selected month:

     Opening + Purchase - Sales = Closing

   StockStorage remains the source of truth for CURRENT STOCK.

   Purchase / Sales quantities are converted into the same
   stock-base quantity used by StockStorage.

   For summary totals:

     Closing = actual calculated closing stock
     Purchase = converted monthly purchase
     Sales = converted monthly sales
     Opening = Closing - Purchase + Sales

   This guarantees that the four summary values always
   reconcile mathematically.
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

function num(
  value: unknown
): number {
  const result =
    Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

/* =========================================================
   ROUND HELPER

   ERP stock quantities are displayed up to 3 decimals.

   Example:
   135.49499999999995
   →
   135.495
========================================================= */

function round3(
  value: number
): number {
  return Number(
    num(value).toFixed(3)
  );
}

/* =========================================================
   STOCK QUANTITY → BASE KG

   Used when a Stock row itself is stored as packet quantity.

   Packet:
     Qty × Net Weight(g) ÷ 1000

   Gram:
     Qty ÷ 1000

   KG:
     Qty as-is
========================================================= */

function toBaseStockQty(
  productCode: string,
  quantity: number,
  productsMap: Map<string, any>
): number {
  const value =
    num(quantity);

  const product =
    productsMap.get(
      productCode
    );

  if (!product) {
    return value;
  }

  const unit =
    String(
      product.unit || ""
    ).trim();

  const netWeight =
    num(
      product.netWeight
    );

  if (
    unit === "Pkt" &&
    netWeight > 0
  ) {
    return (
      value *
      netWeight
    ) / 1000;
  }

  if (
    unit === "Gram"
  ) {
    return value / 1000;
  }

  return value;
}

/* =========================================================
   VALID YEAR
========================================================= */

function isValidYear(
  year: number
): boolean {
  return (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100
  );
}

/* =========================================================
   VALID MONTH
========================================================= */

function isValidMonth(
  month: number
): boolean {
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
   Native Date strings
========================================================= */

function parseDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  /* -------------------------------------------------------
     YYYY-MM-DD
  ------------------------------------------------------- */

  const isoMatch =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})/
    );

  if (isoMatch) {
    const year =
      Number(isoMatch[1]);

    const month =
      Number(isoMatch[2]);

    const day =
      Number(isoMatch[3]);

    if (
      !isValidYear(year) ||
      !isValidMonth(month) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      return null;
    }

    return date;
  }

  /* -------------------------------------------------------
     DD/MM/YYYY
  ------------------------------------------------------- */

  const slashMatch =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
    );

  if (slashMatch) {
    const day =
      Number(slashMatch[1]);

    const month =
      Number(slashMatch[2]);

    const year =
      Number(slashMatch[3]);

    if (
      !isValidYear(year) ||
      !isValidMonth(month) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      return null;
    }

    return date;
  }

  /* -------------------------------------------------------
     DD-MM-YYYY
  ------------------------------------------------------- */

  const dashMatch =
    text.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})/
    );

  if (dashMatch) {
    const day =
      Number(dashMatch[1]);

    const month =
      Number(dashMatch[2]);

    const year =
      Number(dashMatch[3]);

    if (
      !isValidYear(year) ||
      !isValidMonth(month) ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      return null;
    }

    return date;
  }

  /* -------------------------------------------------------
     Native Date fallback
  ------------------------------------------------------- */

  const parsed =
    new Date(text);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  const year =
    parsed.getFullYear();

  const month =
    parsed.getMonth() + 1;

  const day =
    parsed.getDate();

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
   MONTH KEY
========================================================= */

function createMonthKey(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    date.getMonth() + 1;

  if (
    !isValidYear(year) ||
    !isValidMonth(month)
  ) {
    return "";
  }

  return `${year}-${String(
    month
  ).padStart(2, "0")}`;
}

/* =========================================================
   MONTH START
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
   NEXT MONTH START
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
   PRODUCT → STOCK TARGET

   Packed products can point to a loose/base product.

   Example:

   P0001 → P0006
   P0002 → P0006
   P0003 → P0006

   Purchase/Sales quantities are converted to the
   base stock quantity before aggregation.
========================================================= */

function getStockTargetCode(
  productCode: string,
  productsMap: Map<string, any>
): string {
  const product =
    productsMap.get(
      productCode
    );

  if (!product) {
    return productCode;
  }

  return (
    String(
      product.stockBaseCode || ""
    ).trim() ||
    String(
      product.code ||
        productCode
    ).trim()
  );
}

/* =========================================================
   PRODUCT QTY → STOCK QTY

   This uses the same conversion function used by
   StockStorage.

   Therefore Monthly Report and StockStorage use
   the same packet → KG calculation.
========================================================= */

function getStockQuantity(
  productCode: string,
  quantity: unknown,
  productsMap: Map<string, any>
): number {
  const product =
    productsMap.get(
      productCode
    );

  if (!product) {
    return 0;
  }

  return convertToStockQty(
    num(quantity),
    String(
      product.unit || ""
    ),
    num(
      product.netWeight
    )
  );
}

/* =========================================================
   GET MONTHLY REPORT
========================================================= */

export function getStockMonthlyReport(
  year: number,
  month: number
): MonthlyStockSummary {
  /* -------------------------------------------------------
     INVALID DATE
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     LOAD DATA
  ------------------------------------------------------- */

  const stock =
    loadStock();

  const purchases =
    loadPurchases();

  const sales =
    loadSales();

  const products =
    loadProducts();

  /* -------------------------------------------------------
     MONTH RANGE
  ------------------------------------------------------- */

  const monthStart =
    getMonthStart(
      year,
      month
    );

  const nextMonthStart =
    getNextMonthStart(
      year,
      month
    );

  /* -------------------------------------------------------
     PRODUCT MAP
  ------------------------------------------------------- */

  const productsMap =
    new Map<string, any>();

  products.forEach(
    (product) => {
      const code =
        String(
          product?.code || ""
        ).trim();

      if (code) {
        productsMap.set(
          code,
          product
        );
      }
    }
  );

  /* -------------------------------------------------------
     ROW MAP
  ------------------------------------------------------- */

  const rowsMap =
    new Map<
      string,
      MonthlyStockRow
    >();

  /* =======================================================
     CURRENT STOCK MASTER

     StockStorage remains the source of truth.

     Current stock is NOT rebuilt from all historical
     transactions.
  ======================================================= */

  stock.forEach(
    (item) => {
      const productCode =
        String(
          item?.productCode || ""
        ).trim();

      if (!productCode) {
        return;
      }

      rowsMap.set(
        productCode,
        {
          productCode,

          productName:
            String(
              item?.productName ||
                ""
            ),

          unit:
            String(
              item?.unit || ""
            ),

          openingStock: 0,

          purchaseQty: 0,

          salesQty: 0,

          closingStock:
            num(
              item?.currentStock
            ),
        }
      );
    }
  );

  /* =======================================================
     PURCHASE TRANSACTIONS
  ======================================================= */

  purchases.forEach(
    (purchase) => {
      const date =
        parseDate(
          purchase?.purchaseDate
        );

      if (
        !date ||
        !Array.isArray(
          purchase?.items
        )
      ) {
        return;
      }

      purchase.items.forEach(
        (item) => {
          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (!code) {
            return;
          }

          const stockProductCode =
            getStockTargetCode(
              code,
              productsMap
            );

          const row =
            rowsMap.get(
              stockProductCode
            );

          if (!row) {
            return;
          }

          const qty =
            getStockQuantity(
              code,
              item?.qty,
              productsMap
            );

          if (qty <= 0) {
            return;
          }

          /* ------------------------------------------------
             PURCHASE INSIDE SELECTED MONTH
          ------------------------------------------------ */

          if (
            date >=
              monthStart &&
            date <
              nextMonthStart
          ) {
            row.purchaseQty +=
              qty;

            return;
          }

          /* ------------------------------------------------
             PURCHASE AFTER SELECTED MONTH

             Current stock already includes this purchase.

             Remove it to reconstruct the selected month's
             closing stock.
          ------------------------------------------------ */

          if (
            date >=
            nextMonthStart
          ) {
            row.closingStock -=
              qty;
          }
        }
      );
    }
  );

  /* =======================================================
     SALES TRANSACTIONS
  ======================================================= */

  sales.forEach(
    (sale) => {
      const date =
        parseDate(
          sale?.salesDate
        );

      if (
        !date ||
        !Array.isArray(
          sale?.items
        )
      ) {
        return;
      }

      sale.items.forEach(
        (item) => {
          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (!code) {
            return;
          }

          const stockProductCode =
            getStockTargetCode(
              code,
              productsMap
            );

          const row =
            rowsMap.get(
              stockProductCode
            );

          if (!row) {
            return;
          }

          const qty =
            getStockQuantity(
              code,
              item?.qty,
              productsMap
            );

          if (qty <= 0) {
            return;
          }

          /* ------------------------------------------------
             SALES INSIDE SELECTED MONTH
          ------------------------------------------------ */

          if (
            date >=
              monthStart &&
            date <
              nextMonthStart
          ) {
            row.salesQty +=
              qty;

            return;
          }

          /* ------------------------------------------------
             SALES AFTER SELECTED MONTH

             Current stock already includes this reduction.

             Add it back to reconstruct the selected month's
             closing stock.
          ------------------------------------------------ */

          if (
            date >=
            nextMonthStart
          ) {
            row.closingStock +=
              qty;
          }
        }
      );
    }
  );

  /* =======================================================
     ROW-LEVEL ACCOUNTING

     Opening + Purchase - Sales = Closing

     Therefore:

     Opening =
       Closing - Purchase + Sales
  ======================================================= */

  rowsMap.forEach(
    (row) => {
      row.closingStock =
        round3(
          row.closingStock
        );

      row.purchaseQty =
        round3(
          row.purchaseQty
        );

      row.salesQty =
        round3(
          row.salesQty
        );

      row.openingStock =
        round3(
          row.closingStock -
            row.purchaseQty +
            row.salesQty
        );

      /*
        Recalculate closing once again from the
        accounting equation.

        This removes floating-point noise.
      */

      row.closingStock =
        round3(
          row.openingStock +
            row.purchaseQty -
            row.salesQty
        );
    }
  );

  /* =======================================================
     SORT ROWS
  ======================================================= */

  const rows =
    Array.from(
      rowsMap.values()
    ).sort(
      (a, b) =>
        a.productCode.localeCompare(
          b.productCode
        )
    );

  /* =======================================================
     TRANSACTION TOTALS
  ======================================================= */

  const purchaseTotal =
    round3(
      rows.reduce(
        (total, row) =>
          total +
          num(
            row.purchaseQty
          ),
        0
      )
    );

  const salesTotal =
    round3(
      rows.reduce(
        (total, row) =>
          total +
          num(
            row.salesQty
          ),
        0
      )
    );

  /* =======================================================
     CLOSING TOTAL

     Important:

     Stock rows can be stored in packet quantities.

     Therefore each row's closing stock is converted to
     the common base KG before calculating the summary.

     This follows the same packet → KG conversion used
     by StockMaster.
  ======================================================= */

  const closingTotal =
    round3(
      rows.reduce(
        (total, row) =>
          total +
          toBaseStockQty(
            row.productCode,
            row.closingStock,
            productsMap
          ),
        0
      )
    );

  /* =======================================================
     OPENING TOTAL

     IMPORTANT VERSION 1.1 FIX

     Do NOT independently sum packet opening quantities
     and then compare them with converted transaction totals.

     Instead use the accounting identity:

       Opening + Purchase - Sales = Closing

     Therefore:

       Opening = Closing - Purchase + Sales

     This guarantees the summary cards always reconcile.
  ======================================================= */

  const openingTotal =
    round3(
      closingTotal -
        purchaseTotal +
        salesTotal
    );

  /* =======================================================
     FINAL RECONCILIATION

     Final closing is calculated from the four-value
     accounting relationship.

     This prevents floating point mismatch such as:

       135.49499999999995
  ======================================================= */

  const reconciledClosingTotal =
    round3(
      openingTotal +
        purchaseTotal -
        salesTotal
    );

  return {
    month:
      `${year}-${String(
        month
      ).padStart(2, "0")}`,

    openingTotal,

    purchaseTotal,

    salesTotal,

    closingTotal:
      reconciledClosingTotal,

    rows,
  };
}

/* =========================================================
   CURRENT MONTH REPORT
========================================================= */

export function getCurrentStockMonthlyReport():
  MonthlyStockSummary {
  const today =
    new Date();

  return getStockMonthlyReport(
    today.getFullYear(),
    today.getMonth() + 1
  );
}

/* =========================================================
   GET AVAILABLE REPORT MONTHS
========================================================= */

export function getStockReportMonths():
  string[] {
  const purchases =
    loadPurchases();

  const sales =
    loadSales();

  const months =
    new Set<string>();

  /* -------------------------------------------------------
     PURCHASE MONTHS
  ------------------------------------------------------- */

  purchases.forEach(
    (purchase) => {
      const date =
        parseDate(
          purchase?.purchaseDate
        );

      if (!date) {
        return;
      }

      const key =
        createMonthKey(
          date
        );

      if (key) {
        months.add(key);
      }
    }
  );

  /* -------------------------------------------------------
     SALES MONTHS
  ------------------------------------------------------- */

  sales.forEach(
    (sale) => {
      const date =
        parseDate(
          sale?.salesDate
        );

      if (!date) {
        return;
      }

      const key =
        createMonthKey(
          date
        );

      if (key) {
        months.add(key);
      }
    }
  );

  /* -------------------------------------------------------
     ALWAYS INCLUDE CURRENT MONTH
  ------------------------------------------------------- */

  const today =
    new Date();

  const currentKey =
    createMonthKey(
      today
    );

  if (currentKey) {
    months.add(
      currentKey
    );
  }

  /* -------------------------------------------------------
     VALIDATE + SORT

     Newest month first.
  ------------------------------------------------------- */

  return Array.from(
    months
  )
    .filter(
      (key) =>
        /^\d{4}-\d{2}$/.test(
          key
        )
    )
    .filter(
      (key) => {
        const parts =
          key.split("-");

        const year =
          Number(parts[0]);

        const month =
          Number(parts[1]);

        return (
          isValidYear(
            year
          ) &&
          isValidMonth(
            month
          )
        );
      }
    )
    .sort(
      (a, b) =>
        b.localeCompare(a)
    );
}

/* =========================================================
   FORMAT MONTH

   Example:

   2026-08
   →
   August 2026
========================================================= */

export function formatStockReportMonth(
  monthKey: string
): string {
  const match =
    String(
      monthKey || ""
    ).match(
      /^(\d{4})-(\d{2})$/
    );

  if (!match) {
    return "Invalid Month";
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  if (
    !isValidYear(year) ||
    !isValidMonth(month)
  ) {
    return "Invalid Month";
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
      month: "long",
      year: "numeric",
    }
  );
}