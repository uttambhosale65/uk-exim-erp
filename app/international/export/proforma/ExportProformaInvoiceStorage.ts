import { ExportProformaInvoice } from "./ExportProformaInvoiceTypes";

const STORAGE_KEY = "uk-exim-export-proforma-invoices";

export function loadExportProformaInvoices(): ExportProformaInvoice[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExportProformaInvoices(
  invoices: ExportProformaInvoice[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(invoices)
  );
}

export function getNextExportProformaInvoiceNo(
  invoices: ExportProformaInvoice[]
): string {
  if (invoices.length === 0) {
    return "EXP-PI-0001";
  }

  const maxNumber = Math.max(
    ...invoices.map((invoice) => {
      const match = invoice.proformaInvoiceNo.match(
        /EXP-PI-(\d+)/
      );

      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-PI-${String(maxNumber + 1).padStart(4, "0")}`;
}

export function getExportProformaInvoiceById(
  id: string
): ExportProformaInvoice | undefined {
  const invoices = loadExportProformaInvoices();

  return invoices.find((invoice) => invoice.id === id);
}

export function getExportProformaInvoiceByNo(
  proformaInvoiceNo: string
): ExportProformaInvoice | undefined {
  const invoices = loadExportProformaInvoices();

  return invoices.find(
    (invoice) =>
      invoice.proformaInvoiceNo === proformaInvoiceNo
  );
}