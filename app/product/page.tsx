import { requireOwnerContext } from "@/app/lib/auth/dal";
import ProductPageClient from "./ProductPageClient";
import { ProductCatalogProvider } from "./useProductCatalog";

export const dynamic = "force-dynamic";

export default async function ProductPage() {
  await requireOwnerContext();
  return (
    <ProductCatalogProvider allowEmpty>
      <ProductPageClient />
    </ProductCatalogProvider>
  );
}
