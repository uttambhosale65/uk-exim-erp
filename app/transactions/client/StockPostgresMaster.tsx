"use client";

import {useCallback,useEffect,useState} from "react";
import StockTable from "@/app/components/stock/StockTable";
import type {Stock} from "@/app/components/stock/StockTypes";
import type {Product} from "@/app/product/components/ProductTypes";

type EventRow={transactionType:string;transactionId:string;revision:number;eventType:string;lineId:string;productCode:string;stockCode:string;quantityDeltaKg:string;sourceQuantity:string;unit:string;netWeightGrams:string;postedAt:string};
async function response(url:string){const r=await fetch(url,{cache:"no-store",credentials:"same-origin"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||"Stock data could not be loaded.");return data;}
export default function StockPostgresMaster(){
  const [stock,setStock]=useState<Stock[]>([]),[products,setProducts]=useState<Product[]>([]),[events,setEvents]=useState<EventRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const refresh=useCallback(async()=>{setLoading(true);setError("");try{const [s,p,l]=await Promise.all([response("/api/stock/current"),response("/api/products"),response("/api/stock/ledger?limit=500")]);if(!Array.isArray(s.stock)||!Array.isArray(p.products)||!Array.isArray(l.events))throw new Error("Stock API response was invalid.");setStock(s.stock.map((x:Record<string,string>)=>({id:x.id,productCode:x.productCode,productName:x.productName,hsn:x.hsn,unit:x.unit,openingStock:Number(x.openingStock),purchaseQty:Number(x.purchaseQty),salesQty:Number(x.salesQty),grossPurchaseMovementQty:Number(x.grossPurchaseMovementQty),grossSalesMovementQty:Number(x.grossSalesMovementQty),currentStock:Number(x.currentStock)})));setProducts(p.products);setEvents(l.events);}catch(e){setError(e instanceof Error?e.message:"Stock data could not be loaded.");}finally{setLoading(false);}},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void refresh();},0);return()=>window.clearTimeout(timer);},[refresh]);
  const low=stock.filter(row=>{const minimum=Number(products.find(p=>p.code===row.productCode)?.minimumStock||0);return minimum>0&&row.currentStock<minimum;});
  return <section style={{maxWidth:1500,margin:"0 auto",padding:12}}>
    <h2 style={{color:"#14532d",margin:"0 0 14px"}}>📦 Stock Register</h2>
    <p style={{padding:10,background:"#fffbeb",borderRadius:6,color:"#92400e"}}>Opening balances are read-only protected baselines. Current stock is baseline plus company-scoped PostgreSQL movement events.</p>
    {error&&<div role="alert" style={{padding:10,background:"#fee2e2",color:"#991b1b"}}>{error}<button type="button" onClick={()=>void refresh()}>Retry</button></div>}
    {loading?<p role="status">Loading PostgreSQL stock…</p>:stock.length===0?<p role="status">No verified stock baseline is available. Stock posting remains blocked until an approved baseline import is verified.</p>:<>
      {low.length>0&&<div role="alert" style={{padding:10,background:"#fff7ed",color:"#9a3412",marginBottom:10}}><strong>Minimum stock alerts:</strong> {low.map(x=>x.productCode).join(", ")}</div>}
      <StockTable stock={stock}/>
      <h3 style={{marginTop:22}}>Stock Movement Ledger</h3>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Posted at","Transaction","ID","Revision","Line","Product","Stock code","Qty delta (kg)"].map(h=><th key={h} style={{padding:8,textAlign:"left",borderBottom:"2px solid #14532d"}}>{h}</th>)}</tr></thead><tbody>{events.length?events.map(e=><tr key={`${e.transactionType}-${e.transactionId}-${e.revision}-${e.eventType}-${e.lineId}`}><td>{new Date(e.postedAt).toLocaleString()}</td><td>{e.transactionType} / {e.eventType}</td><td>{e.transactionId}</td><td>{e.revision}</td><td>{e.lineId}</td><td>{e.productCode}</td><td>{e.stockCode}</td><td>{Number(e.quantityDeltaKg).toFixed(6)}</td></tr>):<tr><td colSpan={8} style={{padding:18,textAlign:"center"}}>No PostgreSQL stock movement events.</td></tr>}</tbody></table></div>
    </>}
  </section>;
}
