import test from "node:test";
import assert from "node:assert/strict";
import {
  STOCK_MOVEMENTS_KEY,
  STOCK_MOVEMENT_JOURNAL_KEY,
  applyMovementLedger,
  applyMovementToMonthlyValues,
  commitStockMovementTransaction,
  findInsufficientStock,
  isPostCutoverTimestamp,
  purchaseMovementForLine,
  recoverStockMovementJournal,
  saleMovementForLine,
} from "../app/components/stock/StockMovementStorage.ts";
import { loadPurchases, savePurchases } from "../app/components/customer/purchase/PurchaseStorage.ts";

const makeStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
};

const baseline = ["P0001", "P0002", "P0003", "P0004", "P0005", "P0006", "P0007"].map(
  (productCode, index) => ({
    id: `STK${index + 1}`,
    productCode,
    productName: productCode,
    hsn: "",
    unit: productCode === "P0006" ? "KG" : "Pkt",
    openingStock: 10 + index,
    purchaseQty: 20 + index,
    salesQty: 5 + index,
    currentStock: 25 + index,
  })
);

test("cutover timestamp is inclusive at 00:00 IST", () => {
  assert.equal(isPostCutoverTimestamp("2026-11-05T18:29:59.999Z"), false);
  assert.equal(isPostCutoverTimestamp("2026-11-05T18:30:00.000Z"), true);
});

test("mixed loose and packet sale validation aggregates the shared stock pool", () => {
  const required = new Map([["P0006", 0.6 + 0.5]]);
  const enough = new Map([["P0006", 1.1]]);
  const short = new Map([["P0006", 1]]);
  assert.equal(findInsufficientStock(required, enough), null);
  assert.deepEqual(findInsufficientStock(required, short), {
    stockCode: "P0006",
    required: 1.1,
    available: 1,
  });
});

test("posting rechecks aggregate stock under the lock before saving the transaction", async () => {
  const storage = makeStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem("uk-exim-stock", JSON.stringify(baseline));
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks: { request: (_name, callback) => Promise.resolve(callback()) } },
  });
  let transactionSaved = false;
  const postedAt = "2026-11-05T18:30:00.000Z";
  const record = {
    transactionType: "sale",
    transactionId: "aggregate-short-sale",
    postedAt,
    state: "posted",
    movements: [
      {
        lineId: "p0004-line",
        productCode: "P0004",
        stockCode: "P0006",
        direction: "out",
        quantityKg: 15,
        unit: "Pkt",
        sourceQuantity: 30,
        netWeightGrams: 500,
      },
      {
        lineId: "loose-line",
        productCode: "P0006",
        stockCode: "P0006",
        direction: "out",
        quantityKg: 15.01,
        unit: "KG",
        sourceQuantity: 15.01,
        netWeightGrams: 0,
      },
    ],
  };
  const result = await commitStockMovementTransaction(
    "sale",
    record.transactionId,
    {
      id: record.transactionId,
      items: [
        { lineId: "p0004-line", productCode: "P0004", qty: 30 },
        { lineId: "loose-line", productCode: "P0006", qty: 15.01 },
      ],
    },
    record,
    () => { transactionSaved = true; return true; }
  );
  assert.equal(result, "insufficient-stock");
  assert.equal(transactionSaved, false);
  assert.equal(storage.getItem(STOCK_MOVEMENT_JOURNAL_KEY), null);
  delete globalThis.window;
});

test("posting fails closed when the protected Loose Haldi baseline is unavailable", async () => {
  const storage = makeStorage();
  globalThis.window = { localStorage: storage };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks: { request: (_name, callback) => Promise.resolve(callback()) } },
  });
  let saved = false;
  const postedAt = "2026-11-05T18:30:00.000Z";
  const transaction = {
    id: "missing-baseline-sale",
    items: [{ lineId: "line", productCode: "P0006", qty: 1 }],
  };
  const record = {
    transactionType: "sale",
    transactionId: transaction.id,
    postedAt,
    state: "posted",
    movements: [{
      lineId: "line",
      productCode: "P0006",
      stockCode: "P0006",
      direction: "out",
      quantityKg: 1,
      unit: "KG",
      sourceQuantity: 1,
      netWeightGrams: 0,
    }],
  };
  assert.equal(
    await commitStockMovementTransaction("sale", transaction.id, transaction, record, () => {
      saved = true;
      return true;
    }),
    "baseline-unavailable"
  );
  assert.equal(saved, false);
  delete globalThis.window;
});

