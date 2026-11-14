let snapshot = [];

export function getProductCatalogSnapshot() {
  return snapshot.map((product) => ({ ...product }));
}

export function setProductCatalogSnapshot(products) {
  if (!Array.isArray(products)) {
    throw new TypeError("Product Catalog snapshot must be an array.");
  }
  snapshot = products.map((product) => ({ ...product }));
}
