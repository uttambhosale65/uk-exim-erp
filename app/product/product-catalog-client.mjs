async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || "Product Catalog request failed.");
  }
  return body;
}

export function createProductCatalogClient(fetcher) {
  if (typeof fetcher !== "function") {
    throw new TypeError("A fetch implementation is required.");
  }

  return {
    async list() {
      const body = await readResponse(await fetcher("/api/products", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      }));
      if (!body || !Array.isArray(body.products)) {
        throw new Error("Product Catalog response is invalid.");
      }
      return body.products;
    },

    async save(product, editing) {
      const endpoint = editing
        ? `/api/products/${encodeURIComponent(product.id)}`
        : "/api/products";
      const body = await readResponse(await fetcher(endpoint, {
        method: editing ? "PATCH" : "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      }));
      if (!body?.product || typeof body.product.id !== "string") {
        throw new Error("Product Catalog response is invalid.");
      }
      return body.product;
    },

    async deactivate(id) {
      const body = await readResponse(await fetcher(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "same-origin",
      }));
      if (!body?.product || typeof body.product.id !== "string") {
        throw new Error("Product Catalog response is invalid.");
      }
      return body.product;
    },
  };
}
