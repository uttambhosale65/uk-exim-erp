import type { Purchase } from "../customer/purchase/PurchaseTypes";
import type { Sales } from "../customer/sales/SalesTypes";
import type { Stock } from "./StockTypes";

export const STOCK_MOVEMENT_CUTOVER_ISO =
  "2026-11-05T18:30:00.000Z"; // 06 Nov 2026, 00:00 IST

export const STOCK_MOVEMENTS_KEY =
  "uk-exim-stock-movements-v1";
export const STOCK_MOVEMENT_JOURNAL_KEY =
  "uk-exim-stock-movement-journal-v1";

const CUTOVER_MS = Date.parse(STOCK_MOVEMENT_CUTOVER_ISO);
const SALES_KEY = "uk-exim-sales";
const PURCHASES_KEY = "uk-exim-purchases";
const STOCK_KEY = "uk-exim-stock";
let movementLedgerHealthy = true;

export type StockMovementLine = {
  lineId: string;
  productCode: string;
  stockCode: string;
  direction: "in" | "out";
  quantityKg: number;
  unit: string;
  sourceQuantity: number;
  netWeightGrams: number;
};

export type MovementProduct = {
  code: string;
  unit: string;
  netWeight: number;
  stockBaseCode?: string;
};

const HALDI_PACKET_WEIGHT_GRAMS: Record<string, number> = {
  P0001: 50,
  P0002: 100,
  P0003: 200,
  P0004: 500,
  P0005: 1000,
};

export function saleMovementForLine(
  line: { lineId: string; productCode: string; qty: number; unit: string },
  product?: MovementProduct
): StockMovementLine | null {
  const quantity = Number(line.qty);
  if (!line.productCode || !Number.isFinite(quantity) || quantity <= 0) return null;
  const packetGrams = HALDI_PACKET_WEIGHT_GRAMS[line.productCode];
  const grams = packetGrams || Number(product?.netWeight || 0);
  let stockCode = product?.stockBaseCode || line.productCode;
  let quantityKg = convertSourceQuantityToKg(quantity, line.unit, grams);
  if (quantityKg === null) return null;
  if (packetGrams) {
    stockCode = "P0006";
    quantityKg = (quantity * packetGrams) / 1000;
  } else if (line.productCode === "P0007") {
    stockCode = "P0007";
  } else if (line.productCode === "P0006") {
    stockCode = "P0006";
  } else if (stockCode === "P0006") {
    stockCode = line.productCode;
  }
  return {
    lineId: line.lineId,
    productCode: line.productCode,
    stockCode,
    direction: "out",
    quantityKg,
    unit: line.unit,
    sourceQuantity: quantity,
    netWeightGrams: grams,
  };
}

export function purchaseMovementForLine(
  line: { lineId: string; productCode: string; qty: number; unit: string },
  product?: MovementProduct
): StockMovementLine | null {
  const quantity = Number(line.qty);
  if (!line.productCode || !Number.isFinite(quantity) || quantity <= 0) return null;
  if (["P0001", "P0002", "P0003", "P0004", "P0005"].includes(line.productCode)) return null;
  const grams = Number(product?.netWeight || 0);
  let stockCode = product?.stockBaseCode || line.productCode;
  if (line.productCode === "P0007") stockCode = "P0007";
  else if (line.productCode === "P0006") stockCode = "P0006";
  else if (stockCode === "P0006") stockCode = line.productCode;
  const quantityKg = convertSourceQuantityToKg(quantity, line.unit, grams);
  if (quantityKg === null) return null;
  return {
    lineId: line.lineId,
    productCode: line.productCode,
    stockCode,
    direction: "in",
    quantityKg,
    unit: line.unit,
    sourceQuantity: quantity,
    netWeightGrams: grams,
  };
}

