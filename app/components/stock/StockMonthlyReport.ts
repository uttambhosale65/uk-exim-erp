import { loadStock } from "./StockStorage";
import { loadPurchases } from "../customer/purchase/PurchaseStorage";
import { loadSales } from "../customer/sales/SalesStorage";

/* =========================================================
   MONTHLY STOCK REPORT
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
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
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

   Invalid / impossible dates are rejected.
========================================================= */

function parseDate(
  value: unknown
): Date | null {
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
    !isValidMonth(month)
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
   MONTHLY STOCK CALCULATION

   Opening
   + Purchase
   - Sales
   = Closing
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

  const stock =
    loadStock();

  const purchases =
    loadPurchases();

  const sales =
    loadSales();

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

  const rowsMap =
    new Map<
      string,
      MonthlyStockRow
    >();

  /* =======================================================
     CURRENT STOCK MASTER PRODUCTS
  ======================================================= */

  stock.forEach(
    (item) => {
      if (!item?.productCode) {
        return;
      }

      rowsMap.set(
        item.productCode,
        {
          productCode:
            item.productCode,

          productName:
            item.productName,

          unit:
            item.unit,

          openingStock:
            num(
              item.openingStock
            ),

          purchaseQty: 0,

          salesQty: 0,

          closingStock:
            num(
              item.openingStock
            ),
        }
      );
    }
  );

  /* =======================================================
     PURCHASE HISTORY
  ======================================================= */

  purchases.forEach(
    (purchase) => {
      const date =
        parseDate(
          purchase.purchaseDate
        );

      if (!date) {
        return;
      }

      if (
        !Array.isArray(
          purchase.items
        )
      ) {
        return;
      }

      purchase.items.forEach(
        (item) => {
          const code =
            String(
              item?.productCode || ""
            ).trim();

          if (!code) {
            return;
          }

          const qty =
            num(item?.qty);

          if (!qty) {
            return;
          }

          const row =
            rowsMap.get(code);

          if (!row) {
            return;
          }

          /* Previous months */

          if (
            date <
            monthStart
          ) {
            row.openingStock +=
              qty;

            row.closingStock +=
              qty;

            return;
          }

          /* Selected month */

          if (
            date >=
              monthStart &&
            date <
              nextMonthStart
          ) {
            row.purchaseQty +=
              qty;

            row.closingStock +=
              qty;
          }
        }
      );
    }
  );

  /* =======================================================
     SALES HISTORY
  ======================================================= */

  sales.forEach(
    (sale) => {
      const date =
        parseDate(
          sale.salesDate
        );

      if (!date) {
        return;
      }

      if (
        !Array.isArray(
          sale.items
        )
      ) {
        return;
      }

      sale.items.forEach(
        (item) => {
          const code =
            String(
              item?.productCode || ""
            ).trim();

          if (!code) {
            return;
          }

          const qty =
            num(item?.qty);

          if (!qty) {
            return;
          }

          const row =
            rowsMap.get(code);

          if (!row) {
            return;
          }

          /* Previous months */

          if (
            date <
            monthStart
          ) {
            row.openingStock -=
              qty;

            row.closingStock -=
              qty;

            return;
          }

          /* Selected month */

          if (
            date >=
              monthStart &&
            date <
              nextMonthStart
          ) {
            row.salesQty +=
              qty;

            row.closingStock -=
              qty;
          }
        }
      );
    }
  );

  /* =======================================================
     ROUND VALUES
  ======================================================= */

  rowsMap.forEach(
    (row) => {
      row.openingStock =
        Number(
          row.openingStock.toFixed(
            3
          )
        );

      row.purchaseQty =
        Number(
          row.purchaseQty.toFixed(
            3
          )
        );

      row.salesQty =
        Number(
          row.salesQty.toFixed(
            3
          )
        );

      row.closingStock =
        Number(
          row.closingStock.toFixed(
            3
          )
        );
    }
  );

  /* =======================================================
     PRODUCT SORT
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
     TOTALS
  ======================================================= */

  const openingTotal =
    rows.reduce(
      (total, row) =>
        total +
        row.openingStock,
      0
    );

  const purchaseTotal =
    rows.reduce(
      (total, row) =>
        total +
        row.purchaseQty,
      0
    );

  const salesTotal =
    rows.reduce(
      (total, row) =>
        total +
        row.salesQty,
      0
    );

  const closingTotal =
    rows.reduce(
      (total, row) =>
        total +
        row.closingStock,
      0
    );

  return {
    month:
      `${year}-${String(
        month
      ).padStart(2, "0")}`,

    openingTotal:
      Number(
        openingTotal.toFixed(
          3
        )
      ),

    purchaseTotal:
      Number(
        purchaseTotal.toFixed(
          3
        )
      ),

    salesTotal:
      Number(
        salesTotal.toFixed(
          3
        )
      ),

    closingTotal:
      Number(
        closingTotal.toFixed(
          3
        )
      ),

    rows,
  };
}

/* =========================================================
   CURRENT MONTH
========================================================= */

export function getCurrentStockMonthlyReport(): MonthlyStockSummary {
  const today =
    new Date();

  return getStockMonthlyReport(
    today.getFullYear(),
    today.getMonth() + 1
  );
}

/* =========================================================
   MONTH LIST

   Used by Month Dropdown

   IMPORTANT:
   Only valid YYYY-MM values are allowed.
========================================================= */

export function getStockReportMonths(): string[] {
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
          purchase.purchaseDate
        );

      if (!date) {
        return;
      }

      const key =
        createMonthKey(date);

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
          sale.salesDate
        );

      if (!date) {
        return;
      }

      const key =
        createMonthKey(date);

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
    createMonthKey(today);

  if (currentKey) {
    months.add(
      currentKey
    );
  }

  /* -------------------------------------------------------
     FINAL SAFETY FILTER

     Never allow:
     225-11
     99-05
     2026-13
     etc.
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
          isValidYear(year) &&
          isValidMonth(month)
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