test("post-cutover purchases reject packet items and unknown packet sales fail closed", async () => {
  const storage = makeStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem("uk-exim-stock", JSON.stringify(baseline));
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks: { request: (_name, callback) => Promise.resolve(callback()) } },
  });
  const postedAt = "2026-11-05T18:30:00.000Z";
  let saved = false;
  const packetPurchase = {
    id: "packet-purchase",
    items: [{ lineId: "packet", productCode: "P0004", qty: 1 }],
  };
  const purchaseRecord = {
    transactionType: "purchase",
    transactionId: packetPurchase.id,
    postedAt,
    state: "posted",
    movements: [],
  };
  assert.equal(
    await commitStockMovementTransaction(
      "purchase", packetPurchase.id, packetPurchase, purchaseRecord,
      () => { saved = true; return true; }
    ),
    "ineligible-purchase"
  );
  assert.equal(saved, false);

  const unknownPacket = {
    id: "unknown-packet-sale",
    items: [{ lineId: "unknown", productCode: "P0099", qty: 1 }],
  };
  const saleRecord = {
    transactionType: "sale",
    transactionId: unknownPacket.id,
    postedAt,
    state: "posted",
    movements: [],
  };
  assert.equal(
    await commitStockMovementTransaction(
      "sale", unknownPacket.id, unknownPacket, saleRecord,
      () => { saved = true; return true; }
    ),
    "invalid-movement"
  );
  assert.equal(saved, false);
  delete globalThis.window;
});

test("approved product codes map exactly, while P0007 and unknown packets remain independent", () => {
  const approved = [
    ["P0001", 0.05],
    ["P0002", 0.1],
    ["P0003", 0.2],
    ["P0004", 0.5],
    ["P0005", 1],
  ];
  approved.forEach(([productCode, expectedKg]) => {
    const movement = saleMovementForLine(
      { lineId: productCode, productCode, qty: 1, unit: "Pkt" },
      { code: productCode, unit: "Pkt", netWeight: 777, stockBaseCode: "P0007" }
    );
    assert.equal(movement.stockCode, "P0006");
    assert.equal(movement.quantityKg, expectedKg);
  });
  assert.equal(
    saleMovementForLine(
      { lineId: "dummy", productCode: "P0007", qty: 1, unit: "KG" },
      { code: "P0007", unit: "KG", netWeight: 0, stockBaseCode: "P0006" }
    ).stockCode,
    "P0007"
  );
  assert.equal(
    saleMovementForLine(
      { lineId: "other-packet", productCode: "P0099", qty: 1, unit: "Pkt" },
      { code: "P0099", unit: "Pkt", netWeight: 200, stockBaseCode: "P0006" }
    ).stockCode,
    "P0099"
  );
  assert.equal(purchaseMovementForLine(
    { lineId: "packet-purchase", productCode: "P0004", qty: 1, unit: "Pkt" },
    { code: "P0004", unit: "Pkt", netWeight: 500, stockBaseCode: "P0006" }
  ), null);
  const loosePurchase = purchaseMovementForLine(
    { lineId: "loose-purchase", productCode: "P0006", qty: 3, unit: "KG" },
    { code: "P0006", unit: "KG", netWeight: 0 }
  );
  assert.equal(loosePurchase.stockCode, "P0006");
  assert.equal(loosePurchase.quantityKg, 3);
});

test("monthly report leaves historical months unchanged and carries posted movements forward", () => {
  const row = { openingStock: 100, purchaseQty: 0, salesQty: 0, closingStock: 100 };
  const sale = {
    lineId: "line-500g",
    productCode: "P0004",
    stockCode: "P0006",
    direction: "out",
    quantityKg: 0.5,
    unit: "Pkt",
    sourceQuantity: 1,
    netWeightGrams: 500,
  };
  const novemberStart = Date.parse("2026-11-01T00:00:00+05:30");
  const decemberStart = Date.parse("2026-12-01T00:00:00+05:30");
  const janStart = Date.parse("2027-01-01T00:00:00+05:30");
  const postedAt = "2026-11-05T18:30:00.000Z";

  applyMovementToMonthlyValues(row, sale, postedAt, Date.parse("2026-10-01T00:00:00+05:30"), novemberStart);
  assert.deepEqual(row, { openingStock: 100, purchaseQty: 0, salesQty: 0, closingStock: 100 });
  applyMovementToMonthlyValues(row, sale, postedAt, novemberStart, decemberStart);
  assert.deepEqual(row, { openingStock: 100, purchaseQty: 0, salesQty: 0.5, closingStock: 99.5 });
  const december = { openingStock: 100, purchaseQty: 0, salesQty: 0, closingStock: 100 };
  applyMovementToMonthlyValues(december, sale, postedAt, decemberStart, janStart);
  assert.deepEqual(december, { openingStock: 99.5, purchaseQty: 0, salesQty: 0, closingStock: 99.5 });
});

