import "server-only";

const NO_STORE = { "Cache-Control": "no-store, private" };
const DOC_KINDS = new Set(["enquiry", "quotation", "proforma_invoice", "order", "purchase", "reservation", "packing", "shipment", "commercial_invoice"]);
function json(body, status = 200) { return Response.json(body, { status, headers: NO_STORE }); }
function errorResponse(error) {
  const statuses = { UNAUTHENTICATED: 401, INVALID_EXPORT: 400, INVALID_EXPORT_ID: 400, INVALID_QUERY: 400, EXPORT_REFERENCE_NOT_FOUND: 409, EXPORT_REVIEW_REQUIRED: 409, EXPORT_CUSTOMER_CONFLICT: 409, SCHEMA_PENDING: 503 };
  const status = statuses[error?.code];
  return status ? json({ error: error.message }, status) : json({ error: "The Export request could not be completed." }, 500);
}
function sameOrigin(request) {
  const origin = request.headers.get("origin");
  try { return Boolean(origin) && new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
async function body(request) { try { return await request.json(); } catch { throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_EXPORT" }); } }

export function createExportRouteHandlers(dal) {
  return {
    async list(request, kind) {
      try {
        const url = new URL(request.url);
        if (kind === "customers") return json({ customers: await dal.listCustomers({ q: url.searchParams.get("q") ?? "", limit: Number(url.searchParams.get("limit") ?? 100), offset: Number(url.searchParams.get("offset") ?? 0) }) });
        if (kind === "stock") return json({ stock: await dal.listStock() });
        if (!DOC_KINDS.has(kind)) return json({ error: "Export resource not found." }, 404);
        return json({ documents: await dal.listDocuments(kind, { q: url.searchParams.get("q") ?? "", reviewStatus: url.searchParams.get("reviewStatus") || null, limit: Number(url.searchParams.get("limit") ?? 100), offset: Number(url.searchParams.get("offset") ?? 0) }) });
      } catch (error) { return errorResponse(error); }
    },
    async create(request, kind) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin Export writes are not allowed." }, 403);
      try {
        if (kind === "customers") return json({ customer: await dal.createCustomer(await body(request)) }, 201);
        if (!DOC_KINDS.has(kind)) return json({ error: "Export resource not found." }, 404);
        return json({ document: await dal.createDocument(kind, await body(request)) }, 201);
      } catch (error) { return errorResponse(error); }
    },
    async get(_request, kind, id) {
      try {
        if (kind === "customers") {
          const customer = await dal.getCustomer(id);
          return customer ? json({ customer }) : json({ error: "Export customer not found." }, 404);
        }
        if (!DOC_KINDS.has(kind)) return json({ error: "Export document not found." }, 404);
        const document = await dal.getDocument(kind, id);
        return document ? json({ document }) : json({ error: "Export document not found." }, 404);
      } catch (error) { return errorResponse(error); }
    },
    async update(request, kind, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin Export writes are not allowed." }, 403);
      try {
        if (kind === "customers") {
          const customer = await dal.updateCustomer(id, await body(request));
          return customer ? json({ customer }) : json({ error: "Export customer not found." }, 404);
        }
        if (!DOC_KINDS.has(kind)) return json({ error: "Export document not found." }, 404);
        const document = await dal.updateDocument(kind, id, await body(request));
        return document ? json({ document }) : json({ error: "Export document not found." }, 404);
      } catch (error) { return errorResponse(error); }
    },
    async review(request, kind, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin Export writes are not allowed." }, 403);
      try {
        const input = await body(request);
        const document = await dal.setDocumentReviewStatus(kind, id, input.reviewStatus);
        return document ? json({ document }) : json({ error: "Export document not found." }, 404);
      } catch (error) { return errorResponse(error); }
    },
  };
}
