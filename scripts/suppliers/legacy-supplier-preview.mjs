import "../db/env.mjs";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import pg from "pg";

const BACKUP="C:/Users/ADMIN/Documents/UK-EXIM-ERP-Backups/UK-EXIM-ERP-Full-Backup-2026-11-12.json";
const BACKUP_SHA="A2928CD3E0BDB79CFB64AC264C4E5B0978B40B4BF9071B801A95C2320B8CB7C2";
const COMPANY="UK EXIM ENTERPRISES",COMPANY_ID="c05f99c0-e21c-4766-9cf4-5aa34bb37e11",KEY="uk-exim-suppliers";
const digest=value=>createHash("sha256").update(value,"utf8").digest("hex").toUpperCase();
const raw=await readFile(BACKUP,"utf8"),backup=JSON.parse(raw),entry=backup?.keys?.[KEY];
if(digest(raw)!==BACKUP_SHA)throw new Error("Approved backup checksum mismatch.");
if(!entry||entry.exists!==true||entry.parseSucceeded!==true||typeof entry.raw!=="string"||digest(entry.raw)!==String(entry.sha256).toUpperCase())throw new Error("Supplier source entry or checksum is invalid.");
const suppliers=JSON.parse(entry.raw);
if(!Array.isArray(suppliers))throw new Error("Supplier source is not an array.");
const ids=suppliers.map(x=>x?.id),codes=suppliers.map(x=>x?.code);
if(ids.some(x=>typeof x!=="string"||!x)||codes.some(x=>typeof x!=="string"||!x)||new Set(ids).size!==ids.length||new Set(codes).size!==codes.length)throw new Error("Supplier source contains invalid or duplicate identifiers.");
const url=new URL(process.env.DATABASE_URL||"");
if(!["postgres:","postgresql:"].includes(url.protocol)||url.hostname!=="127.0.0.1"||url.port!=="5432"||decodeURIComponent(url.pathname.slice(1))!=="uk_exim_erp_dev"||url.search||url.hash)throw new Error("Supplier preview is restricted to local DEV PostgreSQL.");
const client=new pg.Client({connectionString:url.toString()});
try{
  await client.connect();await client.query("BEGIN READ ONLY");
  const identity=(await client.query("SELECT current_database() AS database,host(inet_server_addr()) AS address,inet_server_port() AS port,current_setting('server_version') AS version")).rows[0];
  if(identity.database!=="uk_exim_erp_dev"||identity.address!=="127.0.0.1"||Number(identity.port)!==5432)throw new Error("Connected DEV identity is not the approved local database.");
  const company=(await client.query("SELECT id::text AS id FROM public.companies WHERE name=$1",[COMPANY]));
  if(company.rowCount!==1||company.rows[0].id!==COMPANY_ID)throw new Error("Target company identity is missing or ambiguous.");
  const target=await client.query("SELECT count(*)::int AS count FROM public.suppliers WHERE company_id=$1",[COMPANY_ID]);
  const conflicts=await client.query("SELECT count(*)::int AS count FROM public.suppliers t JOIN jsonb_to_recordset($2::jsonb) s(id text,code text) ON t.id=s.id OR t.code=s.code WHERE t.company_id=$1",[COMPANY_ID,JSON.stringify(suppliers)]);
  const sourceDuplicateCodes=await client.query("SELECT count(*)::int AS count FROM (SELECT code FROM jsonb_to_recordset($1::jsonb) s(code text) GROUP BY code HAVING count(*)>1) d",[JSON.stringify(suppliers)]);
  console.log(JSON.stringify({backupSha256:BACKUP_SHA,sourceEntrySha256:digest(entry.raw),sourceCount:suppliers.length,targetCompanyMatchCount:1,targetCompanyId:COMPANY_ID,targetCount:target.rows[0].count,sourceDuplicateCodeGroups:sourceDuplicateCodes.rows[0].count,uuidOrCodeConflicts:conflicts.rows[0].count,identity:{database:identity.database,address:identity.address,port:Number(identity.port),version:identity.version},operation:"READ ONLY; no Supplier import performed"},null,2));
  await client.query("ROLLBACK");
}finally{await client.end();}
