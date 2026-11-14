import "./env.mjs";
import pg from "pg";
import {randomUUID} from "node:crypto";
import {createTradeDAL} from "../../app/transactions/server/trade-dal.mjs";
import {createStockDAL} from "../../app/transactions/server/stock-dal.mjs";

function testTarget(value){const url=new URL(value||"");if(!["postgres:","postgresql:"].includes(url.protocol)||url.hostname!=="127.0.0.1"||url.port!=="5432"||decodeURIComponent(url.pathname.slice(1))!=="uk_exim_erp_test"||url.search||url.hash)throw new Error("Trade integration tests are restricted to 127.0.0.1:5432/uk_exim_erp_test.");return url;}
const pool=new pg.Pool({connectionString:testTarget(process.env.TEST_DATABASE_URL).toString(),max:1});
const client=await pool.connect();
const checks=[];
function assert(condition,name){if(!condition)throw new Error(`Synthetic trade integration check failed: ${name}`);checks.push(name);}
try{
  const identity=(await client.query("SELECT current_database() AS database,host(inet_server_addr()) AS address,inet_server_port() AS port,current_setting('server_version') AS version")).rows[0];
  if(identity.database!=="uk_exim_erp_test"||identity.address!=="127.0.0.1"||Number(identity.port)!==5432)throw new Error("Connected database identity is not the local TEST database.");
  await client.query("BEGIN");
  const companyId=randomUUID(),productIds={P0001:randomUUID(),P0006:randomUUID(),P0007:randomUUID()},supplierId=randomUUID(),customerId=randomUUID();
  await client.query("INSERT INTO public.companies(id,name) VALUES($1,$2)",[companyId,`Synthetic Trade ${companyId}`]);
  const productValues=[
    [productIds.P0001,"P0001","Synthetic 50g packet","Pkt",50,"P0006"],
    [productIds.P0006,"P0006","Synthetic Loose Haldi","KG",0,"P0006"],
    [productIds.P0007,"P0007","Synthetic independent product","Pkt",50,"P0007"],
  ];
  for(const [id,code,name,unit,weight,base] of productValues)await client.query(`INSERT INTO products(id,company_id,code,name,category,hsn,gst,unit,net_weight,stock_base_code,purchase,sale,mrp,base_cost,packing_cost,other_charges,total_cost,stock,minimum_stock,active)
    VALUES($1,$2,$3,$4,'Synthetic','0000','5%', $5,$6,$7,1,2,2,1,0,0,1,0,0,true)`,[id,companyId,code,name,unit,weight,base]);
  await client.query(`INSERT INTO suppliers(id,company_id,code,name,source_record,status) VALUES($1,$2,'SUP-T1','Synthetic Supplier','{}'::jsonb,'Active')`,[supplierId,companyId]);
  await client.query(`INSERT INTO customers(id,company_id,code,name,contact_person,mobile,email,gst,pan,address,city,state,country,pin_code,opening_balance,credit_limit,status,source_record)
    VALUES($1,$2,'C-T1','Synthetic Customer','','','','','','','','','','',0,0,'Active','{}'::jsonb)`,[customerId,companyId]);
  for(const [code,current] of [["P0006",0],["P0007",10]])await client.query(`INSERT INTO stock_baselines(id,company_id,product_code,product_name,hsn,unit,opening_stock,purchase_qty,sales_qty,current_stock,captured_at,source_record,verification_status,verification_sha256,verified_at)
    VALUES($1,$2,$3,$3,'0000','KG',0,0,0,$4,now(),'{}'::jsonb,'verified','synthetic-checksum',now())`,[randomUUID(),companyId,code,current]);
  const adapter={query:(sql,values)=>{
    if(sql==="BEGIN")return client.query("SAVEPOINT trade_dal");
    if(sql==="COMMIT")return client.query("RELEASE SAVEPOINT trade_dal");
    if(sql==="ROLLBACK")return client.query("ROLLBACK TO SAVEPOINT trade_dal");
    return client.query(sql,values);
  },release(){}};
  const database={connect:async()=>adapter,query:(sql,values)=>client.query(sql,values)};
  const owner={company:{company_id:companyId}};
  // Synthetic-only policy fixture: integration checks exercise stock/ledger
  // behavior without granting a real company an approved tax policy.
  const dal=createTradeDAL({getOwnerContext:async()=>owner,database,getSalesTaxPolicy:async()=>({approved:true,source:"synthetic-test-only"})});
  const purchase=await dal.create("purchase",{id:`synthetic-purchase-${randomUUID()}`,purchaseNo:"client-grn-ignored",purchaseDate:"2026-11-13",invoiceNo:"SUP-INV-1",supplierCode:"SUP-T1",contactPerson:"",items:[{lineId:"purchase-line",productCode:"P0006",productName:"Synthetic Loose Haldi",hsn:"0000",unit:"KG",qty:100,rate:10,gst:5}],remarks:"synthetic"});
  assert(purchase.purchaseNo==="GRN-0001"&&purchase.totalNetAmount===1050,"purchase create, GRN numbering, and GST totals");
  let balance=await client.query("SELECT current_stock::text FROM stock_baselines WHERE company_id=$1 AND product_code='P0006'",[companyId]);
  const movement1=await client.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS amount FROM stock_movement_events WHERE company_id=$1 AND stock_code='P0006'",[companyId]);
  assert(Number(balance.rows[0].current_stock)+Number(movement1.rows[0].amount)===100,"purchase increases protected baseline projection exactly");
  const saleInput={id:`synthetic-sale-${randomUUID()}`,salesNo:"client-sales-ignored",salesDate:"2026-11-13",invoiceType:"GST",invoiceNo:"client-invoice-ignored",customerCode:"C-T1",contactPerson:"",items:[{lineId:"sale-line",productCode:"P0001",productName:"Synthetic 50g packet",hsn:"0000",unit:"Pkt",qty:1,rate:20,gst:5}],taxableAmount:20,gstAmount:1,cgst:.5,sgst:.5,igst:0,grandTotal:21,paymentMode:"Credit",status:"Completed",remarks:"synthetic",createdAt:new Date().toISOString()};
  const sale=await dal.create("sale",saleInput);
  assert(sale.salesNo==="SAL-0001"&&sale.invoiceNo.startsWith("UK"),"sales create and existing SAL/UK invoice numbering formats");
  let events=await client.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS amount FROM stock_movement_events WHERE company_id=$1 AND stock_code='P0006'",[companyId]);
  assert(Number(events.rows[0].amount)===99.95,"50g packet sale maps to a 0.05kg P0006 deduction");
  const duplicate=await dal.create("sale",saleInput).then(()=>false).catch(error=>error.code==="DUPLICATE_TRANSACTION");
  assert(duplicate,"duplicate transaction ID rejected without a second movement");
  const edited=await dal.update("sale",sale.id,{...saleInput,items:[{...saleInput.items[0],qty:2}]});
  events=await client.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS amount FROM stock_movement_events WHERE company_id=$1 AND stock_code='P0006'",[companyId]);
  assert(edited.items[0].qty===2&&Number(events.rows[0].amount)===99.9,"sale edit reverses prior event and posts replacement atomically");
  const otherCompanyDal=createTradeDAL({getOwnerContext:async()=>({company:{company_id:randomUUID()}}),database});
  assert((await otherCompanyDal.get("sale",sale.id))===null,"cross-company transaction read is isolated");
  const insufficient=await dal.create("sale",{...saleInput,id:`synthetic-insufficient-${randomUUID()}`,items:[{...saleInput.items[0],qty:3000}]}).then(()=>false).catch(error=>error.code==="INSUFFICIENT_STOCK");
  assert(insufficient,"aggregate stock validation rejects insufficient stock");
  await dal.remove("sale",sale.id);
  events=await client.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS amount FROM stock_movement_events WHERE company_id=$1 AND stock_code='P0006'",[companyId]);
  assert(Number(events.rows[0].amount)===100,"sale delete appends reversal and restores purchase balance");
  const independentSale=await dal.create("sale",{...saleInput,id:`synthetic-p7-sale-${randomUUID()}`,invoiceType:"NON_GST",status:"Completed",items:[{...saleInput.items[0],productCode:"P0007",productName:"Synthetic independent product",qty:1,gst:0}]});
  const independentEvents=await client.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS amount FROM stock_movement_events WHERE company_id=$1 AND stock_code='P0007'",[companyId]);
  const haldiEvents=await client.query("SELECT coalesce(sum(quantity_delta_kg),0)::text AS amount FROM stock_movement_events WHERE company_id=$1 AND stock_code='P0006'",[companyId]);
  assert(independentSale.items[0].qty===1&&Number(independentEvents.rows[0].amount)===-.05&&Number(haldiEvents.rows[0].amount)===100,"P0007 sale affects only independent P0007 stock");
  const packetPurchase=await dal.create("purchase",{...purchase,id:`synthetic-packet-purchase-${randomUUID()}`,items:[{...purchase.items[0],productCode:"P0001",unit:"Pkt"}]}).then(()=>false).catch(error=>error.code==="PURCHASE_POLICY");
  assert(packetPurchase,"packet purchase flow refused under Loose Haldi-only purchase policy");
  const stockDal=createStockDAL({getOwnerContext:async()=>owner,database});
  const currentStock=await stockDal.listCurrentStock();
  const currentHaldi=currentStock.find(row=>row.productCode==="P0006");
  assert(Number(currentHaldi?.currentStock)===100&&Number(currentHaldi?.minimumStock)===0,"PostgreSQL stock projection returns verified baseline plus movements and product minimum stock");
  const eventRows=await client.query("SELECT count(*)::int AS n FROM stock_movement_events WHERE company_id=$1",[companyId]);
  assert(eventRows.rows[0].n>=5,"movement events are retained across post/edit/delete revisions");
  await client.query("ROLLBACK");
  console.log(JSON.stringify({result:"PASS",identity:{database:identity.database,address:identity.address,port:Number(identity.port),version:identity.version},checksPassed:checks.length,checks,syntheticFixture:"outer transaction rolled back; no TEST fixture rows retained"},null,2));
}catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();await pool.end();}