function convertSourceQuantityToKg(
  quantity: number,
  unit: string,
  netWeightGrams: number
): number | null {
  if (unit === "KG") return quantity;
  if (unit === "Gram") return quantity / 1000;
  if (unit === "Pkt" && netWeightGrams > 0) return (quantity * netWeightGrams) / 1000;
  return null;
}

export type StockMovementRecord = {
  transactionType: "sale" | "purchase";
  transactionId: string;
  postedAt: string;
  state: "posted" | "voided";
  movements: StockMovementLine[];
};

export function findInsufficientStock(
  requiredByStock: ReadonlyMap<string, number>,
  availableByStock: ReadonlyMap<string, number>,
  tolerance = 1e-9
): { stockCode: string; required: number; available: number } | null {
  for (const [stockCode, required] of requiredByStock) {
    const available = availableByStock.get(stockCode) || 0;
    if (required > available + tolerance) return { stockCode, required, available };
  }
  return null;
}

export function applyMovementToMonthlyValues(
  row: { openingStock: number; purchaseQty: number; salesQty: number; closingStock: number },
  movement: StockMovementLine,
  postedAt: string,
  monthStartMs: number,
  nextMonthStartMs: number
): void {
  const postedMs = Date.parse(postedAt);
  if (!Number.isFinite(postedMs) || movement.quantityKg <= 0) return;
  if (postedMs < monthStartMs) {
    row.openingStock += movement.direction === "in"
      ? movement.quantityKg
      : -movement.quantityKg;
  } else if (postedMs < nextMonthStartMs) {
    if (movement.direction === "in") row.purchaseQty += movement.quantityKg;
    else row.salesQty += movement.quantityKg;
  }
  row.closingStock = row.openingStock + row.purchaseQty - row.salesQty;
}

type LedgerJournal = {
  transactionType: "sale" | "purchase";
  transactionId: string;
  expectedTransaction: Sales | Purchase | null;
  movementRecord: StockMovementRecord;
};

export type StockMovementCommitResult =
  | "committed"
  | "movement-pending"
  | "lock-unavailable"
  | "journal-write-failed"
  | "transaction-write-failed"
  | "recovery-pending"
  | "ledger-unavailable"
  | "insufficient-stock"
  | "invalid-movement"
  | "ineligible-purchase"
  | "baseline-unavailable";

export function isStockMovementCutoverActive(
  now: number = Date.now()
): boolean {
  return now >= CUTOVER_MS;
}

export function isPostCutoverTimestamp(value: unknown): boolean {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) && timestamp >= CUTOVER_MS;
}

export function isStockMovementLedgerHealthy(): boolean {
  return movementLedgerHealthy;
}

export function getStockMovementRecords(): StockMovementRecord[] {
  if (typeof window === "undefined") return [];
  movementLedgerHealthy = true;
  try {
    const records = readLedgerRecords();
    const rawJournal = window.localStorage.getItem(STOCK_MOVEMENT_JOURNAL_KEY);
    const journal = readJournal();
    if (rawJournal && !journal) {
      movementLedgerHealthy = false;
      return records;
    }
    if (!journal) return records;
    const matches = transactionMatchesJournal(journal);
    if (matches === null) {
      movementLedgerHealthy = false;
      return records;
    }
    if (!matches) return records;
    const index = records.findIndex(
      (record) => record.transactionType === journal.transactionType &&
        record.transactionId === journal.transactionId
    );
    if (index === -1) records.push(journal.movementRecord);
    else records[index] = journal.movementRecord;
    return records;
  } catch (error) {
    movementLedgerHealthy = false;
    console.error("Unable to read stock movement ledger:", error);
    return [];
  }
}

export function getMovementRecord(
  transactionType: "sale" | "purchase",
  transactionId: string
): StockMovementRecord | undefined {
  return getStockMovementRecords().find(
    (record) =>
      record.transactionType === transactionType &&
      record.transactionId === transactionId
  );
}

