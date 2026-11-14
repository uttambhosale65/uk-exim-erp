import { requireOwnerContext } from "@/app/lib/auth/dal";
import PurchasePostgresMaster from "../transactions/client/PurchasePostgresMaster";
import Layout from "../components/ui/Layout";

export const dynamic = "force-dynamic";

export default async function PurchasePage() {
  await requireOwnerContext();
  return <Layout title="UK EXIM ERP"><PurchasePostgresMaster /></Layout>;
}
