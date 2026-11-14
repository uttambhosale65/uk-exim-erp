async function json(response: Response) {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof value?.error === "string" ? value.error : "ERP transaction request failed.");
  return value;
}

export async function loadTradeList<T>(path: string): Promise<T[]> {
  const value = await json(await fetch(path, { cache: "no-store", credentials: "same-origin" }));
  if (!Array.isArray(value.transactions)) throw new Error("ERP transaction response was invalid.");
  return value.transactions as T[];
}

export async function saveTrade<T>(path: string, record: T, id?: string): Promise<T> {
  const endpoint = id ? `${path}/${encodeURIComponent(id)}` : path;
  const value = await json(await fetch(endpoint, {
    method: id ? "PUT" : "POST", cache: "no-store", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(record),
  }));
  if (!value.transaction || typeof value.transaction.id !== "string") throw new Error("ERP transaction response was invalid.");
  return value.transaction as T;
}

export async function deleteTrade(path: string, id: string): Promise<void> {
  await json(await fetch(`${path}/${encodeURIComponent(id)}`, { method: "DELETE", cache: "no-store", credentials: "same-origin" }));
}

export async function loadArray<T>(path: string, key: string): Promise<T[]> {
  const value = await json(await fetch(path, { cache: "no-store", credentials: "same-origin" }));
  if (!Array.isArray(value[key])) throw new Error("ERP master data response was invalid.");
  return value[key] as T[];
}
