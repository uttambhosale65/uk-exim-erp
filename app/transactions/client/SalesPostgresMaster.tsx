"use client";

import { useCallback,useEffect,useState } from "react";
import SalesForm from "@/app/components/customer/sales/SalesForm";
import SalesTable from "@/app/components/customer/sales/SalesTable";
import InvoicePrint from "@/app/components/customer/sales/InvoicePrint";
import TransactionConfirmModal from "@/app/components/common/TransactionConfirmModal";
import type { Sales } from "@/app/components/customer/sales/SalesTypes";
import type { Product } from "@/app/product/components/ProductTypes";
import type { Customer } from "@/app/components/customer/CustomerTypes";
import { getNextSalesNo } from "@/app/components/customer/sales/SalesStorage";
import { deleteTrade,loadArray,loadTradeList,saveTrade } from "./trade-api-client";
import { TRADE_DATA_CHANGED_EVENT } from "./trade-events";

export default function SalesPostgresMaster(){
  const [sales,setSales]=useState<Sales[]>([]),[products,setProducts]=useState<Product[]>([]),[customers,setCustomers]=useState<Customer[]>([]);
  const [salesNo,setSalesNo]=useState("SAL-0001"),[editing,setEditing]=useState<Sales|null>(null),[pending,setPending]=useState<Sales|null>(null),[printing,setPrinting]=useState<Sales|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const refresh=useCallback(async()=>{setLoading(true);setError("");try{const [s,p,c]=await Promise.all([loadTradeList<Sales>("/api/sales"),loadArray<Product>("/api/products","products"),loadArray<Customer>("/api/customers","customers")]);setSales(s);setSalesNo(getNextSalesNo(s));setProducts(p);setCustomers(c);}catch(e){setError(e instanceof Error?e.message:"Sales data could not be loaded.");}finally{setLoading(false);}},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void refresh();},0);return()=>window.clearTimeout(timer);},[refresh]);
  const confirm=async()=>{if(!pending)return;setBusy(true);try{await saveTrade("/api/sales",pending,editing?.id);window.dispatchEvent(new Event(TRADE_DATA_CHANGED_EVENT));setPending(null);setEditing(null);await refresh();}catch(e){setError(e instanceof Error?e.message:"Sale could not be saved.");}finally{setBusy(false);}};
  const prepareSale=(sale:Sales)=>{void (async()=>{setError("");try{const response=await fetch("/api/sales/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sale)});const payload=await response.json() as {preview?:Partial<Sales>&{documentType?:string};error?:string};if(!response.ok||!payload.preview)throw new Error(payload.error??"Verified tax preview could not be calculated.");setPending({...sale,...payload.preview,taxDocumentType:payload.preview.documentType});}catch(e){setError(e instanceof Error?e.message:"Verified tax preview could not be calculated.");}})();};
  const remove=async(id:string)=>{if(!window.confirm("Delete this sale? Stock reversal will be recorded atomically."))return;setBusy(true);try{await deleteTrade("/api/sales",id);window.dispatchEvent(new Event(TRADE_DATA_CHANGED_EVENT));if(editing?.id===id)setEditing(null);if(printing?.id===id)setPrinting(null);await refresh();}catch(e){setError(e instanceof Error?e.message:"Sale could not be deleted.");}finally{setBusy(false);}};
  if(printing)return <div><button type="button" onClick={()=>setPrinting(null)}>Back to Sales Register</button><InvoicePrint sale={printing} onClose={()=>setPrinting(null)}/></div>;
  return <section style={{maxWidth:1500,margin:"0 auto",padding:12}}>
    <h2 style={{color:"#14532d",margin:"0 0 14px"}}>📤 Sales / Issue Master</h2>
    {error&&<div role="alert" style={{padding:10,marginBottom:12,background:"#fee2e2",color:"#991b1b"}}>{error}<button type="button" onClick={()=>void refresh()}>Retry</button></div>}
    {loading?<p role="status">Loading PostgreSQL sales…</p>:<>
      <SalesForm key={`${salesNo}-${editing?.id||"new"}`} salesNo={salesNo} editingSale={editing} onSave={prepareSale} onCancelEdit={()=>setEditing(null)} masterCustomers={customers} masterProducts={products} existingSales={sales}/>
      <SalesTable sales={sales} onEdit={setEditing} onDelete={(id)=>void remove(id)} onInvoice={setPrinting}/>
    </>}
    <TransactionConfirmModal open={!!pending} type="SALES" mode={editing?"UPDATE":"CREATE"} transaction={pending||{}} onConfirm={()=>void confirm()} onCancel={()=>setPending(null)}/>
    {busy&&<p role="status">Saving transaction and stock movement atomically…</p>}
  </section>;
}
