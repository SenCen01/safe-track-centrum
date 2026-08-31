import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/logout-action";

export default async function DashboardLayout(props: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "operations_manager") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/dashboard">Overview</Link>
          <Link href="/dashboard/dars">Daily Activity Reports</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span>{user.fullName}</span>
          <form action={logout}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{props.children}</main>
    </div>
  );
}
