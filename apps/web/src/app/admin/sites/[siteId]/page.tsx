import { notFound } from "next/navigation";
import { getSiteById } from "@/data/sites";
import { getRouteBySiteId, listCheckpoints } from "@/data/checkpoints";
import { listOperationsManagersForSite, listAllOperationsManagers } from "@/data/operations-managers";
import { CheckpointForm } from "./checkpoint-form";
import { AssignOmForm } from "./assign-om-form";
import { unassignOperationsManagerAction } from "./actions";

export default async function SiteDetailPage(props: PageProps<"/admin/sites/[siteId]">) {
  const { siteId } = await props.params;

  const site = await getSiteById(siteId);
  if (!site) notFound();

  const route = await getRouteBySiteId(siteId);

  const [checkpoints, assignedOms, allOms] = await Promise.all([
    route ? listCheckpoints(route.id) : Promise.resolve([]),
    listOperationsManagersForSite(siteId),
    listAllOperationsManagers(),
  ]);

  const assignedOmIds = new Set(assignedOms.map((om) => om.id));
  const availableOms = allOms.filter((om) => !assignedOmIds.has(om.id));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-semibold">{site.name}</h1>
        <p className="text-sm text-gray-600">
          {site.address} — {site.clientName}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Checkpoints</h2>
        {route ? (
          <>
            <CheckpointForm siteId={siteId} routeId={route.id} />
            <table className="text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pr-4">#</th>
                  <th className="pr-4">Name</th>
                  <th>QR code</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((c) => (
                  <tr key={c.id}>
                    <td className="pr-4 py-1">{c.sequenceNumber}</td>
                    <td className="pr-4 py-1">{c.name}</td>
                    <td className="py-1">{c.qrCode}</td>
                  </tr>
                ))}
                {checkpoints.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-gray-500">
                      No checkpoints yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-sm text-red-600">
            This Site has no Route — checkpoints can&apos;t be added until one exists.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Operations Managers</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {assignedOms.map((om) => (
            <li key={om.id} className="flex items-center gap-3">
              {om.fullName}
              <form action={unassignOperationsManagerAction}>
                <input type="hidden" name="siteId" value={siteId} />
                <input type="hidden" name="operationsManagerId" value={om.id} />
                <button type="submit" className="text-xs underline">
                  Unassign
                </button>
              </form>
            </li>
          ))}
          {assignedOms.length === 0 && <li className="text-gray-500">No Operations Managers assigned yet.</li>}
        </ul>
        <AssignOmForm siteId={siteId} operationsManagers={availableOms} />
      </section>
    </div>
  );
}
