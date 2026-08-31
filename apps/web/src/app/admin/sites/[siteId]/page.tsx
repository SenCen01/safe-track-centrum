import { notFound } from "next/navigation";
import { QrCode, UserCog, Clock, X } from "lucide-react";
import { getSiteById } from "@/data/sites";
import { getRouteBySiteId, listCheckpoints } from "@/data/checkpoints";
import { listOperationsManagersForSite, listAllOperationsManagers } from "@/data/operations-managers";
import { listShiftsForSite, listAllGuards } from "@/data/shifts";
import { CheckpointForm } from "./checkpoint-form";
import { AssignOmForm } from "./assign-om-form";
import { ShiftForm } from "./shift-form";
import { unassignOperationsManagerAction } from "./actions";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, statusLabel } from "@/components/ui/Badge";

export default async function SiteDetailPage(props: PageProps<"/admin/sites/[siteId]">) {
  const { siteId } = await props.params;

  const site = await getSiteById(siteId);
  if (!site) notFound();

  const route = await getRouteBySiteId(siteId);

  const [checkpoints, assignedOms, allOms, shifts, guards] = await Promise.all([
    route ? listCheckpoints(route.id) : Promise.resolve([]),
    listOperationsManagersForSite(siteId),
    listAllOperationsManagers(),
    listShiftsForSite(siteId),
    listAllGuards(),
  ]);

  const assignedOmIds = new Set(assignedOms.map((om) => om.id));
  const availableOms = allOms.filter((om) => !assignedOmIds.has(om.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">
          {site.name}
        </h1>
        <p className="mt-1 text-sm text-[--centrum-muted]">
          {site.address} — {site.clientName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <QrCode size={16} className="text-brand" />
            Checkpoints
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          {route ? (
            <>
              <CheckpointForm siteId={siteId} routeId={route.id} />
              <div className="overflow-hidden rounded-xl border border-black/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-surface-alt text-left text-[--centrum-muted]">
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">QR code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {checkpoints.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-[--centrum-muted]">{c.sequenceNumber}</td>
                        <td className="px-4 py-2 font-medium text-[--centrum-text]">{c.name}</td>
                        <td className="px-4 py-2">
                          <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs">{c.qrCode}</code>
                        </td>
                      </tr>
                    ))}
                    {checkpoints.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-[--centrum-muted]">
                          No checkpoints yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600">
              This Site has no Route — checkpoints can&apos;t be added until one exists.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <UserCog size={16} className="text-brand" />
            Operations Managers
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {assignedOms.map((om) => (
              <li
                key={om.id}
                className="flex items-center justify-between rounded-lg border border-black/5 bg-surface-alt px-3 py-2 text-sm"
              >
                <span className="font-medium text-[--centrum-text]">{om.fullName}</span>
                <form action={unassignOperationsManagerAction}>
                  <input type="hidden" name="siteId" value={siteId} />
                  <input type="hidden" name="operationsManagerId" value={om.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 text-xs font-medium text-[--centrum-muted] hover:text-red-600"
                  >
                    <X size={12} />
                    Unassign
                  </button>
                </form>
              </li>
            ))}
            {assignedOms.length === 0 && (
              <li className="text-sm text-[--centrum-muted]">No Operations Managers assigned yet.</li>
            )}
          </ul>
          <AssignOmForm siteId={siteId} operationsManagers={availableOms} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <Clock size={16} className="text-brand" />
            Shifts
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <ShiftForm siteId={siteId} guards={guards} />
          <div className="overflow-hidden rounded-xl border border-black/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-surface-alt text-left text-[--centrum-muted]">
                  <th className="px-4 py-2 font-medium">Guard</th>
                  <th className="px-4 py-2 font-medium">Start</th>
                  <th className="px-4 py-2 font-medium">End</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium text-[--centrum-text]">{s.guardName}</td>
                    <td className="px-4 py-2 text-[--centrum-muted]">{new Date(s.scheduledStart).toLocaleString()}</td>
                    <td className="px-4 py-2 text-[--centrum-muted]">{new Date(s.scheduledEnd).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <Badge variant={s.status}>{statusLabel(s.status)}</Badge>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-[--centrum-muted]">
                      No shifts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
