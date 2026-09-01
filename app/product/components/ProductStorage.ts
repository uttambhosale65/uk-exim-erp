import {
  Product,
  ProductUnit,
} from "./ProductTypes";

const STORAGE_KEY = "uk-exim-products";

/* =========================================================
   NORMALIZE PRODUCT

   Old Product records may not contain:
   - Pkt UOM
   - stockBaseCode
   - baseCost
   - packingCost
   - otherCharges
   - totalCost

   त्यामुळे old live data सुरक्षितपणे normalize केले जाते.
========================================================= */

function normalizeProduct(
  product: any
): Product {
  const purchase =
    Number(product.purchase) || 0;

  const baseCost =
    product.baseCost !== undefined
      ? Number(product.baseCost) || 0
      : purchase;

  const packingCost =
    Number(product.packingCost) || 0;

  const otherCharges =
    Number(product.otherCharges) || 0;

  const totalCost =
    baseCost +
    packingCost +
    otherCharges;

  const unit: ProductUnit =
    product.unit === "KG"
      ? "KG"
      : product.unit === "Pkt"
      ? "Pkt"
      : "Gram";

  return {
    id:
      product.id ||
      crypto.randomUUID(),

    code:
      product.code || "",

    name:
      product.name || "",

    category:
      product.category || "Spices",

    hsn:
      product.hsn || "",

    gst:
      product.gst || "5%",

    unit,

    netWeight:
      Number(product.netWeight) || 0,

    /* =====================================================
       STOCK BASE CODE

       IMPORTANT:
       Preserve existing Product → Stock mapping.

       Example:

       P0001 → P0006
       P0002 → P0006
       P0003 → P0006
    ===================================================== */

    stockBaseCode:
      product.stockBaseCode
        ? String(
            product.stockBaseCode
          ).trim()
        : undefined,

    /*
      Existing Purchase Price preserved
    */

    purchase,

    sale:
      Number(product.sale) || 0,

    mrp:
      Number(product.mrp) || 0,

    /*
      New Cost Structure
    */

    baseCost,

    packingCost,

    otherCharges,

    totalCost,

    /*
      Existing Stock preserved
    */

    stock:
      Number(product.stock) || 0,

    minimumStock:
      Number(product.minimumStock) || 0,

    active:
      product.active !== false,
  };
}

/* =========================================================
   LOAD PRODUCTS
========================================================= */

export function loadProducts(): Product[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(
      normalizeProduct
    );
  } catch (error) {
    console.error(
      "Failed to load products:",
      error
    );

    return [];
  }
}

/* =========================================================
   SAVE PRODUCTS
========================================================= */

export function saveProducts(
  products: Product[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalized =
      products.map(
        normalizeProduct
      );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch (error) {
    console.error(
      "Failed to save products:",
      error
    );
  }
}

/* =========================================================
   CLEAR PRODUCTS
========================================================= */

export function clearProducts(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );
}

/* =========================================================
   NEXT PRODUCT CODE
========================================================= */

export function getNextProductCode(
  products: Product[]
): string {
  if (
    !products ||
    products.length === 0
  ) {
    return "P0001";
  }

  const maxNumber =
    products.reduce(
      (max, product) => {
        const number = parseInt(
          product.code
            .replace("P", ""),
          10
        );

        return Number.isNaN(number)
          ? max
          : Math.max(
              max,
              number
            );
      },
      0
    );

  return `P${String(
    maxNumber + 1
  ).padStart(4, "0")}`;
}