export function applyMovementLedger(
  baseline: Stock[],
  records: StockMovementRecord[]
): Stock[] {
  const active = records.filter(
    (record) => record.state === "posted" && isPostCutoverTimestamp(record.postedAt)
  );
  const totals = new Map<string, { purchases: number; sales: number }>();

  active.forEach((record) => {
    record.movements.forEach((movement) => {
      if (!Number.isFinite(movement.quantityKg) || movement.quantityKg <= 0) return;
      const total = totals.get(movement.stockCode) || { purchases: 0, sales: 0 };
      if (movement.direction === "in") total.purchases += movement.quantityKg;
      else total.sales += movement.quantityKg;
      totals.set(movement.stockCode, total);
    });
  });

  const output = baseline.map((item) => {
    const total = totals.get(item.productCode);
    if (!total) return { ...item };
    const baselineCurrent = Number(item.currentStock);
    const current = Number.isFinite(baselineCurrent)
      ? baselineCurrent
      : Number(item.openingStock || 0) + Number(item.purchaseQty || 0) - Number(item.salesQty || 0);
    return {
      ...item,
      purchaseQty: Number(item.purchaseQty || 0) + total.purchases,
      salesQty: Number(item.salesQty || 0) + total.sales,
      currentStock: current + total.purchases - total.sales,
    };
  });

  totals.forEach((_total, stockCode) => {
    if (output.some((item) => item.productCode === stockCode)) return;
    const total = totals.get(stockCode)!;
    output.push({
      id: `MOV-${stockCode}`,
      productCode: stockCode,
      productName: stockCode,
      hsn: "",
      unit: "KG",
      openingStock: 0,
      purchaseQty: total.purchases,
      salesQty: total.sales,
      currentStock: total.purchases - total.sales,
    });
  });

  return output;
}

/**
 * Persist a transaction and its movement as a recoverable two-phase operation.
 * Transaction storage is written first; the journal lets the next stock read
 * finish the ledger write after an interrupted browser session.
 */
export async function commitStockMovementTransaction(
  transactionType: "sale" | "purchase",
  transactionId: string,
  expectedTransaction: Sales | Purchase | null,
  movementRecord: StockMovementRecord,
  saveTransaction: () => boolean
): Promise<StockMovementCommitResult> {
  if (
    typeof window === "undefined" ||
    !transactionId ||
    !isPostCutoverTimestamp(movementRecord.postedAt)
  ) return "transaction-write-failed";
  const locks = (navigator as Navigator & {
    locks?: { request<T>(name: string, callback: () => Promise<T> | T): Promise<T> };
  }).locks;
  // Without an origin-wide lock, concurrent tabs could overwrite each other's
  // LocalStorage ledger arrays. Fail closed instead of risking a lost movement.
  if (!locks) return "lock-unavailable";

  try {
    return await locks.request("uk-exim-stock-movement-ledger-v1", async () => {
      if (!recoverStockMovementJournal()) return "recovery-pending";
      try {
        readLedgerRecords();
      } catch (error) {
        movementLedgerHealthy = false;
        console.error("Stock movement ledger is unavailable:", error);
        return "ledger-unavailable";
      }
      if (!isProtectedStockBaselineHealthy()) return "baseline-unavailable";

      if (
        transactionType === "sale" &&
        movementRecord.state === "posted" &&
        hasUnmappedSaleLine(expectedTransaction, movementRecord)
      ) {
        return "invalid-movement";
      }
      if (
        transactionType === "purchase" &&
        movementRecord.state === "posted" &&
        hasIneligiblePurchaseLine(expectedTransaction)
      ) {
        return "ineligible-purchase";
      }
      if (
        transactionType === "purchase" &&
        movementRecord.state === "posted" &&
        hasUnmappedPurchaseLine(expectedTransaction, movementRecord)
      ) {
        return "invalid-movement";
      }
      if (
        transactionType === "sale" &&
        movementRecord.state === "posted" &&
        hasInsufficientStockForSaleReplacement(movementRecord)
      ) {
        return "insufficient-stock";
      }

      const journal: LedgerJournal = {
        transactionType,
        transactionId,
        expectedTransaction,
        movementRecord,
      };

      try {
        window.localStorage.setItem(STOCK_MOVEMENT_JOURNAL_KEY, JSON.stringify(journal));
      } catch (error) {
        console.error("Unable to prepare stock movement posting:", error);
        return "journal-write-failed";
      }

      if (!saveTransaction()) {
        window.localStorage.removeItem(STOCK_MOVEMENT_JOURNAL_KEY);
        return "transaction-write-failed";
      }
      return finishJournal(journal) ? "committed" : "movement-pending";
    });
  } catch (error) {
    console.error("Stock movement lock request failed:", error);
    return "lock-unavailable";
  }
}

