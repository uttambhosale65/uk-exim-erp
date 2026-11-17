import "server-only";
import { randomUUID } from "node:crypto";
import { determineDomesticSaleTax, isTaxConfigurationApproved } from "../../tax/india-gst-engine.mjs";

const CUTOVER = Date.parse("2026-11-05T18:30:00.000Z");
const PACKET_GRAMS = { P0001: 50, P0002: 100, P0003: 200, P0004: 500, P0005: 1000 };
const ERR = (code, message) => Object.assign(new Error(message), { code });

export function isHistoricalTransactionProtected(row) {
  return row?.historical_imported === true
    || (row?.posted_at != null && new Date(row.posted_at).getTime() < CUTOVER);
}

function finite(value, label, { min = 0, positive = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || (positive ? n <= 0 : n < min)) throw ERR("INVALID_TRANSACTION", `${label} is invalid.`);
  return n;
}
function round2(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function cleanId(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw ERR("INVALID_TRANSACTION", "Transaction ID is invalid.");
  return value;
}
function validateLines(lines) {
  const allowedUnits = new Set(["KG", "Gram", "Pkt"]);
  for (const item of lines) {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || typeof item.productCode !== "string" || !item.productCode.trim()
      || typeof item.productName !== "string" || typeof item.hsn !== "string"
      || typeof item.unit !== "string" || !allowedUnits.has(item.unit)) {
      throw ERR("INVALID_TRANSACTION", "Transaction line has invalid product or unit fields.");
    }
    if (item.lineId !== undefined && (typeof item.lineId !== "string" || !item.lineId.trim() || item.lineId.length > 200)) {
      throw ERR("INVALID_TRANSACTION", "Transaction line ID is invalid.");
    }
  }
}
function mapItem(row) {
  const fields = { lineId: row.line_id, productCode: row.product_code, productName: row.product_name,
    hsn: row.hsn, unit: row.unit, qty: Number(row.qty), rate: Number(row.rate), amount: Number(row.amount),
    gst: Number(row.gst), gstAmount: Number(row.gst_amount) };
  if (row.net_amount !== undefined) fields.netAmount = Number(row.net_amount);
  else Object.assign(fields, { taxableAmount: Number(row.taxable_amount), cgst: Number(row.cgst),
    sgst: Number(row.sgst), igst: Number(row.igst), grandTotal: Number(row.grand_total) });
  return fields;
}
function mapPurchase(row, items) { return { ...row.source_record, id: row.id, purchaseNo: row.purchase_no, purchaseDate: row.purchase_date, invoiceNo: row.invoice_no,
  supplierCode: row.supplier_code, supplierName: row.supplier_name, contactPerson: row.contact_person, totalQty: Number(row.total_qty),
  totalAmount: Number(row.total_amount), totalGstAmount: Number(row.total_gst_amount), totalNetAmount: Number(row.total_net_amount), remarks: row.remarks,
  entryCreatedAt: row.created_at?.toISOString?.() ?? row.created_at ?? undefined,
  postedAt: row.posted_at?.toISOString?.() ?? row.posted_at ?? undefined, items: items.map(mapItem) }; }
function mapSale(row, items) { return { ...row.source_record, id: row.id, salesNo: row.sales_no, salesDate: row.sales_date, invoiceNo: row.invoice_no,
  invoiceType: row.invoice_type, customerCode: row.customer_code, customerName: row.customer_name, contactPerson: row.contact_person,
  taxableAmount: Number(row.taxable_amount), gstAmount: Number(row.gst_amount), cgst: Number(row.cgst), sgst: Number(row.sgst), igst: Number(row.igst),
  grandTotal: Number(row.grand_total), paymentMode: row.payment_mode, status: row.status, remarks: row.remarks,
  createdAt: row.created_at, updatedAt: row.updated_at,
  entryCreatedAt: row.created_on?.toISOString?.() ?? row.created_on ?? undefined,
  postedAt: row.posted_at?.toISOString?.() ?? row.posted_at ?? undefined,
  taxSnapshot: row.tax_snapshot ?? row.source_record?.taxSnapshot ?? null, items: items.map(mapItem) }; }

