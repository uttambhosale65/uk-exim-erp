import "server-only";

const headers = { "Cache-Control": "no-store, private" };
const json = (body, status = 200) => Response.json(body, { status, headers });
const statusByCode = {
  UNAUTHENTICATED: 401,
  INVALID_SETTLEMENT: 400,
  INVALID_QUERY: 400,
  REFERENCE_NOT_FOUND: 409,
  SETTLEMENT_CONFLICT: 409,
  DUPLICATE_SETTLEMENT: 409,
  SCHEMA_PENDING: 503,
};
function errorResponse(error) {
  const status = statusByCode[error?.code];
  return status ? json({ error: error.message }, status) : json({ error: "The settlement request could not be completed." }, 500);
}
function sameOrigin(request) {
  try { return Boolean(request.headers.get("origin")) && new URL(request.headers.get("origin")).origin === new URL(request.url).origin; }
  catch { return false; }
}
async function body(request) {
  try { return await request.json(); }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_SETTLEMENT" }); }
}

export function createSettlementRouteHandlers(dal, kind) {
  return {
    async list(request) {
      try {
        const url = new URL(request.url);
        if (url.searchParams.get("outstanding") === "1") {
          return json({ invoices: await dal.outstanding(kind, { limit: Number(url.searchParams.get("limit") ?? 200), offset: Number(url.searchParams.get("offset") ?? 0) }) });
        }
        return json({ payments: await dal.list(kind, { q: url.searchParams.get("q") ?? "", limit: Number(url.searchParams.get("limit") ?? 200), offset: Number(url.searchParams.get("offset") ?? 0) }) });
      } catch (error) { return errorResponse(error); }
    },
    async create(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin settlement writes are not allowed." }, 403);
      try { return json({ payment: await dal.create(kind, await body(request)) }, 201); }
      catch (error) { return errorResponse(error); }
    },
    async get(_request, id) {
      try { const payment = await dal.get(kind, id); return payment ? json({ payment }) : json({ error: "Settlement not found." }, 404); }
      catch (error) { return errorResponse(error); }
    },
    async void(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin settlement writes are not allowed." }, 403);
      try { const payment = await dal.voidPayment(kind, id); return payment ? json({ payment }) : json({ error: "Settlement not found or already voided." }, 404); }
      catch (error) { return errorResponse(error); }
    },
  };
}
