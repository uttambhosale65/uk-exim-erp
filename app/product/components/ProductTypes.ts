/* =========================================================
   UK EXIM ERP – PRODUCT TYPES
   VERSION 1.0 – FINAL PRODUCT MASTER

   UOM:
   Gram | KG | Pkt

   COST:
   Base Cost + Packing Cost + Other Charges
   = Total Cost
========================================================= */

export type ProductUnit =
  | "Gram"
  | "KG"
  | "Pkt";

export type Product = {
  /* =========================
     BASIC PRODUCT DETAILS
  ========================= */

  id: string;

  code: string;

  name: string;

  category: string;

  hsn: string;

  gst: string;

  /* =========================
     UOM / PACKING
  ========================= */

  unit: ProductUnit;

  /*
    Net Weight of one product unit.

    Examples:
    Uttam Haldi 50 g  → 50
    Uttam Haldi 100 g → 100
    Loose Haldi       → 0 or actual weight
  */

  netWeight: number;
  stockBaseCode?: string;
  /* =========================
     EXISTING PRICING
     KEEPING THESE FIELDS
     FOR LIVE DATA COMPATIBILITY
  ========================= */

  purchase: number;

  sale: number;

  mrp: number;

  /* =========================
     PRODUCT COST STRUCTURE
  ========================= */

  /*
    Basic raw-material / product cost
  */

  baseCost: number;

  /*
    Packing cost per Product UOM

    Example:
    50 g Pkt → packing cost per packet
  */

  packingCost: number;

  /*
    Other applicable cost per Product UOM

    Processing / handling / other charges
  */

  otherCharges: number;

  /*
    Automatically calculated:

    baseCost
    + packingCost
    + otherCharges
  */

  totalCost: number;

  /* =========================
     STOCK
  ========================= */

  stock: number;

  minimumStock: number;

  /* =========================
     STATUS
  ========================= */

  active: boolean;
};