function hasUnmappedSaleLine(
  transaction: Sales | Purchase | null,
  record: StockMovementRecord
): boolean {
  const items = (transaction as Sales | null)?.items;
  if (!Array.isArray(items)) return true;
  const movementLineIds = new Set(record.movements.map((movement) => movement.lineId));
  return items.some((item) =>
    Number(item.qty) > 0 && (!item.lineId || !movementLineIds.has(item.lineId))
  );
}

function hasIneligiblePurchaseLine(transaction: Sales | Purchase | null): boolean {
  const items = (transaction as Purchase | null)?.items;
  if (!Array.isArray(items)) return true;
  return items.some((item) => Number(item.qty) > 0 && item.productCode !== "P0006");
}

function hasUnmappedPurchaseLine(
  transaction: Sales | Purchase | null,
  record: StockMovementRecord
): boolean {
  const items = (transaction as Purchase | null)?.items;
  if (!Array.isArray(items)) return true;
  const movementLineIds = new Set(record.movements.map((movement) => movement.lineId));
  return items.some((item) =>
    Number(item.qty) > 0 && (!item.lineId || !movementLineIds.has(item.lineId))
  );
}

function hasInsufficientStockForSaleReplacement(
  replacement: StockMovementRecord
): boolean {
  const existingRecords = getStockMovementRecords();
  if (!isStockMovementLedgerHealthy()) return true;
  const currentStock = applyMovementLedger(
    loadProtectedStockBaseline(),
    existingRecords
  );
  const existing = existingRecords.find(
    (record) =>
      record.transactionType === "sale" &&
      record.transactionId === replacement.transactionId &&
      record.state === "posted"
  );
  const availableByCode = new Map(
    currentStock.map((stock) => [
      stock.productCode,
      Number(stock.currentStock) || 0,
    ])
  );

  // Restore the transaction being edited before validating its replacement.
  existing?.movements.forEach((movement) => {
    if (movement.direction === "out") {
      availableByCode.set(
        movement.stockCode,
        (availableByCode.get(movement.stockCode) || 0) + movement.quantityKg
      );
    } else {
      availableByCode.set(
        movement.stockCode,
        (availableByCode.get(movement.stockCode) || 0) - movement.quantityKg
      );
    }
  });

  const requiredByCode = new Map<string, number>();
  replacement.movements.forEach((movement) => {
    if (movement.direction === "out") {
      requiredByCode.set(
        movement.stockCode,
        (requiredByCode.get(movement.stockCode) || 0) + movement.quantityKg
      );
    } else {
      availableByCode.set(
        movement.stockCode,
        (availableByCode.get(movement.stockCode) || 0) + movement.quantityKg
      );
    }
  });

  return findInsufficientStock(requiredByCode, availableByCode) !== null;
}

export function recoverStockMovementJournal(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(STOCK_MOVEMENT_JOURNAL_KEY);
  if (!raw) return true;
  const journal = readJournal();

  if (!journal?.transactionId || !journal.movementRecord) return false;
  const matches = transactionMatchesJournal(journal);
  if (matches === null) return false;
  if (!matches) {
    window.localStorage.removeItem(STOCK_MOVEMENT_JOURNAL_KEY);
    return true;
  }
  return finishJournal(journal);
}

