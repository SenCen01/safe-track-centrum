import { listProfiles } from "@/data/users";
import { UserForm } from "./user-form";

export default async function UsersPage() {
  const profiles = await listProfiles();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Users</h1>
      <UserForm />
      <table className="text-sm">
        <thead>
          <tr className="text-left">
            <th className="pr-4">Name</th>
            <th className="pr-4">Role</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td className="pr-4 py-1">{p.fullName}</td>
              <td className="pr-4 py-1">{p.role}</td>
              <td className="py-1">{p.phone ?? "—"}</td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-gray-500">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
