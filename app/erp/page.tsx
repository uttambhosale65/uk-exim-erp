import ERPWorkspace from "@/app/ERPWorkspace";
import { requireOwnerContext } from "@/app/lib/auth/dal";
import { ProductCatalogProvider } from "@/app/product/useProductCatalog";

export const dynamic = "force-dynamic";

export default async function ERPWorkspacePage() {
  await requireOwnerContext();
  return (
    <ProductCatalogProvider allowEmpty>
      <ERPWorkspace />
    </ProductCatalogProvider>
  );
}
