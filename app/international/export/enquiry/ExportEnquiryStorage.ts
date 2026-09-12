import { ExportEnquiry } from "./ExportEnquiryTypes";

const STORAGE_KEY = "uk-exim-export-enquiries";

export function loadExportEnquiries(): ExportEnquiry[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExportEnquiries(
  enquiries: ExportEnquiry[]
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(enquiries)
  );
}

export function getNextExportEnquiryNo(
  enquiries: ExportEnquiry[]
): string {
  if (enquiries.length === 0) {
    return "EXP-ENQ-0001";
  }

  const maxNumber = Math.max(
    ...enquiries.map((enquiry) => {
      const match = enquiry.enquiryNo.match(
        /EXP-ENQ-(\d+)/
      );

      return match ? Number(match[1]) : 0;
    })
  );

  return `EXP-ENQ-${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}