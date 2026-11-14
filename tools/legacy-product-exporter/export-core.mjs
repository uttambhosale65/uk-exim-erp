export const FULL_BACKUP_KEYS = Object.freeze([
  "uk-exim-products",
  "uk-exim-customers",
  "uk-exim-suppliers",
  "uk-exim-purchases",
  "uk-exim-sales",
  "uk-exim-stock",
  "uk-exim-stock-movements-v1",
  "uk-exim-stock-movement-journal-v1",
  "uk-exim-company-settings",
  "uk-exim-invoice-settings",
  "uk-exim-bank-settings",
  "uk-exim-export-customers",
  "uk-exim-export-enquiries",
  "uk-exim-export-quotations",
  "uk-exim-export-proforma-invoices",
  "uk-exim-export-orders",
  "uk-exim-export-purchases",
  "uk-exim-international-export-stock",
  "uk-exim-export-reservations",
  "uk-exim-export-packings",
  "uk-exim-export-shipments",
  "uk-exim-export-commercial-invoices",
  "uk-exim-international-settings",
  "uk-exim-sales-numbering-v2",
]);

export const LEGACY_PRODUCT_STORAGE_KEY = "uk-exim-products";

export function inspectLegacyProductValue(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    throw new TypeError("A LocalStorage-compatible read-only object is required.");
  }

  const raw = storage.getItem(LEGACY_PRODUCT_STORAGE_KEY);
  if (raw === null) {
    return {
      exists: false,
      parseSucceeded: false,
      isProductArray: false,
      productCount: null,
      raw: null,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      exists: true,
      parseSucceeded: false,
      isProductArray: false,
      productCount: null,
      raw,
    };
  }

  const isProductArray = Array.isArray(parsed);
  return {
    exists: true,
    parseSucceeded: true,
    isProductArray,
    productCount: isProductArray ? parsed.length : null,
    raw,
  };
}

export async function sha256Hex(raw, cryptoProvider = globalThis.crypto) {
  if (typeof raw !== "string") throw new TypeError("Raw storage value must be text.");
  if (!cryptoProvider?.subtle || typeof TextEncoder === "undefined") {
    throw new Error("Web Crypto SHA-256 is not available in this browser.");
  }
  const digest = await cryptoProvider.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Reads only the explicit source inventory. Values are kept as their original
 * raw strings; JSON is parsed solely to report validity and array record counts.
 */
export async function createFullErpBackup(storage, {
  origin = "http://localhost:3000",
  timestamp = new Date().toISOString(),
  cryptoProvider = globalThis.crypto,
} = {}) {
  if (!storage || typeof storage.getItem !== "function") {
    throw new TypeError("A LocalStorage-compatible read-only object is required.");
  }

  const keys = {};
  for (const key of FULL_BACKUP_KEYS) {
    const raw = storage.getItem(key);
    if (raw === null) {
      keys[key] = {
        exists: false,
        parseSucceeded: false,
        recordCount: null,
        sha256: null,
        raw: null,
      };
      continue;
    }

    let parsed;
    let parseSucceeded = true;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parseSucceeded = false;
    }
    keys[key] = {
      exists: true,
      parseSucceeded,
      recordCount: parseSucceeded && Array.isArray(parsed) ? parsed.length : null,
      sha256: await sha256Hex(raw, cryptoProvider),
      raw,
    };
  }

  return {
    format: "UK-EXIM-ERP-FULL-RAW-BACKUP",
    formatVersion: 1,
    timestamp,
    origin,
    keyCount: FULL_BACKUP_KEYS.length,
    keys,
  };
}

export function serializeFullErpBackup(backup) {
  return JSON.stringify(backup, null, 2);
}

export function getRawProductBackup(snapshot) {
  if (!snapshot?.exists || !snapshot.parseSucceeded || !snapshot.isProductArray) {
    throw new Error("No valid legacy product array is available to download.");
  }
  return snapshot.raw;
}
