/* =========================================================
   UK EXIM ERP – PURCHASE / GRN TYPES
   VERSION 1.0 – PROFESSIONAL ERP ARCHITECTURE
========================================================= */

/* =========================================================
   PURCHASE ITEM
   प्रत्येक GRN मधील स्वतंत्र Product Row
========================================================= */

export type PurchaseItem = {
  productCode: string;
  productName: string;

  hsn: string;
  unit: string;

  qty: number;
  rate: number;
  amount: number;

  gst: number;
  gstAmount: number;
  netAmount: number;
};

/* =========================================================
   PURCHASE / GRN
   एक GRN = एक Document
   त्यामध्ये अनेक PurchaseItem असू शकतात.
========================================================= */

export type Purchase = {
  /* -------------------------------------------------------
     DOCUMENT INFORMATION
  ------------------------------------------------------- */

  id: string;

  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;

  /* -------------------------------------------------------
     SUPPLIER INFORMATION
  ------------------------------------------------------- */

  supplierCode: string;
  supplierName: string;

  /* -------------------------------------------------------
     GRN ITEMS
     Multi Product structure
  ------------------------------------------------------- */

  items: PurchaseItem[];

  /* -------------------------------------------------------
     GRN TOTALS
  ------------------------------------------------------- */

  totalQty: number;
  totalAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;

  /* -------------------------------------------------------
     REMARKS
  ------------------------------------------------------- */

  remarks: string;
};