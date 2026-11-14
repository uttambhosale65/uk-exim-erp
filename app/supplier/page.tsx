import { requireOwnerContext } from "@/app/lib/auth/dal";
import SupplierMaster from "../components/supplier/SupplierMaster";

export const dynamic = "force-dynamic";

export default async function SupplierPage() {
  await requireOwnerContext();
  return <SupplierMaster />;
}
