import { listClients } from "@/data/clients";
import { ClientForm } from "./client-form";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Clients</h1>
      <ClientForm />
      <table className="text-sm">
        <thead>
          <tr className="text-left">
            <th className="pr-4">Name</th>
            <th className="pr-4">Contact</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td className="pr-4 py-1">{c.name}</td>
              <td className="pr-4 py-1">{c.contactName ?? "—"}</td>
              <td className="py-1">{c.contactEmail ?? "—"}</td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-gray-500">
                No clients yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