export function calculatePurchaseItem(item) {
  const qty = finite(item.qty, "Purchase quantity", { positive: true });
  const rate = finite(item.rate, "Purchase rate");
  const gst = finite(item.gst, "Purchase GST rate");
  const amount = round2(qty * rate);
  const gstAmount = round2(amount * gst / 100);
  return { ...item, qty, rate, gst, amount, gstAmount, netAmount: round2(amount + gstAmount) };
}

export function calculateSaleItem(item, invoiceType) {
  const qty = finite(item.qty, "Sales quantity", { positive: true });
  const rate = finite(item.rate, "Sales rate");
  const amount = qty * rate;
  const gst = invoiceType === "GST" ? finite(item.gst, "Sales GST rate") : 0;
  const gstAmount = invoiceType === "GST" ? amount * gst / 100 : 0;
  return { ...item, qty, rate, gst, amount, taxableAmount: amount, gstAmount,
    cgst: invoiceType === "GST" ? gstAmount / 2 : 0,
    sgst: invoiceType === "GST" ? gstAmount / 2 : 0,
    igst: 0, grandTotal: amount + gstAmount };
}

export function stockImpact(line, product, transactionType) {
  const qty = finite(line.qty, "Stock quantity", { positive: true });
  if (transactionType === "purchase") {
    if (line.productCode !== "P0006") throw ERR("PURCHASE_POLICY", "Only Loose Haldi (P0006) purchases are supported by the current business policy.");
    const kg = line.unit === "KG" ? qty : line.unit === "Gram" ? qty / 1000 : null;
    if (kg === null) throw ERR("INVALID_UNIT", "Loose Haldi purchases must use KG or Gram units.");
    return { stockCode: "P0006", delta: kg, grams: 0 };
  }
  const grams = PACKET_GRAMS[line.productCode] ?? Number(product.net_weight);
  let code = product.stock_base_code || product.code;
  if (PACKET_GRAMS[line.productCode]) code = "P0006";
  else if (line.productCode === "P0007") code = "P0007";
  else if (line.productCode === "P0006") code = "P0006";
  else if (code === "P0006") code = line.productCode;
  const kg = line.unit === "KG" ? qty : line.unit === "Gram" ? qty / 1000 : line.unit === "Pkt" && grams > 0 ? qty * grams / 1000 : null;
  if (kg === null) throw ERR("INVALID_UNIT", "The product quantity cannot be converted to kilograms.");
  return { stockCode: code, delta: -kg, grams };
}

/**
 * @param {{ getOwnerContext: () => Promise<any>, database: any, idFactory?: () => string, clock?: () => Date, getSalesTaxPolicy?: (companyId: string) => Promise<any> }} options
 */
