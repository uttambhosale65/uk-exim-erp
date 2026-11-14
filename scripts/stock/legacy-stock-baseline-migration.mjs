import "../db/env.mjs";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import pg from "pg";

export const BACKUP_PATH="C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
export const EXPECTED_BACKUP_SHA256="A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
export const TARGET_COMPANY="UK EXIM ENTERPRISES";
export const TARGET_COMPANY_ID="c05f99c0-e21c-4766-9cf4-5aa34bb37e11";
const hash=value=>createHash("sha256").update(value,"utf8").digest("hex").toUpperCase();
const FIELDS=["id","productCode","productName","hsn","unit","openingStock","purchaseQty","salesQty","currentStock"];

export function inspectStockBackup(raw){
  const backupHash=hash(raw);
  if(backupHash!==EXPECTED_BACKUP_SHA256)throw new Error("Approved full-backup checksum mismatch.");
  const backup=JSON.parse(raw),entry=backup?.keys?.["uk-exim-stock"];
  if(!entry||entry.exists!==true||entry.parseSucceeded!==true||typeof entry.raw!=="string"||hash(entry.raw)!==String(entry.sha256).toUpperCase())throw new Error("Stock source entry or checksum is invalid.");
  const records=JSON.parse(entry.raw);
  if(!Array.isArray(records)||records.length===0)throw new Error("Stock source must be a non-empty array.");
  const ids=new Set(),codes=new Set();
  for(const [i,row] of records.entries()){
    if(!row||typeof row!=="object"||Array.isArray(row))throw new Error(`Stock source row ${i+1} is invalid.`);
    for(const field of FIELDS){const value=row[field];if(field==="openingStock"||field==="purchaseQty"||field==="salesQty"||field==="currentStock"){if(typeof value!=="number"||!Number.isFinite(value))throw new Error(`Stock source row ${i+1} has invalid ${field}.`);}else if(typeof value!=="string"||!value.trim())throw new Error(`Stock source row ${i+1} has invalid ${field}.`);}
    if(ids.has(row.id)||codes.has(row.productCode))throw new Error("Stock source contains duplicate IDs or product codes.");ids.add(row.id);codes.add(row.productCode);
  }
  return {backupHash,entryHash:hash(entry.raw),records,entry};
}
export function parseStrictDevUrl(value){let url;try{url=new URL(value);}catch{throw new Error("DATABASE_URL is invalid.");}if(!["postgres:","postgresql:"].includes(url.protocol)||url.hostname!=="127.0.0.1"||url.port!=="5432"||decodeURIComponent(url.pathname.slice(1))!=="uk_exim_erp_dev"||url.search||url.hash)throw new Error("Stock baseline migration is restricted to 127.0.0.1:5432/uk_exim_erp_dev.");return url;}

