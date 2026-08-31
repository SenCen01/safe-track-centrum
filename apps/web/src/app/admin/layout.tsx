import { redirect } from "next/navigation";
import { LayoutDashboard, Users, Building2, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/logout-action";
import { StaffNav } from "@/components/layout/StaffNav";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/users", label: "Users", icon: <Users size={16} /> },
  { href: "/admin/clients", label: "Clients", icon: <Building2 size={16} /> },
  { href: "/admin/sites", label: "Sites", icon: <MapPin size={16} /> },
];

export default async function AdminLayout(props: LayoutProps<"/admin">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    // Not the intended audience for this section (Operations Manager or
    // Guard accounts don't get a web dashboard yet) — send them back to
    // login rather than showing a confusing empty admin shell.
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-alt">
      <StaffNav navItems={NAV_ITEMS} homeHref="/admin" userName={user.fullName} onSignOut={logout} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-20 sm:px-6 lg:pb-6">{props.children}</main>
    </div>
  );
}
