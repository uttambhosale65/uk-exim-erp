"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "./components/ProductTypes";
import { setProductCatalogSnapshot } from "./product-catalog-cache.mjs";
import { createProductCatalogClient } from "./product-catalog-client.mjs";

type ProductCatalogValue = {
  products: Product[];
  loading: boolean;
  error: string;
  refresh: () => Promise<Product[]>;
  saveProduct: (product: Product, editing: boolean) => Promise<Product>;
  deactivateProduct: (id: string) => Promise<Product>;
};

const ProductCatalogContext = createContext<ProductCatalogValue | null>(null);

export function ProductCatalogProvider({
  children,
  allowEmpty = false,
}: {
  children: ReactNode;
  allowEmpty?: boolean;
}) {
  const client = useMemo(() => createProductCatalogClient(fetch), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publishProducts = useCallback((next: Product[]) => {
    setProducts(next);
    setProductCatalogSnapshot(next);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await client.list();
      publishProducts(loaded);
      setError("");
      return loaded;
    } catch (requestError) {
      publishProducts([]);
      const message = requestError instanceof Error
        ? requestError.message
        : "Products could not be loaded from PostgreSQL.";
      setError(message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [client, publishProducts]);

  useEffect(() => {
    let active = true;
    client.list()
      .then((loaded) => {
        if (!active) return;
        publishProducts(loaded);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        publishProducts([]);
        setError(requestError instanceof Error
          ? requestError.message
          : "Products could not be loaded from PostgreSQL.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, publishProducts]);

  const saveProduct = useCallback(async (product: Product, editing: boolean) => {
    try {
      const saved = await client.save(product, editing);
      publishProducts(editing
        ? products.map((item) => item.id === saved.id ? saved : item)
        : [...products, saved]);
      setError("");
      return saved;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Product could not be saved.");
      throw requestError;
    }
  }, [client, products, publishProducts]);

  const deactivateProduct = useCallback(async (id: string) => {
    try {
      const saved = await client.deactivate(id);
      publishProducts(products.map((item) => item.id === saved.id ? saved : item));
      setError("");
      return saved;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Product could not be deactivated.");
      throw requestError;
    }
  }, [client, products, publishProducts]);

  const value = useMemo(() => ({
    products,
    loading,
    error,
    refresh,
    saveProduct,
    deactivateProduct,
  }), [products, loading, error, refresh, saveProduct, deactivateProduct]);

  if (loading) {
    return <main className="mx-auto max-w-4xl p-8" role="status">Loading Product Catalog from PostgreSQL…</main>;
  }
  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-8" role="alert">
        <h1 className="text-xl font-semibold">Product Catalog unavailable</h1>
        <p className="mt-2">The PostgreSQL catalog could not be loaded. No LocalStorage fallback was used.</p>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button className="mt-4 rounded border px-4 py-2" onClick={() => { void refresh().catch(() => {}); }}>Retry</button>
      </main>
    );
  }
  if (products.length === 0 && !allowEmpty) {
    return (
      <main className="mx-auto max-w-4xl p-8" role="status">
        <h1 className="text-xl font-semibold">No products in the PostgreSQL catalog</h1>
        <p className="mt-2">No legacy LocalStorage products were loaded. Open Product Master to add a product before using dependent modules.</p>
        <a className="mt-4 inline-block rounded border px-4 py-2" href="/product">Open Product Master</a>
      </main>
    );
  }

  return <ProductCatalogContext.Provider value={value}>{children}</ProductCatalogContext.Provider>;
}

export function useProductCatalog(): ProductCatalogValue {
  const catalog = useContext(ProductCatalogContext);
  if (!catalog) {
    throw new Error("useProductCatalog must be used inside ProductCatalogProvider.");
  }
  return catalog;
}
