import test from "node:test";
import assert from "node:assert/strict";
import {calculatePurchaseItem,calculateSaleItem,createTradeDAL,isHistoricalTransactionProtected,stockImpact} from "../app/transactions/server/trade-dal.mjs";

test("purchase calculations preserve existing two-decimal line rounding",()=>{
  assert.deepEqual(calculatePurchaseItem({qty:2,rate:3.333,gst:5}),{qty:2,rate:3.333,gst:5,amount:6.67,gstAmount:0.33,netAmount:7});
});
test("sales GST calculation follows the existing CGST/SGST split without changing IGST",()=>{
  assert.deepEqual(calculateSaleItem({qty:2,rate:10,gst:5},"GST"),{qty:2,rate:10,gst:5,amount:20,taxableAmount:20,gstAmount:1,cgst:.5,sgst:.5,igst:0,grandTotal:21});
  assert.equal(calculateSaleItem({qty:1,rate:10,gst:5},"NON_GST").gstAmount,0);
});
test("approved packet sales deduct exact kilograms from P0006",()=>{
  for(const [code,grams] of Object.entries({P0001:50,P0002:100,P0003:200,P0004:500,P0005:1000})) {
    const result=stockImpact({qty:1,unit:"Pkt",productCode:code},{code,net_weight:grams,stock_base_code:"P0006"},"sale");
    assert.equal(result.stockCode,"P0006");assert.equal(result.delta,-grams/1000);
  }
});
test("Loose Haldi and P0007 remain independent and purchase policy rejects packet purchase",()=>{
  assert.deepEqual(stockImpact({qty:.5,unit:"KG",productCode:"P0006"},{code:"P0006",net_weight:0},"sale"),{stockCode:"P0006",delta:-.5,grams:0});
  assert.equal(stockImpact({qty:2,unit:"Pkt",productCode:"P0007"},{code:"P0007",net_weight:100,stock_base_code:"P0006"},"sale").stockCode,"P0007");
  assert.throws(()=>stockImpact({qty:1,unit:"Pkt",productCode:"P0001"},{},"purchase"),{code:"PURCHASE_POLICY"});
});
test("unsupported units and non-positive quantities are rejected",()=>{
  assert.throws(()=>stockImpact({qty:1,unit:"Box",productCode:"P0006"},{code:"P0006"},"sale"),{code:"INVALID_UNIT"});
  assert.throws(()=>calculateSaleItem({qty:0,rate:1},"NON_GST"),{code:"INVALID_TRANSACTION"});
});

test("new sales fail closed until a tax policy is explicitly approved",async()=>{
  let databaseUsed=false;
  const dal=createTradeDAL({
    getOwnerContext:async()=>({company:{company_id:"company-id"}}),
    database:{connect:async()=>{databaseUsed=true;throw new Error("database should not be used");}},
  });
  const input={salesDate:"2026-11-10",invoiceNo:"",invoiceType:"GST",customerCode:"C1",items:[{productCode:"P0006",productName:"Loose Haldi",hsn:"",unit:"KG",qty:1,rate:10,gst:5}]};
  await assert.rejects(dal.create("sale",input),{code:"TAX_POLICY_UNAPPROVED"});
  assert.equal(databaseUsed,false);
});

test("legacy-imported transactions remain protected without inventing a posted timestamp",()=>{
  assert.equal(isHistoricalTransactionProtected({historical_imported:true,posted_at:null}),true);
  assert.equal(isHistoricalTransactionProtected({historical_imported:false,posted_at:"2026-11-05T18:29:59.999Z"}),true);
  assert.equal(isHistoricalTransactionProtected({historical_imported:false,posted_at:"2026-11-05T18:30:00.000Z"}),false);
  assert.equal(isHistoricalTransactionProtected({historical_imported:false,posted_at:null}),false);
});

test("historical import marker blocks edit and delete before any business-row write",async()=>{
  const statements=[];
  const client={
    async query(sql){
      statements.push(sql);
      if(sql.startsWith("SELECT * FROM public.purchases"))return{rowCount:1,rows:[{id:"legacy-id",company_id:"company-id",posted_at:null,historical_imported:true}]};
      return{rowCount:0,rows:[]};
    },
    release(){},
  };
  const dal=createTradeDAL({getOwnerContext:async()=>({company:{company_id:"company-id"}}),database:{connect:async()=>client}});
  const input={items:[{productCode:"P0006",productName:"Synthetic",hsn:"0000",unit:"KG",qty:1,rate:1,gst:0}]};
  await assert.rejects(dal.update("purchase","legacy-id",input),{code:"HISTORICAL_PROTECTED"});
  await assert.rejects(dal.remove("purchase","legacy-id"),{code:"HISTORICAL_PROTECTED"});
  assert.equal(statements.some(sql=>/^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql)),false);
});
