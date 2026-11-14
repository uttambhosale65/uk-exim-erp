import { requireOwnerContext } from "@/app/lib/auth/dal";
import CustomerMaster from "../components/customer/CustomerMaster";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  await requireOwnerContext();
  return <CustomerMaster />;
}