export function createTradeDAL({ getOwnerContext, database, idFactory = randomUUID, clock = () => new Date(), getSalesTaxPolicy = async () => ({ approved: false }) }) {
  if (typeof getOwnerContext !== "function" || !database?.connect) throw new Error("Trade DAL requires owner authorization and a PostgreSQL pool.");
  async function company() {
    const owner = await getOwnerContext();
    if (!owner?.company?.company_id) throw ERR("UNAUTHENTICATED", "Sign in is required.");
    return owner.company.company_id;
  }
  async function transaction(fn) {
    const c = await database.connect();
    try { await c.query("BEGIN"); const out = await fn(c); await c.query("COMMIT"); return out; }
    catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
    finally { c.release(); }
  }
  const specs = {
    purchase: { table: "purchases", items: "purchase_items", idColumn: "purchase_id", date: "purchase_date", number: "purchase_no", prefix: "GRN", status: null },
    sale: { table: "sales", items: "sales_items", idColumn: "sales_id", date: "sales_date", number: "sales_no", prefix: "SAL", status: "Completed" },
  };
  async function getRaw(c, type, companyId, id, lock = false) {
    const s = specs[type];
    const head = await c.query(`SELECT * FROM public.${s.table} WHERE company_id=$1 AND id=$2 AND deleted_at IS NULL ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
    if (!head.rowCount) return null;
    const rows = await c.query(`SELECT * FROM public.${s.items} WHERE ${s.idColumn}=$1 ORDER BY row_number`, [id]);
    return { head: head.rows[0], rows: rows.rows };
  }
  async function listItems(c, type, id) {
    const s = specs[type];
    const { rows } = await c.query(`SELECT * FROM public.${s.items} WHERE ${s.idColumn}=$1 ORDER BY row_number`, [id]);
    return rows;
  }
  async function products(c, companyId, items) {
    const codes = [...new Set(items.map(x => x.productCode))];
    const result = await c.query("SELECT code,unit,net_weight,stock_base_code,active,hsn FROM public.products WHERE company_id=$1 AND code=ANY($2::text[])", [companyId, codes]);
    const map = new Map(result.rows.map(x => [x.code, x]));
    if (map.size !== codes.length) throw ERR("REFERENCE_NOT_FOUND", "One or more products are unavailable in this company.");
    if (result.rows.some(x => !x.active)) throw ERR("INACTIVE_PRODUCT", "Inactive products cannot be used in a new transaction.");
    return map;
  }
  async function validatePartner(c, type, companyId, code) {
    const table = type === "purchase" ? "suppliers" : "customers";
    const result = await c.query(`SELECT code,name,status,source_record FROM public.${table} WHERE company_id=$1 AND code=$2`, [companyId, code]);
    if (!result.rowCount) throw ERR("REFERENCE_NOT_FOUND", `The selected ${type === "purchase" ? "supplier" : "customer"} is unavailable in this company.`);
    const status=result.rows[0].status ?? result.rows[0].source_record?.status;
    if(status && status !== "Active") throw ERR("INACTIVE_PARTNER", "Inactive suppliers or customers cannot be used for new transactions.");
    return result.rows[0];
  }
  async function inventory(c, companyId, stockCode) {
    const baseline = await c.query("SELECT current_stock FROM public.stock_baselines WHERE company_id=$1 AND product_code=$2 AND verification_status='verified' FOR UPDATE", [companyId, stockCode]);
    if (!baseline.rowCount) throw ERR("BASELINE_UNAVAILABLE", `No protected stock baseline exists for ${stockCode}.`);
    const movements = await c.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS delta FROM public.stock_movement_events WHERE company_id=$1 AND stock_code=$2", [companyId, stockCode]);
    return Number(baseline.rows[0].current_stock) + Number(movements.rows[0].delta);
  }
  async function nextDocumentNumber(c,type,companyId) {
    const column=type==="sale"?"sales_no":"purchase_no";
    const prefix=type==="sale"?"SAL":"GRN";
    const table=specs[type].table;
    const pattern=type==="sale"?"^SAL-(\\d+)$":"GRN-(\\d+)";
    const {rows}=await c.query(`SELECT coalesce(max((regexp_match(${column},$2))[1]::bigint),0)+1 AS n FROM public.${table} WHERE company_id=$1`,[companyId,pattern]);
    return `${prefix}-${String(rows[0].n).padStart(4,"0")}`;
  }
  async function nextSalesInvoiceNumber(c,companyId,invoiceType) {
    if(!["GST","NON_GST"].includes(invoiceType)) throw ERR("INVALID_TRANSACTION","Sales invoice type is invalid.");
    const year=String(clock().getFullYear()).slice(-2),prefix=invoiceType==="GST"?`UK${year}`:`UKN${year}`;
    const pattern=`^${prefix}(\\d+)$`;
    const {rows}=await c.query("SELECT coalesce(max((regexp_match(invoice_no,$3))[1]::bigint),0)+1 AS n FROM public.sales WHERE company_id=$1 AND invoice_type=$2",[companyId,invoiceType,pattern]);
    return `${prefix}${String(rows[0].n).padStart(4,"0")}`;
  }
  async function persist(type, input, id, isUpdate) {
    const s = specs[type], companyId = await company();
    const taxPolicy = type === "sale" ? await getSalesTaxPolicy(companyId) : null;
    if (type === "sale" && !isUpdate && !isTaxConfigurationApproved(taxPolicy)) {
      throw ERR("TAX_POLICY_UNAPPROVED", "Sales posting is blocked until seller registration and domestic tax rules are owner-verified and accountant-reviewed.");
    }
    if (!input || !Array.isArray(input.items) || !input.items.length || input.items.length > 500) throw ERR("INVALID_TRANSACTION", "Transaction requires between 1 and 500 items.");
    validateLines(input.items);
    cleanId(id);
    return transaction(async c => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2,0))", [type, companyId]);
      const old = isUpdate ? await getRaw(c, type, companyId, id, true) : null;
      if (isUpdate && !old) return null;
      if (type === "sale" && !old?.head.tax_snapshot && !isTaxConfigurationApproved(taxPolicy)) {
        throw ERR("TAX_POLICY_UNAPPROVED", "Sales posting is blocked until seller registration and domestic tax rules are owner-verified and accountant-reviewed.");
      }
      if (!isUpdate) {
        const exists=await c.query(`SELECT 1 FROM public.${s.table} WHERE company_id=$1 AND id=$2`,[companyId,id]);
        if(exists.rowCount) throw ERR("DUPLICATE_TRANSACTION","This transaction ID already exists.");
      }
      if (isHistoricalTransactionProtected(old?.head)) throw ERR("HISTORICAL_PROTECTED", "Historical transactions are protected.");
      if (typeof input[type === "purchase" ? "purchaseDate" : "salesDate"] !== "string"
        || !input[type === "purchase" ? "purchaseDate" : "salesDate"].trim()) throw ERR("INVALID_TRANSACTION", "Transaction date is required.");
      const productMap = await products(c, companyId, input.items);
      const partner = await validatePartner(c, type, companyId, type === "purchase" ? input.supplierCode : input.customerCode);
      const taxResult = type === "sale" ? determineDomesticSaleTax({
        configuration: taxPolicy,
        invoiceType: input.invoiceType,
        salesDate: input.salesDate,
        placeOfSupplyStateCode: input.placeOfSupplyStateCode,
        placeOfSupplyBasis: input.placeOfSupplyBasis,
        placeOfSupplyAddress: input.placeOfSupplyAddress,
        lines: input.items,
        products: [...productMap.values()],
        frozenSnapshot: old?.head.tax_snapshot ?? null,
      }) : null;
      const items = (type === "purchase" ? input.items.map(calculatePurchaseItem) : taxResult.items)
        .map((item, index) => ({ ...item, lineId: item.lineId || idFactory() || `line-${index + 1}` }));
      if (new Set(items.map(x => x.lineId)).size !== items.length) throw ERR("INVALID_TRANSACTION", "Transaction line IDs must be unique.");
      const documentInput={...input};
      if (taxResult) Object.assign(documentInput, {
        items,
        taxableAmount: taxResult.taxableAmount,
        gstAmount: taxResult.gstAmount,
        cgst: taxResult.cgst,
        sgst: taxResult.sgst,
        igst: taxResult.igst,
        grandTotal: taxResult.grandTotal,
        taxDocumentType: taxResult.documentType,
        taxSnapshot: taxResult.taxSnapshot,
      });
      if (!isUpdate) {
        documentInput[type === "purchase" ? "purchaseNo" : "salesNo"] = await nextDocumentNumber(c,type,companyId);
        if(type==="sale") documentInput.invoiceNo=await nextSalesInvoiceNumber(c,companyId,input.invoiceType);
      } else if(old) {
        documentInput[type === "purchase" ? "purchaseNo" : "salesNo"] = old.head[type === "purchase" ? "purchase_no" : "sales_no"];
        documentInput.invoiceNo=old.head.invoice_no;
      }
      for(const field of (type==="purchase"?["purchaseDate","invoiceNo","supplierCode"]:["salesDate","invoiceNo","customerCode"])) {
        if(typeof documentInput[field]!=="string"||!documentInput[field].trim()) throw ERR("INVALID_TRANSACTION",`${field} is required.`);
      }
      const impacts = type === "sale" && input.status === "Cancelled" ? [] : items.map(line => ({ line, ...stockImpact(line, productMap.get(line.productCode), type) }));
      const postedAt = old?.head.posted_at ?? clock();
      if (!Number.isFinite(new Date(postedAt).getTime()) || new Date(postedAt).getTime() < CUTOVER) throw ERR("CUTOVER", "New stock-affecting transactions must be posted on or after the approved cutover.");
      const prior = old ? await c.query(`SELECT line_id,product_code,stock_code,unit,source_quantity,net_weight_grams,sum(quantity_delta_kg)::text AS net FROM public.stock_movement_events WHERE company_id=$1 AND transaction_type=$2 AND transaction_id=$3 GROUP BY line_id,product_code,stock_code,unit,source_quantity,net_weight_grams HAVING sum(quantity_delta_kg) <> 0`, [companyId, type, id]) : { rows: [] };
      const required = new Map();
      for (const x of impacts) required.set(x.stockCode, required.get(x.stockCode) || 0);
      for (const x of impacts) required.set(x.stockCode, (required.get(x.stockCode) || 0) + Math.max(0, -x.delta));
      for (const [code, amount] of required) {
        const available = await inventory(c, companyId, code);
        const returned = prior.rows.filter(x => x.stock_code === code).reduce((n, x) => n + Math.max(0, -Number(x.net)), 0);
        if (amount > available + returned + 1e-9) throw ERR("INSUFFICIENT_STOCK", `Insufficient available stock for ${code}.`);
      }
      const revisionResult = await c.query("SELECT coalesce(max(revision),0)+1 AS revision FROM public.stock_movement_events WHERE company_id=$1 AND transaction_type=$2 AND transaction_id=$3", [companyId, type, id]);
      const revision = Number(revisionResult.rows[0].revision);
      for (const oldLine of prior.rows) await insertEvent(c, { companyId, type, id, revision, kind: "reverse", lineId: oldLine.line_id, productCode: oldLine.product_code, stockCode: oldLine.stock_code, delta: -Number(oldLine.net), quantity: Math.abs(Number(oldLine.source_quantity)), unit: oldLine.unit, grams: Number(oldLine.net_weight_grams), postedAt });
      const totalItems = items;
      const header = type === "purchase" ? purchaseHeader(documentInput, partner, totalItems) : saleHeader(documentInput, partner, totalItems, taxResult.taxSnapshot);
      if (old) {
        const columns = Object.keys(header);
        await c.query(`UPDATE public.${s.table} SET ${columns.map((k,i)=>`${k}=$${i+3}`).join(",")}, posted_at=$${columns.length+3}, source_record=$${columns.length+4}::jsonb WHERE company_id=$1 AND id=$2`, [companyId,id,...Object.values(header),postedAt,JSON.stringify({ ...documentInput, items })]);
        await c.query(`DELETE FROM public.${s.items} WHERE ${s.idColumn}=$1`, [id]);
      } else {
        const names = ["id","company_id",...Object.keys(header),"posted_at","source_record"];
        const values = [id,companyId,...Object.values(header),postedAt,JSON.stringify({ ...documentInput, items })];
        const casts = values.map((_,i)=>i===values.length-1?"::jsonb":"");
        await c.query(`INSERT INTO public.${s.table} (${names.join(",")}) VALUES (${values.map((_,i)=>`$${i+1}${casts[i]}`).join(",")})`, values);
      }
      for (const [i,line] of items.entries()) {
        const cols = type === "purchase"
          ? ["purchase_id","row_number","line_id","product_code","product_name","hsn","unit","qty","rate","amount","gst","gst_amount","net_amount"]
          : ["sales_id","row_number","line_id","product_code","product_name","hsn","unit","qty","rate","amount","gst","gst_amount","taxable_amount","cgst","sgst","igst","grand_total"];
        const vals = type === "purchase" ? [id,i+1,line.lineId,line.productCode,line.productName,line.hsn,line.unit,line.qty,line.rate,line.amount,line.gst,line.gstAmount,line.netAmount]
          : [id,i+1,line.lineId,line.productCode,line.productName,line.hsn,line.unit,line.qty,line.rate,line.amount,line.gst,line.gstAmount,line.taxableAmount,line.cgst,line.sgst,line.igst,line.grandTotal];
        await c.query(`INSERT INTO public.${s.items} (${cols.join(",")}) VALUES (${vals.map((_,j)=>`$${j+1}`).join(",")})`, vals);
      }
      for (const [i,x] of impacts.entries()) await insertEvent(c, { companyId,type,id,revision,kind:"post",lineId:items[i].lineId || `line-${i+1}`,productCode:x.line.productCode,stockCode:x.stockCode,delta:x.delta,quantity:x.line.qty,unit:x.line.unit,grams:x.grams,postedAt });
      const saved = await getRaw(c,type,companyId,id);
      const mappedItems = await listItems(c,type,id);
      return type === "purchase" ? mapPurchase(saved.head,mappedItems) : mapSale(saved.head,mappedItems);
    });
  }
  async function previewSale(input) {
    const companyId = await company();
    const taxPolicy = await getSalesTaxPolicy(companyId);
    if (!isTaxConfigurationApproved(taxPolicy)) throw ERR("TAX_POLICY_UNAPPROVED", "Sales preview is unavailable until the domestic tax configuration is owner-verified and accountant-reviewed.");
    if (!input || !Array.isArray(input.items) || !input.items.length || input.items.length > 500) throw ERR("INVALID_TRANSACTION", "Transaction requires between 1 and 500 items.");
    validateLines(input.items);
    const productMap = await products(database, companyId, input.items);
    return determineDomesticSaleTax({
      configuration: taxPolicy,
      invoiceType: input.invoiceType,
      salesDate: input.salesDate,
      placeOfSupplyStateCode: input.placeOfSupplyStateCode,
      placeOfSupplyBasis: input.placeOfSupplyBasis,
      placeOfSupplyAddress: input.placeOfSupplyAddress,
      lines: input.items,
      products: [...productMap.values()],
    });
  }
  return {
    async preview(type, input) { if (type !== "sale") throw ERR("INVALID_TRANSACTION", "Tax preview is available only for sales."); return previewSale(input); },
    async list(type, { q = "", limit = 200, offset = 0 } = {}) {
      if (!specs[type] || typeof q !== "string" || q.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) throw ERR("INVALID_QUERY","Transaction query is invalid.");
      const companyId=await company(),s=specs[type],search=q?`%${q.replace(/[\\%_]/g,"\\$&")}%`:null;
      const entryTimestamp = type === "purchase" ? "created_at" : "created_on";
      const {rows}=await database.query(`SELECT * FROM public.${s.table} WHERE company_id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR ${s.number} ILIKE $2 OR invoice_no ILIKE $2 OR ${type==="purchase"?"supplier_name":"customer_name"} ILIKE $2) ORDER BY ${entryTimestamp} DESC NULLS LAST,${s.date} DESC,${s.number} DESC LIMIT $3 OFFSET $4`,[companyId,search,limit,offset]);
      return Promise.all(rows.map(async row=>type==="purchase"?mapPurchase(row,await listItems(database,type,row.id)):mapSale(row,await listItems(database,type,row.id))));
    },
    async get(type,id) { if(!specs[type]) throw ERR("INVALID_QUERY","Transaction type is invalid.");cleanId(id);const c=await company(),raw=await getRaw(database,type,c,id);if(!raw)return null;const items=await listItems(database,type,id);return type==="purchase"?mapPurchase(raw.head,items):mapSale(raw.head,items); },
    async create(type,input) { if(!specs[type])throw ERR("INVALID_TRANSACTION","Transaction type is invalid.");return persist(type,input,input?.id?cleanId(input.id):idFactory(),false); },
    async update(type,id,input) { if(!specs[type])throw ERR("INVALID_TRANSACTION","Transaction type is invalid.");return persist(type,input,cleanId(id),true); },
    async remove(type,id) {
      if(!specs[type])throw ERR("INVALID_TRANSACTION","Transaction type is invalid.");cleanId(id);const companyId=await company(),s=specs[type];
      return transaction(async c=>{const old=await getRaw(c,type,companyId,id,true);if(!old)return false;if(isHistoricalTransactionProtected(old.head))throw ERR("HISTORICAL_PROTECTED","Historical transactions are protected.");
        const prior=await c.query("SELECT line_id,product_code,stock_code,unit,source_quantity,net_weight_grams,sum(quantity_delta_kg)::text AS net FROM public.stock_movement_events WHERE company_id=$1 AND transaction_type=$2 AND transaction_id=$3 GROUP BY line_id,product_code,stock_code,unit,source_quantity,net_weight_grams HAVING sum(quantity_delta_kg)<>0",[companyId,type,id]);
        const revision=Number((await c.query("SELECT coalesce(max(revision),0)+1 AS revision FROM public.stock_movement_events WHERE company_id=$1 AND transaction_type=$2 AND transaction_id=$3",[companyId,type,id])).rows[0].revision);
        for(const x of prior.rows)await insertEvent(c,{companyId,type,id,revision,kind:"reverse",lineId:x.line_id,productCode:x.product_code,stockCode:x.stock_code,delta:-Number(x.net),quantity:Math.abs(Number(x.source_quantity)),unit:x.unit,grams:Number(x.net_weight_grams),postedAt:old.head.posted_at});
        await c.query(`UPDATE public.${s.table} SET deleted_at=now() WHERE company_id=$1 AND id=$2`,[companyId,id]);return true;});
    },
  };
}

async function insertEvent(c,x) {
  const eventKey=`${x.type}:${x.id}:${x.revision}:${x.kind}:${x.lineId}`;
  await c.query(`INSERT INTO public.stock_movement_events(id,company_id,transaction_type,transaction_id,revision,event_type,line_id,product_code,stock_code,quantity_delta_kg,source_quantity,unit,net_weight_grams,posted_at,event_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(company_id,event_key) DO NOTHING`,[randomUUID(),x.companyId,x.type,x.id,x.revision,x.kind,x.lineId,x.productCode,x.stockCode,String(x.delta),String(x.quantity),x.unit,String(x.grams),x.postedAt,eventKey]);
}
function purchaseHeader(input,partner,items) { const totalQty=items.reduce((n,x)=>n+x.qty,0),totalAmount=round2(items.reduce((n,x)=>n+x.amount,0)),totalGstAmount=round2(items.reduce((n,x)=>n+x.gstAmount,0));return {purchase_no:input.purchaseNo,purchase_date:input.purchaseDate,invoice_no:input.invoiceNo,supplier_code:partner.code,supplier_name:partner.name,contact_person:input.contactPerson||"",total_qty:String(totalQty),total_amount:String(totalAmount),total_gst_amount:String(totalGstAmount),total_net_amount:String(round2(totalAmount+totalGstAmount)),remarks:input.remarks||""}; }
function saleHeader(input,partner,items,taxSnapshot) { if(!["GST","NON_GST"].includes(input.invoiceType)||!["Cash","UPI","Card","Bank","Credit"].includes(input.paymentMode)||!["Completed","Pending","Cancelled"].includes(input.status))throw ERR("INVALID_TRANSACTION","Sales invoice type, payment mode or status is invalid.");const sum=k=>items.reduce((n,x)=>n+Number(x[k]||0),0);return {sales_no:input.salesNo,sales_date:input.salesDate,invoice_no:input.invoiceNo,invoice_type:input.invoiceType,customer_code:partner.code,customer_name:partner.name,contact_person:input.contactPerson||"",taxable_amount:String(sum("taxableAmount")),gst_amount:String(sum("gstAmount")),cgst:String(sum("cgst")),sgst:String(sum("sgst")),igst:String(sum("igst")),grand_total:String(sum("grandTotal")),payment_mode:input.paymentMode,status:input.status,remarks:input.remarks||"",created_at:input.createdAt||new Date().toISOString(),updated_at:new Date().toISOString(),tax_snapshot:taxSnapshot}; }
