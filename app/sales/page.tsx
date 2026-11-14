import { requireOwnerContext } from "@/app/lib/auth/dal";
import SalesPostgresMaster from "../transactions/client/SalesPostgresMaster";
import Layout from "../components/ui/Layout";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  await requireOwnerContext();
  return <Layout title="UK EXIM ERP"><SalesPostgresMaster /></Layout>;
}
