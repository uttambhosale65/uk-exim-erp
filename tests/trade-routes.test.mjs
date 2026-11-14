import test from "node:test";
import assert from "node:assert/strict";
import {createTradeRouteHandlers} from "../app/transactions/server/trade-routes.mjs";

const request=(url,method="GET",origin="http://localhost:3000")=>new Request(url,{method,headers:origin?{origin,"content-type":"application/json"}:{"content-type":"application/json"},...(method==="POST"?{body:"{}"}:{})});
test("trade write routes require same-origin requests",async()=>{
  let called=false;const handlers=createTradeRouteHandlers({create:async()=>{called=true;return{id:"x"};}},"sale");
  const response=await handlers.create(request("http://localhost:3000/api/sales","POST","https://attacker.invalid"));
  assert.equal(response.status,403);assert.equal(called,false);assert.equal(response.headers.get("cache-control"),"no-store, private");
});
test("unauthenticated trade requests return JSON 401",async()=>{
  const handlers=createTradeRouteHandlers({list:async()=>{throw Object.assign(new Error("Sign in required."),{code:"UNAUTHENTICATED"});}},"purchase");
  const response=await handlers.list(request("http://localhost:3000/api/purchases"));
  assert.equal(response.status,401);assert.match(response.headers.get("content-type"),/application\/json/);assert.equal((await response.json()).error,"Sign in required.");
});
test("transaction errors preserve conflict status without leaking exceptions",async()=>{
  const handlers=createTradeRouteHandlers({create:async()=>{throw Object.assign(new Error("Insufficient stock"),{code:"INSUFFICIENT_STOCK"});}},"sale");
  const response=await handlers.create(request("http://localhost:3000/api/sales","POST"));
  assert.equal(response.status,409);assert.equal((await response.json()).error,"Insufficient stock");
});
test("unapproved sales tax policy returns an explicit conflict response",async()=>{
  const handlers=createTradeRouteHandlers({create:async()=>{throw Object.assign(new Error("Sales posting is unavailable until tax policy approval."),{code:"TAX_POLICY_UNAPPROVED"});}} ,"sale");
  const response=await handlers.create(request("http://localhost:3000/api/sales","POST"));
  assert.equal(response.status,409);
  assert.match((await response.json()).error,/tax policy approval/);
});
test("pending DEV trade migrations return a clear JSON service-unavailable response",async()=>{
  const handlers=createTradeRouteHandlers({list:async()=>{throw Object.assign(new Error("Purchase, Sales, and Stock are not enabled yet: required local schema migrations are pending."),{code:"SCHEMA_PENDING"});}} ,"purchase");
  const response=await handlers.list(request("http://localhost:3000/api/purchases"));
  assert.equal(response.status,503);assert.match(response.headers.get("content-type"),/application\/json/);
  assert.match((await response.json()).error,/schema migrations are pending/);
});
