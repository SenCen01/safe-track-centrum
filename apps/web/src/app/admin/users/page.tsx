import { listProfiles } from "@/data/users";
import { UserForm } from "./user-form";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, statusLabel } from "@/components/ui/Badge";

export default async function UsersPage() {
  const profiles = await listProfiles();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">Users</h1>
      <UserForm />
      <Card>
        <CardHeader>
          <h2 className="font-medium text-[--centrum-text]">All users</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium text-[--centrum-text]">{p.fullName}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.role}>{statusLabel(p.role)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{p.phone ?? "—"}</td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
