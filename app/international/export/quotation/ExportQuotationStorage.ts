import { ExportQuotation } from "./ExportQuotationTypes";

const STORAGE_KEY = "uk-exim-export-quotations";

export function loadExportQuotations(): ExportQuotation[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExportQuotations(
  quotations: ExportQuotation[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(quotations)
  );
}

export function getNextExportQuotationNo(
  quotations: ExportQuotation[]
): string {
  if (quotations.length === 0) {
    return "EXP-QTN-0001";
  }

  const maxNumber = Math.max(
    ...quotations.map((quotation) => {
      const match = quotation.quotationNo.match(
        /EXP-QTN-(\d+)/
      );

      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-QTN-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}