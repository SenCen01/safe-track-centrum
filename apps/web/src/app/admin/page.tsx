import { getCurrentUser } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="text-lg font-semibold">Welcome, {user?.fullName}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Use the nav above to manage Users, Clients, and Sites.
      </p>
    </div>
  );
}
