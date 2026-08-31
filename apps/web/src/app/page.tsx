import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user?.role === "admin") {
    redirect("/admin");
  }

  redirect("/login");
}