test("synthetic packet, loose, purchase, and P0007 movements preserve baseline fields", () => {
  const baselineBefore = structuredClone(baseline);
  const movements = [
    ["P0001", 0.05],
    ["P0002", 0.1],
    ["P0003", 0.2],
    ["P0004", 0.5],
    ["P0005", 1],
  ].map(([productCode, quantityKg], index) => ({
    lineId: `line-${index}`,
    productCode,
    stockCode: "P0006",
    direction: "out",
    quantityKg,
    unit: "Pkt",
    sourceQuantity: 1,
    netWeightGrams: quantityKg * 1000,
  }));
  movements.push(
    {
      lineId: "loose-sale",
      productCode: "P0006",
      stockCode: "P0006",
      direction: "out",
      quantityKg: 0.5,
      unit: "KG",
      sourceQuantity: 0.5,
      netWeightGrams: 0,
    },
    {
      lineId: "loose-purchase",
      productCode: "P0006",
      stockCode: "P0006",
      direction: "in",
      quantityKg: 5,
      unit: "KG",
      sourceQuantity: 5,
      netWeightGrams: 0,
    },
    {
      lineId: "dummy-sale",
      productCode: "P0007",
      stockCode: "P0007",
      direction: "out",
      quantityKg: 0.25,
      unit: "KG",
      sourceQuantity: 0.25,
      netWeightGrams: 0,
    }
  );
  const records = [{
    transactionType: "sale",
    transactionId: "synthetic-stock-test",
    postedAt: "2026-11-05T18:30:00.000Z",
    state: "posted",
    movements,
  }];
  const result = applyMovementLedger(baseline, records);
  const originalPacketRows = baseline.slice(0, 5);
  assert.deepEqual(result.slice(0, 5), originalPacketRows);
  assert.equal(result.find((row) => row.productCode === "P0006").currentStock, 32.65);
  assert.equal(result.find((row) => row.productCode === "P0007").currentStock, 30.75);
  assert.equal(baseline.find((row) => row.productCode === "P0006").currentStock, 30);
  assert.deepEqual(baseline, baselineBefore);
  assert.deepEqual(applyMovementLedger(baseline, records), result);
});

test("saving a new purchase preserves untouched historical purchase objects", () => {
  const storage = makeStorage();
  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;
  const historical = {
    id: "legacy-purchase-1",
    purchaseNo: "GRN-0001",
    purchaseDate: "2025-01-01",
    invoiceNo: "INV-OLD",
    supplierCode: "SUP-1",
    supplierName: "Synthetic Supplier",
    contactPerson: "",
    items: [{ productCode: "P0006", productName: "Loose Haldi", hsn: "", unit: "KG", qty: 2, rate: 10, amount: 20, gst: 5, gstAmount: 1, netAmount: 21 }],
    totalQty: 2,
    totalAmount: 20,
    totalGstAmount: 1,
    totalNetAmount: 21,
    remarks: "synthetic legacy fixture",
  };
  storage.setItem("uk-exim-purchases", JSON.stringify([historical]));
  const loaded = loadPurchases();
  const nextPurchase = {
    id: "new-purchase-1",
    purchaseNo: "GRN-0002",
    purchaseDate: "2026-11-06",
    invoiceNo: "INV-NEW",
    supplierCode: "SUP-1",
    supplierName: "Synthetic Supplier",
    contactPerson: "",
    items: [],
    totalQty: 0,
    totalAmount: 0,
    totalGstAmount: 0,
    totalNetAmount: 0,
    remarks: "synthetic new fixture",
  };
  assert.equal(savePurchases([...loaded, nextPurchase]), true);
  const saved = JSON.parse(storage.getItem("uk-exim-purchases"));
  assert.deepEqual(saved[0], historical);
  assert.equal(saved[1].id, "new-purchase-1");
  delete globalThis.localStorage;
  delete globalThis.window;
});

