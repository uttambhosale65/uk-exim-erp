import { requireOwnerContext } from "@/app/lib/auth/dal";
import StockPostgresMaster from "../transactions/client/StockPostgresMaster";
import Layout from "../components/ui/Layout";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  await requireOwnerContext();
  return <Layout title="UK EXIM ERP"><StockPostgresMaster /></Layout>;
}
