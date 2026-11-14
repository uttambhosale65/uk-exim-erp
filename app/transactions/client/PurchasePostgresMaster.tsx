"use client";

import { useCallback, useEffect, useState } from "react";
import PurchaseForm from "@/app/components/customer/purchase/PurchaseForm";
import PurchaseTable from "@/app/components/customer/purchase/PurchaseTable";
import GRNPrint from "@/app/components/customer/purchase/GRNPrint";
import TransactionConfirmModal from "@/app/components/common/TransactionConfirmModal";
import type { Purchase } from "@/app/components/customer/purchase/PurchaseTypes";
import type { Product } from "@/app/product/components/ProductTypes";
import type { Supplier } from "@/app/components/supplier/SupplierTypes";
import { getNextPurchaseNo } from "@/app/components/customer/purchase/PurchaseStorage";
import { deleteTrade, loadArray, loadTradeList, saveTrade } from "./trade-api-client";
import { TRADE_DATA_CHANGED_EVENT } from "./trade-events";

export default function PurchasePostgresMaster() {
  const [purchases,setPurchases]=useState<Purchase[]>([]),[products,setProducts]=useState<Product[]>([]),[suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [purchaseNo,setPurchaseNo]=useState("GRN-0001"),[editing,setEditing]=useState<Purchase|null>(null),[pending,setPending]=useState<Purchase|null>(null),[printing,setPrinting]=useState<Purchase|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const refresh=useCallback(async()=>{setLoading(true);setError("");try{const [p,pr,s]=await Promise.all([loadTradeList<Purchase>("/api/purchases"),loadArray<Product>("/api/products","products"),loadArray<Supplier>("/api/suppliers","suppliers")]);setPurchases(p);setPurchaseNo(getNextPurchaseNo(p));setProducts(pr);setSuppliers(s);}catch(e){setError(e instanceof Error?e.message:"Purchase data could not be loaded.");}finally{setLoading(false);}},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void refresh();},0);return()=>window.clearTimeout(timer);},[refresh]);
  const confirm=async()=>{if(!pending)return;setBusy(true);try{await saveTrade("/api/purchases",pending,editing?.id);window.dispatchEvent(new Event(TRADE_DATA_CHANGED_EVENT));setPending(null);setEditing(null);await refresh();}catch(e){setError(e instanceof Error?e.message:"Purchase could not be saved.");}finally{setBusy(false);}};
  const remove=async(id:string)=>{if(!window.confirm("Delete this GRN? Stock reversal will be recorded atomically."))return;setBusy(true);try{await deleteTrade("/api/purchases",id);window.dispatchEvent(new Event(TRADE_DATA_CHANGED_EVENT));if(editing?.id===id)setEditing(null);if(printing?.id===id)setPrinting(null);await refresh();}catch(e){setError(e instanceof Error?e.message:"Purchase could not be deleted.");}finally{setBusy(false);}};
  if(printing)return <div><button type="button" onClick={()=>setPrinting(null)}>Back to Purchase Register</button><GRNPrint purchase={printing}/></div>;
  return <section style={{maxWidth:1500,margin:"0 auto",padding:12}}>
    <h2 style={{color:"#14532d",margin:"0 0 14px"}}>📥 Purchase / GRN Master</h2>
    {error&&<div role="alert" style={{padding:10,marginBottom:12,background:"#fee2e2",color:"#991b1b"}}>{error}<button type="button" onClick={()=>void refresh()}>Retry</button></div>}
    {loading?<p role="status">Loading PostgreSQL purchases…</p>:<>
      <PurchaseForm key={`${purchaseNo}-${editing?.id||"new"}`} purchaseNo={purchaseNo} editingPurchase={editing} onSave={setPending} masterProducts={products} masterSuppliers={suppliers}/>
      <PurchaseTable purchases={purchases} onEdit={setEditing} onDelete={(id)=>void remove(id)} onPrint={setPrinting}/>
    </>}
    <TransactionConfirmModal open={!!pending} type="PURCHASE" mode={editing?"UPDATE":"CREATE"} transaction={pending||{}} onConfirm={()=>void confirm()} onCancel={()=>setPending(null)}/>
    {busy&&<p role="status">Saving transaction atomically…</p>}
  </section>;
}
