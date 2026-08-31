import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/logout-action";

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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex gap-4 text-sm font-medium">
          <a href="/admin">Dashboard</a>
          <a href="/admin/users">Users</a>
          <a href="/admin/clients">Clients</a>
          <a href="/admin/sites">Sites</a>
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