const source=inspectStockBackup(await readFile(BACKUP_PATH,"utf8"));
const apply=process.argv.includes("--apply");
const approved=process.argv.includes("--owner-approved");
if(process.argv.some(arg=>arg.startsWith("--")&&arg!=="--apply"&&arg!=="--owner-approved"))throw new Error("Only --apply and --owner-approved options are supported.");
if(apply&&!approved)throw new Error("A separate explicit owner approval is required: --owner-approved.");
if(process.env.NODE_ENV==="production")throw new Error("Stock baseline migration is disabled in production.");
const url=parseStrictDevUrl(process.env.DATABASE_URL||""),client=new pg.Client({connectionString:url.toString()});
try{
  await client.connect();
  if(apply)await client.query("BEGIN");else await client.query("BEGIN READ ONLY");
  const identity=(await client.query("SELECT current_database() AS database,host(inet_server_addr()) AS address,inet_server_port() AS port,current_setting('server_version') AS version")).rows[0];
  if(identity.database!=="uk_exim_erp_dev"||identity.address!=="127.0.0.1"||Number(identity.port)!==5432)throw new Error("Connected database identity is not approved local DEV.");
  const company=await client.query("SELECT id::text AS id FROM public.companies WHERE name=$1",[TARGET_COMPANY]);
  if(company.rowCount!==1||company.rows[0].id!==TARGET_COMPANY_ID)throw new Error("Target company identity is missing or ambiguous.");
  const migration=await client.query("SELECT checksum FROM public._schema_migrations WHERE name='007_stock_baseline_source_snapshot.sql'");
  const verificationMigration=await client.query("SELECT checksum FROM public._schema_migrations WHERE name='008_verified_stock_baseline_gate.sql'");
  const columns=await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_baselines'");
  const available=new Set(columns.rows.map(x=>x.column_name));
  const required=["source_record","verification_status","verification_sha256","verified_at"];
  const schemaCompatible=required.every(x=>available.has(x));
  const productCheck=await client.query('SELECT s."productCode" FROM jsonb_to_recordset($1::jsonb) s("productCode" text) LEFT JOIN public.products p ON p.company_id=$2 AND p.code=s."productCode" WHERE p.id IS NULL',[JSON.stringify(source.records),TARGET_COMPANY_ID]);
  const productMappings=await client.query('SELECT p.code,p.stock_base_code FROM public.products p WHERE p.company_id=$1 AND p.code=ANY($2::text[]) ORDER BY p.code',[TARGET_COMPANY_ID,source.records.map(x=>x.productCode)]);
  const expectedMappings=new Map([["P0006","P0006"],["P0007","P0007"]]);
  const mappingMismatches=productMappings.rows.filter(row=>expectedMappings.has(row.code)&&row.stock_base_code!==expectedMappings.get(row.code));
  const target=await client.query("SELECT id,product_code,opening_stock::text,purchase_qty::text,sales_qty::text,current_stock::text FROM public.stock_baselines WHERE company_id=$1 ORDER BY product_code",[TARGET_COMPANY_ID]);
  const conflicts=await client.query('SELECT count(*)::int AS n FROM public.stock_baselines b JOIN jsonb_to_recordset($2::jsonb) s(id text,"productCode" text) ON b.id=s.id OR b.product_code=s."productCode" WHERE b.company_id=$1',[TARGET_COMPANY_ID,JSON.stringify(source.records)]);
  const sourceBalances=source.records.map(row=>({productCode:row.productCode,openingStock:row.openingStock,purchaseQty:row.purchaseQty,salesQty:row.salesQty,currentStock:row.currentStock}));
  const preview={operation:apply?"APPLY REQUESTED":"DRY RUN",backupSha256:source.backupHash,sourceEntrySha256:source.entryHash,sourceCount:source.records.length,sourceBalances,productMappings:productMappings.rows,mappingMismatches:mappingMismatches.map(row=>row.code),targetCompany:TARGET_COMPANY,targetCompanyId:TARGET_COMPANY_ID,targetCount:target.rowCount,targetProductCodes:target.rows.map(x=>x.product_code),uuidOrProductCodeConflicts:Number(conflicts.rows[0].n),missingProductReferences:productCheck.rows.map(x=>x.product_code),schemaCompatible,migration007Applied:migration.rowCount===1,migration008Applied:verificationMigration.rowCount===1,database:{name:identity.database,address:identity.address,port:Number(identity.port),version:identity.version},operationWrites:apply};
  const ready=preview.targetCount===0&&preview.uuidOrProductCodeConflicts===0&&preview.missingProductReferences.length===0&&preview.mappingMismatches.length===0&&schemaCompatible&&preview.migration007Applied&&preview.migration008Applied;
  preview.result=ready?"READY":"BLOCKED";
  if(!apply){await client.query("ROLLBACK");console.log(JSON.stringify(preview,null,2));process.exitCode=ready?0:2;}
  else {
    if(!ready)throw new Error("Stock baseline import preflight is blocked; transaction rolled back.");
    await client.query("SELECT pg_advisory_xact_lock(571015520,271829)");
    for(const row of source.records)await client.query(`INSERT INTO public.stock_baselines(id,company_id,product_code,product_name,hsn,unit,opening_stock,purchase_qty,sales_qty,current_stock,captured_at,source_record,verification_status,verification_sha256,verified_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11::jsonb,'verified',$12,now())`,[row.id,TARGET_COMPANY_ID,row.productCode,row.productName,row.hsn,row.unit,String(row.openingStock),String(row.purchaseQty),String(row.salesQty),String(row.currentStock),JSON.stringify(row),source.entryHash]);
    const verify=await client.query("SELECT count(*)::int AS n FROM public.stock_baselines WHERE company_id=$1 AND product_code=ANY($2::text[])",[TARGET_COMPANY_ID,source.records.map(x=>x.productCode)]);
    if(verify.rows[0].n!==source.records.length)throw new Error("Inserted stock baseline count did not verify; transaction rolled back.");
    await client.query("COMMIT");
    console.log(JSON.stringify({...preview,result:"APPLIED",verifiedCount:verify.rows[0].n},null,2));
  }
}catch(error){if(apply)await client.query("ROLLBACK").catch(()=>{});throw error;}finally{await client.end();}
