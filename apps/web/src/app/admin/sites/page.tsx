import Link from "next/link";
import { listSites } from "@/data/sites";
import { listClients } from "@/data/clients";
import { SiteForm } from "./site-form";

export default async function SitesPage() {
  const [sites, clients] = await Promise.all([listSites(), listClients()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Sites</h1>
      <SiteForm clients={clients} />
      <table className="text-sm">
        <thead>
          <tr className="text-left">
            <th className="pr-4">Name</th>
            <th className="pr-4">Address</th>
            <th>Client</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td className="pr-4 py-1">
                <Link href={`/admin/sites/${s.id}`} className="underline">
                  {s.name}
                </Link>
              </td>
              <td className="pr-4 py-1">{s.address}</td>
              <td className="py-1">{s.clientName}</td>
            </tr>
          ))}
          {sites.length === 0 && (
            <tr>
              <td colSpan={3} className="py-2 text-gray-500">
                No sites yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
