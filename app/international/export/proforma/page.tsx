import { requireOwnerContext } from "@/app/lib/auth/dal";
import ExportPostgresWorkspace from "../ExportPostgresWorkspace";

export const dynamic = "force-dynamic";

export default async function ExportProformaInvoicePage() {
  await requireOwnerContext();
  return <ExportPostgresWorkspace kind="proforma_invoice" />;
}
