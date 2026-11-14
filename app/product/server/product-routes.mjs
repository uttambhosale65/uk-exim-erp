import "server-only";

const NO_STORE = { "Cache-Control": "no-store, private" };

function json(body, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function responseForError(error) {
  const statusByCode = {
    UNAUTHENTICATED: 401,
    INVALID_PRODUCT: 400,
    INVALID_PRODUCT_ID: 400,
    PRODUCT_CODE_IMMUTABLE: 400,
    PRODUCT_CODE_CONFLICT: 409,
    PRODUCT_CONFLICT: 409,
  };
  if (error?.code === "PRODUCT_NOT_FOUND") return json({ error: "Product not found." }, 404);
  const status = statusByCode[error?.code];
  if (status) return json({ error: error.message }, status);
  return json({ error: "The product request could not be completed." }, 500);
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
    throw Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_PRODUCT" });
  }
}

export function createProductRouteHandlers(productDAL) {
  if (!productDAL) throw new Error("Product route handlers require the Product DAL.");

  return {
    async list() {
      try {
        return json({ products: await productDAL.listProducts() });
      } catch (error) {
        return responseForError(error);
      }
    },

    async create(request) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin product writes are not allowed." }, 403);
      try {
        const product = await productDAL.createProduct(await requestBody(request));
        return json({ product }, 201);
      } catch (error) {
        return responseForError(error);
      }
    },

    async get(request, id) {
      try {
        const product = await productDAL.getProduct(id);
        if (!product) return json({ error: "Product not found." }, 404);
        return json({ product });
      } catch (error) {
        return responseForError(error);
      }
    },

    async update(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin product writes are not allowed." }, 403);
      try {
        const product = await productDAL.updateProduct(id, await requestBody(request));
        if (!product) return json({ error: "Product not found." }, 404);
        return json({ product });
      } catch (error) {
        return responseForError(error);
      }
    },

    async deactivate(request, id) {
      if (!sameOrigin(request)) return json({ error: "Cross-origin product writes are not allowed." }, 403);
      try {
        const product = await productDAL.deactivateProduct(id);
        if (!product) return json({ error: "Product not found." }, 404);
        return json({ product });
      } catch (error) {
        return responseForError(error);
      }
    },
  };
}
