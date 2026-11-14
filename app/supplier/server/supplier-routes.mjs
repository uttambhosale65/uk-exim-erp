import "server-only";

const NO_STORE = { "Cache-Control": "no-store, private" };

function json(body, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function errorResponse(error) {
  const status = {
    UNAUTHENTICATED: 401,
    INVALID_SUPPLIER: 400,
    INVALID_SUPPLIER_ID: 400,
    INVALID_QUERY: 400,
    SUPPLIER_CODE_CONFLICT: 409,
  }[error?.code];
  return status ? json({ error: error.message }, status) : json({ error: "The supplier request could not be completed." }, 500);
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_SUPPLIER" });
  }
}

export function createSupplierRouteHandlers(supplierDAL) {
  if (!supplierDAL) throw new Error("Supplier route handlers require the Supplier DAL.");
  return {
    async list(request) {
      try {
        const url = new URL(request.url);
        const statusValue = url.searchParams.get("status");
        return json(await supplierDAL.listSuppliers({
          q: url.searchParams.get("q") ?? "",
          status: statusValue && statusValue !== "All" ? statusValue : null,
          limit: Number(url.searchParams.get("limit") ?? 200),
          offset: Number(url.searchParams.get("offset") ?? 0),
        }));
      } catch (error) {
        return errorResponse(error);
      }
    },
    async create(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin supplier writes are not allowed." }, 403);
      try {
        return json({ supplier: await supplierDAL.createSupplier(await requestBody(request)) }, 201);
      } catch (error) {
        return errorResponse(error);
      }
    },
    async get(_request, id) {
      try {
        const supplier = await supplierDAL.getSupplier(id);
        return supplier ? json({ supplier }) : json({ error: "Supplier not found." }, 404);
      } catch (error) {
        return errorResponse(error);
      }
    },
    async update(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin supplier writes are not allowed." }, 403);
      try {
        const supplier = await supplierDAL.updateSupplier(id, await requestBody(request));
        return supplier ? json({ supplier }) : json({ error: "Supplier not found." }, 404);
      } catch (error) {
        return errorResponse(error);
      }
    },
    async setStatus(request, id, status) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin supplier writes are not allowed." }, 403);
      try {
        const supplier = await supplierDAL.setSupplierStatus(id, status);
        return supplier ? json({ supplier }) : json({ error: "Supplier not found." }, 404);
      } catch (error) {
        return errorResponse(error);
      }
    },
    async duplicateCheck(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin supplier checks are not allowed." }, 403);
      try {
        const body = await requestBody(request);
        return json({ warnings: await supplierDAL.checkDuplicateWarnings(body, body.id ?? null) });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
