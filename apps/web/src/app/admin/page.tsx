import { Users, Building2, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ModuleCard } from "@/components/ui/Card";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">
          Welcome, {user?.fullName}
        </h1>
        <p className="mt-1 text-sm text-[--centrum-muted]">Manage your guards, clients, and sites.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          href="/admin/users"
          icon={<Users size={20} />}
          label="Users"
          description="Create and manage Guard and Operations Manager accounts."
        />
        <ModuleCard
          href="/admin/clients"
          icon={<Building2 size={20} />}
          label="Clients"
          description="The property owners you provide patrol services for."
        />
        <ModuleCard
          href="/admin/sites"
          icon={<MapPin size={20} />}
          label="Sites"
          description="Routes, checkpoints, Operations Manager coverage, and shifts."
        />
      </div>
    </div>
  );
}
