import { Sales } from "./SalesTypes";

const STORAGE_KEY = "uk-exim-sales";

/* =====================================================
   LOAD SALES
===================================================== */

export function loadSales(): Sales[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored =
      localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "Error loading sales:",
      error
    );

    return [];
  }
}

/* =====================================================
   SAVE SALES
===================================================== */

export function saveSales(
  sales: Sales[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sales)
    );
  } catch (error) {
    console.error(
      "Error saving sales:",
      error
    );
  }
}

/* =====================================================
   GET NEXT SALES NUMBER

   Format:
   SAL-0001
   SAL-0002
   SAL-0003
   ...
===================================================== */

export function getNextSalesNo(
  sales: Sales[]
): string {
  if (
    !Array.isArray(sales) ||
    sales.length === 0
  ) {
    return "SAL-0001";
  }

  let maxNumber = 0;

  sales.forEach((sale) => {
    if (!sale?.salesNo) {
      return;
    }

    const match =
      String(sale.salesNo).match(
        /^SAL-(\d+)$/
      );

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > maxNumber
    ) {
      maxNumber = number;
    }
  });

  return `SAL-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

/* =====================================================
   GET NEXT INVOICE NUMBER

   Existing Invoice No. format is preserved.

   Example:
   UKN260001
   UKN260002
   UKN260003

   This function does NOT change old invoice numbers.
===================================================== */

export function getNextInvoiceNo(
  sales: Sales[]
): string {
  if (
    !Array.isArray(sales) ||
    sales.length === 0
  ) {
    return "INV-0001";
  }

  let maxNumber = 0;

  sales.forEach((sale) => {
    if (!sale?.invoiceNo) {
      return;
    }

    const match =
      String(sale.invoiceNo).match(
        /INV-(\d+)$/
      );

    if (!match) {
      return;
    }

    const number = Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > maxNumber
    ) {
      maxNumber = number;
    }
  });

  return `INV-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}

/* =====================================================
   SORT SALES - NEWEST FIRST

   Latest / current Sales entry will appear
   at the TOP of the Sales Register.

   This function does NOT change the Sales No.
===================================================== */

export function sortSalesNewestFirst(
  sales: Sales[]
): Sales[] {
  if (!Array.isArray(sales)) {
    return [];
  }

  return [...sales].sort((a, b) => {
    const dateA = new Date(
      a.salesDate || ""
    ).getTime();

    const dateB = new Date(
      b.salesDate || ""
    ).getTime();

    if (
      Number.isFinite(dateA) &&
      Number.isFinite(dateB)
    ) {
      return dateB - dateA;
    }

    return 0;
  });
}

/* =====================================================
   SORT SALES BY SALES NUMBER

   Highest Sales No. first.

   Example:

   SAL-0035
   SAL-0034
   SAL-0033
   ...
   SAL-0001
===================================================== */

export function sortSalesByNumberDesc(
  sales: Sales[]
): Sales[] {
  if (!Array.isArray(sales)) {
    return [];
  }

  return [...sales].sort((a, b) => {
    const numberA =
      Number(
        String(a.salesNo || "")
          .replace("SAL-", "")
      ) || 0;

    const numberB =
      Number(
        String(b.salesNo || "")
          .replace("SAL-", "")
      ) || 0;

    return numberB - numberA;
  });
}

/* =====================================================
   CLEAR ALL SALES

   Use only when intentionally resetting
   Sales Register.
===================================================== */

export function clearSales(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(
      STORAGE_KEY
    );
  } catch (error) {
    console.error(
      "Error clearing sales:",
      error
    );
  }
}