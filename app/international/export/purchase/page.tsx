import { requireOwnerContext } from "@/app/lib/auth/dal";
import ExportPostgresWorkspace from "../ExportPostgresWorkspace";

export const dynamic = "force-dynamic";

export default async function ExportPurchasePage() {
  await requireOwnerContext();
  return <ExportPostgresWorkspace kind="purchase" />;
}
