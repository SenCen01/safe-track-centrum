import Link from "next/link";
import { listSites } from "@/data/sites";
import { listClients } from "@/data/clients";
import { SiteForm } from "./site-form";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default async function SitesPage() {
  const [sites, clients] = await Promise.all([listSites(), listClients()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">Sites</h1>
      <SiteForm clients={clients} />
      <Card>
        <CardHeader>
          <h2 className="font-medium text-[--centrum-text]">All sites</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Address</th>
                <th className="px-5 py-2.5 font-medium">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {sites.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <Link href={`/admin/sites/${s.id}`} className="font-medium text-brand hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{s.address}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{s.clientName}</td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No sites yet.
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
