import "server-only";

const NO_STORE = { "Cache-Control": "no-store, private" };

function json(body, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function responseForError(error) {
  const statusByCode = {
    UNAUTHENTICATED: 401,
    INVALID_CUSTOMER: 400,
    INVALID_CUSTOMER_ID: 400,
    INVALID_QUERY: 400,
    CUSTOMER_CODE_CONFLICT: 409,
  };
  const status = statusByCode[error?.code];
  return status ? json({ error: error.message }, status) : json({ error: "The customer request could not be completed." }, 500);
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
    throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_CUSTOMER" });
  }
}

export function createCustomerRouteHandlers(customerDAL) {
  if (!customerDAL) throw new Error("Customer route handlers require the Customer DAL.");

  return {
    async count() {
      try {
        const count = await customerDAL.countCustomers();
        if (!Number.isSafeInteger(count) || count < 0) {
          throw new Error("Customer count query returned an invalid value.");
        }
        return json({ count });
      } catch (error) {
        return responseForError(error);
      }
    },

    async list(request) {
      try {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "";
        const statusValue = url.searchParams.get("status");
        const status = statusValue && statusValue !== "All" ? statusValue : null;
        const limit = Number(url.searchParams.get("limit") ?? 200);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        return json(await customerDAL.listCustomers({ q, status, limit, offset }));
      } catch (error) {
        return responseForError(error);
      }
    },

    async create(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin customer writes are not allowed." }, 403);
      try {
        const customer = await customerDAL.createCustomer(await requestBody(request));
        return json({ customer }, 201);
      } catch (error) {
        return responseForError(error);
      }
    },

    async get(_request, id) {
      try {
        const customer = await customerDAL.getCustomer(id);
        return customer ? json({ customer }) : json({ error: "Customer not found." }, 404);
      } catch (error) {
        return responseForError(error);
      }
    },

    async update(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin customer writes are not allowed." }, 403);
      try {
        const customer = await customerDAL.updateCustomer(id, await requestBody(request));
        return customer ? json({ customer }) : json({ error: "Customer not found." }, 404);
      } catch (error) {
        return responseForError(error);
      }
    },

    async deactivate(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin customer writes are not allowed." }, 403);
      try {
        const customer = await customerDAL.deactivateCustomer(id);
        return customer ? json({ customer }) : json({ error: "Customer not found." }, 404);
      } catch (error) {
        return responseForError(error);
      }
    },

    async reactivate(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin customer writes are not allowed." }, 403);
      try {
        const customer = await customerDAL.reactivateCustomer(id);
        return customer ? json({ customer }) : json({ error: "Customer not found." }, 404);
      } catch (error) {
        return responseForError(error);
      }
    },

    async duplicateCheck(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin customer checks are not allowed." }, 403);
      try {
        const body = await requestBody(request);
        const warnings = await customerDAL.checkDuplicateWarnings(body, body.id ?? null);
        return json({ warnings });
      } catch (error) {
        return responseForError(error);
      }
    },
  };
}
