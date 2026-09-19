import {
  ExportCommercialInvoice,
} from "./ExportCommercialInvoiceTypes";

const STORAGE_KEY =
  "uk-exim-export-commercial-invoices";

export function loadExportCommercialInvoices(): ExportCommercialInvoice[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data =
    localStorage.getItem(STORAGE_KEY);

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function saveExportCommercialInvoices(
  invoices: ExportCommercialInvoice[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(invoices)
  );
}

export function getNextExportCommercialInvoiceNo(): string {
  const invoices =
    loadExportCommercialInvoices();

  if (invoices.length === 0) {
    return "EXP-INV-0001";
  }

  const numbers = invoices
    .map((invoice) => {
      const match =
        invoice.invoiceNo.match(
          /EXP-INV-(\d+)$/i
        );

      return match
        ? Number(match[1])
        : 0;
    })
    .filter(
      (number) =>
        Number.isFinite(number)
    );

  const highestNumber =
    numbers.length > 0
      ? Math.max(...numbers)
      : 0;

  return `EXP-INV-${String(
    highestNumber + 1
  ).padStart(4, "0")}`;
}

export function getExportCommercialInvoiceById(
  id: string
): ExportCommercialInvoice | undefined {
  return loadExportCommercialInvoices().find(
    (invoice) =>
      invoice.id === id
  );
}

export function getExportCommercialInvoiceByNo(
  invoiceNo: string
): ExportCommercialInvoice | undefined {
  return loadExportCommercialInvoices().find(
    (invoice) =>
      invoice.invoiceNo ===
      invoiceNo
  );
}