function readJournal(): LedgerJournal | null {
  try {
    const raw = window.localStorage.getItem(STOCK_MOVEMENT_JOURNAL_KEY);
    return raw ? JSON.parse(raw) as LedgerJournal : null;
  } catch (error) {
    console.error("Stock movement recovery journal is unreadable:", error);
    return null;
  }
}

export function loadProtectedStockBaseline(): Stock[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STOCK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read protected stock baseline:", error);
    return [];
  }
}

function isProtectedStockBaselineHealthy(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STOCK_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    const mainLooseStock = parsed.find(
      (item) => isRecord(item) && item.productCode === "P0006"
    );
    return Boolean(
      mainLooseStock &&
      Number.isFinite(Number(mainLooseStock.currentStock))
    );
  } catch {
    return false;
  }
}

function finishJournal(journal: LedgerJournal): boolean {
  try {
    const records = readLedgerRecords();
    const index = records.findIndex(
      (record) =>
        record.transactionType === journal.transactionType &&
        record.transactionId === journal.transactionId
    );
    if (index === -1) records.push(journal.movementRecord);
    else records[index] = journal.movementRecord;
    window.localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(records));
    window.localStorage.removeItem(STOCK_MOVEMENT_JOURNAL_KEY);
    return true;
  } catch (error) {
    console.error("Stock movement ledger write is pending recovery:", error);
    return false;
  }
}

function readLedgerRecords(): StockMovementRecord[] {
  const raw = window.localStorage.getItem(STOCK_MOVEMENTS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isValidMovementRecord)) {
    throw new Error("Stock movement ledger has an invalid structure");
  }
  return parsed;
}

function isValidMovementRecord(value: unknown): value is StockMovementRecord {
  if (!isRecord(value)) return false;
  if (
    (value.transactionType !== "sale" && value.transactionType !== "purchase") ||
    typeof value.transactionId !== "string" ||
    !isPostCutoverTimestamp(value.postedAt) ||
    (value.state !== "posted" && value.state !== "voided") ||
    !Array.isArray(value.movements)
  ) return false;
  return value.movements.every((movement) => {
    if (!isRecord(movement)) return false;
    return typeof movement.lineId === "string" &&
      typeof movement.productCode === "string" &&
      typeof movement.stockCode === "string" &&
      (movement.direction === "in" || movement.direction === "out") &&
      Number.isFinite(movement.quantityKg) &&
      typeof movement.unit === "string" &&
      Number.isFinite(movement.sourceQuantity) &&
      Number.isFinite(movement.netWeightGrams);
  });
}

function transactionMatchesJournal(journal: LedgerJournal): boolean | null {
  const key = journal.transactionType === "sale" ? SALES_KEY : PURCHASES_KEY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    const rows: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed.filter(isRecord)
      : [];
    const stored = rows.find(
      (row) => String(row.id || "") === journal.transactionId
    );
    if (journal.expectedTransaction === null) return !stored;
    return Boolean(
      stored && JSON.stringify(stored) === JSON.stringify(journal.expectedTransaction)
    );
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function movementRecordForTransaction(
  transactionType: "sale" | "purchase",
  transactionId: string,
  postedAt: string,
  movements: StockMovementLine[]
): StockMovementRecord {
  return {
    transactionType,
    transactionId,
    postedAt,
    state: "posted",
    movements,
  };
}

export function voidMovementRecord(
  transactionType: "sale" | "purchase",
  transactionId: string,
  postedAt: string
): StockMovementRecord {
  return {
    transactionType,
    transactionId,
    postedAt,
    state: "voided",
    movements: [],
  };
}

export function cutoverTimestampMs(): number {
  return CUTOVER_MS;
}
