import { redirect } from "next/navigation";
import { getOwnerContext } from "@/app/lib/auth/dal";

export default async function HomePage() {
  const owner = await getOwnerContext();
  if (!owner) redirect("/login");
  redirect("/dashboard");
}
