import { redirect } from "next/navigation";
import { LayoutDashboard, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/logout-action";
import { StaffNav } from "@/components/layout/StaffNav";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/dashboard/dars", label: "Daily Reports", icon: <FileText size={16} /> },
];

export default async function DashboardLayout(props: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "operations_manager") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-alt">
      <StaffNav navItems={NAV_ITEMS} homeHref="/dashboard" userName={user.fullName} onSignOut={logout} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-20 sm:px-6 lg:pb-6">{props.children}</main>
    </div>
  );
}