test("posting is idempotent and journal recovery completes an interrupted ledger write", async () => {
  const storage = makeStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem("uk-exim-stock", JSON.stringify(baseline));
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks: { request: (_name, callback) => Promise.resolve(callback()) } },
  });
  const transactionKey = "uk-exim-sales";
  const transaction = {
    id: "sale-1",
    postedAt: "2026-11-05T18:30:00.000Z",
    items: [{ lineId: "line-1", productCode: "P0004", qty: 1 }],
    stockMovements: [],
  };
  const record = {
    transactionType: "sale",
    transactionId: "sale-1",
    postedAt: transaction.postedAt,
    state: "posted",
    movements: [
      {
        lineId: "line-1",
        productCode: "P0004",
        stockCode: "P0006",
        direction: "out",
        quantityKg: 0.5,
        unit: "Pkt",
        sourceQuantity: 1,
        netWeightGrams: 500,
      },
    ],
  };

  let failLedgerWrite = true;
  const originalSetItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === STOCK_MOVEMENTS_KEY && failLedgerWrite) throw new Error("synthetic quota failure");
    originalSetItem(key, value);
  };
  const save = () => {
    storage.setItem(transactionKey, JSON.stringify([transaction]));
    return true;
  };
  assert.equal(
    await commitStockMovementTransaction("sale", transaction.id, transaction, record, save),
    "movement-pending"
  );
  assert.ok(storage.getItem(STOCK_MOVEMENT_JOURNAL_KEY));

  failLedgerWrite = false;
  recoverStockMovementJournal();
  assert.equal(JSON.parse(storage.getItem(STOCK_MOVEMENTS_KEY)).length, 1);
  assert.equal(storage.getItem(STOCK_MOVEMENT_JOURNAL_KEY), null);

  assert.equal(
    await commitStockMovementTransaction("sale", transaction.id, transaction, record, save),
    "committed"
  );
  const savedRecords = JSON.parse(storage.getItem(STOCK_MOVEMENTS_KEY));
  assert.equal(savedRecords.length, 1);
  assert.equal(applyMovementLedger(baseline, savedRecords).find((row) => row.productCode === "P0006").currentStock, 29.5);
  delete globalThis.window;
});

test("edit replaces a transaction movement and delete voids it without changing the baseline", async () => {
  const storage = makeStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem("uk-exim-stock", JSON.stringify(baseline));
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks: { request: (_name, callback) => Promise.resolve(callback()) } },
  });
  const txKey = "uk-exim-sales";
  const postedAt = "2026-11-05T18:30:00.000Z";
  const makeSale = (quantityKg) => ({
    id: "sale-edit",
    postedAt,
    items: [{ lineId: "line-a", productCode: "P0004", qty: quantityKg * 2 }],
    stockMovements: [{ quantityKg }],
  });
  const makeRecord = (quantityKg, state = "posted") => ({
    transactionType: "sale",
    transactionId: "sale-edit",
    postedAt,
    state,
    movements: state === "posted" ? [{
      lineId: "line-a",
      productCode: "P0004",
      stockCode: "P0006",
      direction: "out",
      quantityKg,
      unit: "Pkt",
      sourceQuantity: quantityKg * 2,
      netWeightGrams: 500,
    }] : [],
  });
  let sale = makeSale(0.5);
  let record = makeRecord(0.5);
  const save = () => {
    storage.setItem(txKey, sale ? JSON.stringify([sale]) : "[]");
    return true;
  };

  assert.equal(await commitStockMovementTransaction("sale", sale.id, sale, record, save), "committed");
  sale = makeSale(0.2);
  record = makeRecord(0.2);
  assert.equal(await commitStockMovementTransaction("sale", sale.id, sale, record, save), "committed");
  let ledger = JSON.parse(storage.getItem(STOCK_MOVEMENTS_KEY));
  assert.equal(ledger.length, 1);
  assert.equal(applyMovementLedger(baseline, ledger).find((row) => row.productCode === "P0006").currentStock, 29.8);

  const transactionId = sale.id;
  sale = null;
  record = makeRecord(0, "voided");
  assert.equal(await commitStockMovementTransaction("sale", transactionId, null, record, save), "committed");
  ledger = JSON.parse(storage.getItem(STOCK_MOVEMENTS_KEY));
  assert.equal(ledger[0].state, "voided");
  assert.equal(applyMovementLedger(baseline, ledger).find((row) => row.productCode === "P0006").currentStock, 30);
  delete globalThis.window;
});
