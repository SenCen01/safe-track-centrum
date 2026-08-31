import { listClients } from "@/data/clients";
import { ClientForm } from "./client-form";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">Clients</h1>
      <ClientForm />
      <Card>
        <CardHeader>
          <h2 className="font-medium text-[--centrum-text]">All clients</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Contact</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 font-medium text-[--centrum-text]">{c.name}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{c.contactName ?? "—"}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{c.contactEmail ?? "—"}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No clients yet.
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
