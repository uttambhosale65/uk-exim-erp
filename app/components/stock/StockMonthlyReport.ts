import {
  convertToStockQty,
  loadStock,
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

   FINAL ACCOUNTING MODEL
   ---------------------------------------------------------

   ACCOUNTING RULE:

      Opening Stock
      + Purchase
      - Sales
      = Closing Stock

   MONTHLY RULE:

      Monthly Opening
      =
      Initial Opening Stock
      + All Purchases before selected month
      - All Sales before selected month

      Monthly Closing
      =
      Monthly Opening
      + Current Month Purchases
      - Current Month Sales

   IMPORTANT:

   1. StockStorage remains the source of truth for current
      stock and stored Opening Stock.

   2. Purchase transactions are ALWAYS Purchase
      transactions.

   3. Sales transactions are ALWAYS Sales transactions.

   4. The earliest Purchase is NOT treated as Opening Stock.

   5. No Purchase transaction is excluded from the
      Purchase column.

   6. Opening Stock is taken from the stored Stock records.

   7. Opening Stock is converted into the stock/base product
      quantity when required.

   8. No artificial Opening value is created.

   9. No Math.max(0, opening) is used.

   10. If historical Sales occurred before sufficient
       Opening/Purchase stock existed, the report may show
       negative stock. This represents the actual transaction
       sequence and must not be hidden.

   11. Packet / Gram / KG quantities are converted using the
       same convertToStockQty logic used by StockStorage.

   12. Closing Stock must reconcile with the transaction
       accounting model.

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
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

/* =========================================================
   ROUND HELPER
========================================================= */

function round3(
  value: number
): number {
  return Number(
    num(value).toFixed(3)
  );
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

   Supported formats:

   YYYY-MM-DD
   DD/MM/YYYY
   DD-MM-YYYY

   Native Date is used only as a final fallback.
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

  const parsed =
    new Date(text);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
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
========================================================= */

function getStockTargetCode(
  productCode: string,
  productsMap: Map<string, any>
): string {

  const code =
    String(
      productCode || ""
    ).trim();

  if (!code) {
    return "";
  }

  const product =
    productsMap.get(code);

  if (!product) {
    return code;
  }

  return (
    String(
      product.stockBaseCode || ""
    ).trim() ||
    String(
      product.code || code
    ).trim()
  );
}

/* =========================================================
   PRODUCT QTY → STOCK QTY
========================================================= */

function getStockQuantity(
  productCode: string,
  quantity: unknown,
  productsMap: Map<string, any>
): number {

  const qty =
    num(quantity);

  if (qty <= 0) {
    return 0;
  }

  const product =
    productsMap.get(
      productCode
    );

  if (!product) {
    return qty;
  }

  return convertToStockQty(
    qty,
    String(
      product.unit || ""
    ),
    num(
      product.netWeight
    )
  );
}

/* =========================================================
   INITIAL OPENING STOCK MAP

   StockStorage stores Opening Stock in the product's own
   unit.

   Example:

      P0002
      Unit = Pkt
      Opening = 132 Pkt
      Net Weight = 100g

      132 Pkt
      × 100g
      ÷ 1000
      =
      13.200 KG

   If P0002 maps to P0006, that opening quantity is added
   to P0006's stock/base product.
========================================================= */

function getInitialOpeningMap(
  stockRecords: any[],
  productsMap: Map<string, any>
): Map<string, number> {

  const openingMap =
    new Map<string, number>();

  stockRecords.forEach(
    (stockItem) => {

      const productCode =
        String(
          stockItem?.productCode ||
            ""
        ).trim();

      if (!productCode) {
        return;
      }

      const targetCode =
        getStockTargetCode(
          productCode,
          productsMap
        );

      if (!targetCode) {
        return;
      }

      const openingQty =
        getStockQuantity(
          productCode,
          stockItem?.openingStock,
          productsMap
        );

      if (
        Math.abs(openingQty) <=
        0.0000001
      ) {
        return;
      }

      openingMap.set(
        targetCode,
        round3(
          num(
            openingMap.get(
              targetCode
            )
          ) + openingQty
        )
      );
    }
  );

  return openingMap;
}

/* =========================================================
   PURCHASE QUANTITY BEFORE SELECTED MONTH
========================================================= */

function getPurchaseBeforeMonth(
  purchases: any[],
  monthStart: Date,
  productCode: string,
  productsMap: Map<string, any>
): number {

  let total = 0;

  purchases.forEach(
    (purchase) => {

      const date =
        parseDate(
          purchase?.purchaseDate
        );

      if (
        !date ||
        date >= monthStart ||
        !Array.isArray(
          purchase?.items
        )
      ) {
        return;
      }

      purchase.items.forEach(
        (item: any) => {

          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (!code) {
            return;
          }

          const target =
            getStockTargetCode(
              code,
              productsMap
            );

          if (
            target !==
            productCode
          ) {
            return;
          }

          total +=
            getStockQuantity(
              code,
              item?.qty,
              productsMap
            );
        }
      );
    }
  );

  return round3(total);
}

/* =========================================================
   SALES QUANTITY BEFORE SELECTED MONTH
========================================================= */

function getSalesBeforeMonth(
  sales: any[],
  monthStart: Date,
  productCode: string,
  productsMap: Map<string, any>
): number {

  let total = 0;

  sales.forEach(
    (sale) => {

      const date =
        parseDate(
          sale?.salesDate
        );

      if (
        !date ||
        date >= monthStart ||
        !Array.isArray(
          sale?.items
        )
      ) {
        return;
      }

      sale.items.forEach(
        (item: any) => {

          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (!code) {
            return;
          }

          const target =
            getStockTargetCode(
              code,
              productsMap
            );

          if (
            target !==
            productCode
          ) {
            return;
          }

          total +=
            getStockQuantity(
              code,
              item?.qty,
              productsMap
            );
        }
      );
    }
  );

  return round3(total);
}

/* =========================================================
   MONTHLY PURCHASE QUANTITY

   IMPORTANT:

   Every Purchase transaction in the selected month is
   counted.

   There is NO baseline Purchase exclusion.

   A Purchase is a Purchase.
========================================================= */

function getMonthlyPurchaseQuantity(
  purchases: any[],
  monthStart: Date,
  nextMonthStart: Date,
  productCode: string,
  productsMap: Map<string, any>
): number {

  let total = 0;

  purchases.forEach(
    (purchase) => {

      const date =
        parseDate(
          purchase?.purchaseDate
        );

      if (
        !date ||
        date < monthStart ||
        date >= nextMonthStart ||
        !Array.isArray(
          purchase?.items
        )
      ) {
        return;
      }

      purchase.items.forEach(
        (item: any) => {

          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (!code) {
            return;
          }

          const target =
            getStockTargetCode(
              code,
              productsMap
            );

          if (
            target !==
            productCode
          ) {
            return;
          }

          total +=
            getStockQuantity(
              code,
              item?.qty,
              productsMap
            );
        }
      );
    }
  );

  return round3(total);
}

/* =========================================================
   MONTHLY SALES QUANTITY
========================================================= */

function getMonthlySalesQuantity(
  sales: any[],
  monthStart: Date,
  nextMonthStart: Date,
  productCode: string,
  productsMap: Map<string, any>
): number {

  let total = 0;

  sales.forEach(
    (sale) => {

      const date =
        parseDate(
          sale?.salesDate
        );

      if (
        !date ||
        date < monthStart ||
        date >= nextMonthStart ||
        !Array.isArray(
          sale?.items
        )
      ) {
        return;
      }

      sale.items.forEach(
        (item: any) => {

          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (!code) {
            return;
          }

          const target =
            getStockTargetCode(
              code,
              productsMap
            );

          if (
            target !==
            productCode
          ) {
            return;
          }

          total +=
            getStockQuantity(
              code,
              item?.qty,
              productsMap
            );
        }
      );
    }
  );

  return round3(total);
}

/* =========================================================
   GET FIRST TRANSACTION DATE
========================================================= */

function getFirstTransactionDate(
  purchases: any[],
  sales: any[]
): Date | null {

  let firstDate:
    Date | null = null;

  purchases.forEach(
    (purchase) => {

      const date =
        parseDate(
          purchase?.purchaseDate
        );

      if (
        !date
      ) {
        return;
      }

      if (
        !firstDate ||
        date < firstDate
      ) {
        firstDate =
          date;
      }
    }
  );

  sales.forEach(
    (sale) => {

      const date =
        parseDate(
          sale?.salesDate
        );

      if (
        !date
      ) {
        return;
      }

      if (
        !firstDate ||
        date < firstDate
      ) {
        firstDate =
          date;
      }
    }
  );

  return firstDate;
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

  const purchases =
    loadPurchases();

  const sales =
    loadSales();

  const products =
    loadProducts();

  const stockRecords =
    loadStock();

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

  const selectedMonthKey =
    `${year}-${String(
      month
    ).padStart(2, "0")}`;

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
     INITIAL OPENING STOCK

     This comes ONLY from StockStorage.

     No value is calculated here as an artificial Opening.
  ------------------------------------------------------- */

  const initialOpeningMap =
    getInitialOpeningMap(
      stockRecords,
      productsMap
    );

  /* -------------------------------------------------------
     FIRST TRANSACTION

     Used only to determine whether a selected month is
     before the ERP transaction history.

     It does NOT establish Opening Stock.
  ------------------------------------------------------- */

  const firstTransactionDate =
    getFirstTransactionDate(
      purchases,
      sales
    );

  if (
    firstTransactionDate
  ) {

    const firstTransactionMonth =
      getMonthStart(
        firstTransactionDate.getFullYear(),
        firstTransactionDate.getMonth() + 1
      );

    if (
      monthStart <
      firstTransactionMonth
    ) {

      /*
        If there is no transaction in the selected month or
        before it, but Opening Stock exists, the report can
        still show the Opening Stock.

        Otherwise return an empty report.
      */

      let hasOpeningStock =
        false;

      initialOpeningMap.forEach(
        (value) => {

          if (
            Math.abs(value) >
            0.0005
          ) {
            hasOpeningStock =
              true;
          }
        }
      );

      if (!hasOpeningStock) {

        return {
          month:
            selectedMonthKey,

          openingTotal: 0,

          purchaseTotal: 0,

          salesTotal: 0,

          closingTotal: 0,

          rows: [],
        };
      }
    }
  }

  /* =======================================================
     BASE PRODUCT MAP
  ======================================================= */

  const baseProductsMap =
    new Map<
      string,
      {
        productCode: string;
        productName: string;
        unit: string;
      }
    >();

  products.forEach(
    (product) => {

      const code =
        String(
          product?.code || ""
        ).trim();

      if (!code) {
        return;
      }

      const stockTarget =
        getStockTargetCode(
          code,
          productsMap
        );

      /*
        Only base products are displayed as stock rows.

        Packet products that map to a base product are
        included in that base product's quantity.
      */

      if (
        stockTarget !== code
      ) {
        return;
      }

      baseProductsMap.set(
        stockTarget,
        {
          productCode:
            stockTarget,

          productName:
            String(
              product?.name ||
                ""
            ),

          unit:
            String(
              product?.unit ||
                "KG"
            ),
        }
      );
    }
  );

  /* =======================================================
     ROW MAP
  ======================================================= */

  const rowsMap =
    new Map<
      string,
      MonthlyStockRow
    >();

  /* -------------------------------------------------------
     ADD BASE PRODUCTS
  ------------------------------------------------------- */

  baseProductsMap.forEach(
    (
      product,
      productCode
    ) => {

      rowsMap.set(
        productCode,
        {
          productCode,

          productName:
            product.productName,

          unit:
            product.unit,

          openingStock: 0,

          purchaseQty: 0,

          salesQty: 0,

          closingStock: 0,
        }
      );
    }
  );

  /* =======================================================
     ENSURE TRANSACTION ROW
  ======================================================= */

  const ensureTransactionRow =
    (
      productCode: string
    ): MonthlyStockRow | null => {

      const stockCode =
        getStockTargetCode(
          productCode,
          productsMap
        );

      if (!stockCode) {
        return null;
      }

      const existing =
        rowsMap.get(
          stockCode
        );

      if (existing) {
        return existing;
      }

      const baseProduct =
        productsMap.get(
          stockCode
        );

      const transactionProduct =
        productsMap.get(
          productCode
        );

      const displayProduct =
        baseProduct ||
        transactionProduct;

      const row:
        MonthlyStockRow = {

        productCode:
          stockCode,

        productName:
          String(
            displayProduct?.name ||
              stockCode
          ),

        unit:
          String(
            displayProduct?.unit ||
              "KG"
          ),

        openingStock: 0,

        purchaseQty: 0,

        salesQty: 0,

        closingStock: 0,
      };

      rowsMap.set(
        stockCode,
        row
      );

      return row;
    };

  /* =======================================================
     COLLECT PURCHASE PRODUCTS
  ======================================================= */

  purchases.forEach(
    (purchase) => {

      if (
        !Array.isArray(
          purchase?.items
        )
      ) {
        return;
      }

      purchase.items.forEach(
        (item: any) => {

          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (code) {
            ensureTransactionRow(
              code
            );
          }
        }
      );
    }
  );

  /* =======================================================
     COLLECT SALES PRODUCTS
  ======================================================= */

  sales.forEach(
    (sale) => {

      if (
        !Array.isArray(
          sale?.items
        )
      ) {
        return;
      }

      sale.items.forEach(
        (item: any) => {

          const code =
            String(
              item?.productCode ||
                ""
            ).trim();

          if (code) {
            ensureTransactionRow(
              code
            );
          }
        }
      );
    }
  );

  /* =======================================================
     COLLECT OPENING STOCK PRODUCTS

     If Opening Stock exists for a product which is not
     already represented by a transaction, make sure it is
     visible in the report.
  ======================================================= */

  initialOpeningMap.forEach(
    (
      _openingQty,
      productCode
    ) => {

      ensureTransactionRow(
        productCode
      );
    }
  );

  /* =======================================================
     CALCULATE ACCOUNTING VALUES
  ======================================================= */

  rowsMap.forEach(
    (row) => {

      /* -----------------------------------------------
         INITIAL OPENING STOCK
      ------------------------------------------------ */

      const initialOpening =
        round3(
          num(
            initialOpeningMap.get(
              row.productCode
            )
          )
        );

      /* -----------------------------------------------
         PURCHASES BEFORE CURRENT MONTH
      ------------------------------------------------ */

      const previousPurchases =
        getPurchaseBeforeMonth(
          purchases,
          monthStart,
          row.productCode,
          productsMap
        );

      /* -----------------------------------------------
         SALES BEFORE CURRENT MONTH
      ------------------------------------------------ */

      const previousSales =
        getSalesBeforeMonth(
          sales,
          monthStart,
          row.productCode,
          productsMap
        );

      /* -----------------------------------------------
         MONTHLY OPENING

         Initial Opening
         + Previous Purchases
         - Previous Sales
      ------------------------------------------------ */

      row.openingStock =
        round3(
          initialOpening +
            previousPurchases -
            previousSales
        );

      /* -----------------------------------------------
         CURRENT MONTH PURCHASE

         ALL purchases are included.

         No Purchase is excluded.
      ------------------------------------------------ */

      row.purchaseQty =
        getMonthlyPurchaseQuantity(
          purchases,
          monthStart,
          nextMonthStart,
          row.productCode,
          productsMap
        );

      /* -----------------------------------------------
         CURRENT MONTH SALES
      ------------------------------------------------ */

      row.salesQty =
        getMonthlySalesQuantity(
          sales,
          monthStart,
          nextMonthStart,
          row.productCode,
          productsMap
        );

      /* -----------------------------------------------
         MONTHLY CLOSING

         Opening
         + Purchase
         - Sales
      ------------------------------------------------ */

      row.closingStock =
        round3(
          row.openingStock +
            row.purchaseQty -
            row.salesQty
        );
    }
  );

  /* =======================================================
     REMOVE COMPLETELY EMPTY ROWS
  ======================================================= */

  const rows =
    Array.from(
      rowsMap.values()
    )
      .filter(
        (row) =>
          Math.abs(
            row.openingStock
          ) > 0.0005 ||
          Math.abs(
            row.purchaseQty
          ) > 0.0005 ||
          Math.abs(
            row.salesQty
          ) > 0.0005 ||
          Math.abs(
            row.closingStock
          ) > 0.0005
      )
      .sort(
        (a, b) =>
          a.productCode.localeCompare(
            b.productCode,
            undefined,
            {
              numeric: true,
            }
          )
      );

  /* =======================================================
     SUMMARY TOTALS
  ======================================================= */

  const openingTotal =
    round3(
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          row.openingStock,
        0
      )
    );

  const purchaseTotal =
    round3(
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          row.purchaseQty,
        0
      )
    );

  const salesTotal =
    round3(
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          row.salesQty,
        0
      )
    );

  const closingTotal =
    round3(
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          row.closingStock,
        0
      )
    );

  /* =======================================================
     RETURN REPORT
  ======================================================= */

  return {
    month:
      selectedMonthKey,

    openingTotal,

    purchaseTotal,

    salesTotal,

    closingTotal,

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

  const stockRecords =
    loadStock();

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
     OPENING STOCK

     Opening Stock itself has no date in the current Stock
     model, so it does not create a historical month here.

     It is applied as the initial balance to transaction
     history.
  ------------------------------------------------------- */

  void stockRecords;

  /* -------------------------------------------------------
     CURRENT MONTH
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
     SORT NEWEST FIRST
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