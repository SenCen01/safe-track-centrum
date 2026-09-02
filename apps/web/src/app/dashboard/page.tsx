import { MapPin, Clock, AlertTriangle, Footprints } from "lucide-react";
import {
  listMySites,
  listMyShifts,
  listMyIncidents,
  listIncidentPhotoUrls,
  listLivePatrols,
  listCheckpointScansForPatrols,
  listCheckpointPhotoUrls,
} from "@/data/dashboard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge, statusLabel } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/format";

// No live/Realtime updates in this pass — ADR-0003 covers real-time
// Incident alerts as separate future work, not built here.
export default async function DashboardPage() {
  const [sites, livePatrols, shifts, incidents] = await Promise.all([
    listMySites(),
    listLivePatrols(),
    listMyShifts(),
    listMyIncidents(),
  ]);

  const photoUrlsByIncident = await listIncidentPhotoUrls(incidents.map((i) => i.id));

  const checkpointScans = await listCheckpointScansForPatrols(livePatrols.map((p) => p.patrolId));
  const checkpointPhotoUrls = await listCheckpointPhotoUrls(
    checkpointScans.filter((s) => s.photoStoragePath).map((s) => s.id),
  );
  const checkpointScansByPatrol = new Map<string, typeof checkpointScans>();
  for (const scan of checkpointScans) {
    const list = checkpointScansByPatrol.get(scan.patrolId) ?? [];
    list.push(scan);
    checkpointScansByPatrol.set(scan.patrolId, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">
        Overview
      </h1>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <MapPin size={16} className="text-brand" />
            My Sites
          </h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <div key={s.id} className="rounded-xl border border-black/5 bg-surface-alt p-3">
                <p className="font-medium text-[--centrum-text]">{s.name}</p>
                <p className="text-sm text-[--centrum-muted]">{s.address}</p>
              </div>
            ))}
            {sites.length === 0 && <p className="text-sm text-[--centrum-muted]">No Sites assigned yet.</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <Footprints size={16} className="text-brand" />
            Live Patrols
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-surface-alt text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Guard</th>
                <th className="px-5 py-2.5 font-medium">Site</th>
                <th className="px-5 py-2.5 font-medium">Patrol</th>
                <th className="px-5 py-2.5 font-medium">Checkpoints</th>
                <th className="px-5 py-2.5 font-medium">Last Checkpoint</th>
                <th className="px-5 py-2.5 font-medium">Next Checkpoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {livePatrols.map((p) => {
                const scans = checkpointScansByPatrol.get(p.patrolId) ?? [];
                return (
                  <tr key={p.patrolId}>
                    <td colSpan={6} className="p-0">
                      <details>
                        <summary className="grid cursor-pointer list-none grid-cols-6 px-5 py-3 [&::-webkit-details-marker]:hidden">
                          <span className="font-medium text-[--centrum-text]">{p.guardName}</span>
                          <span className="text-[--centrum-muted]">{p.siteName}</span>
                          <span className="text-[--centrum-muted]">Patrol {p.patrolNumberInShift}</span>
                          <span className="text-[--centrum-text]">
                            {p.checkpointsDone}/{p.checkpointsTotal}
                          </span>
                          <span className="text-[--centrum-muted]">
                            {p.lastCheckpointName ? (
                              <>
                                {p.lastCheckpointName}
                                {p.lastScannedAt && <> · {timeAgo(p.lastScannedAt)}</>}
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                          <span className="text-[--centrum-muted]">{p.nextCheckpointName ?? "—"}</span>
                        </summary>
                        <div className="border-t border-black/5 bg-surface-alt px-5 py-3">
                          {scans.length === 0 ? (
                            <p className="text-sm text-[--centrum-muted]">No checkpoints scanned yet.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-[--centrum-muted]">
                                  <th className="py-1 font-medium">#</th>
                                  <th className="py-1 font-medium">Checkpoint</th>
                                  <th className="py-1 font-medium">Scanned</th>
                                  <th className="py-1 font-medium">Photo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {scans.map((s) => (
                                  <tr key={s.id}>
                                    <td className="py-1 text-[--centrum-muted]">{s.sequenceNumber}</td>
                                    <td className="py-1 text-[--centrum-text]">{s.checkpointName}</td>
                                    <td className="py-1 text-[--centrum-muted]">{new Date(s.scannedAt).toLocaleTimeString()}</td>
                                    <td className="py-1">
                                      {checkpointPhotoUrls[s.id] ? (
                                        <a
                                          href={checkpointPhotoUrls[s.id]}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-block overflow-hidden rounded-lg border border-black/10 shadow-sm transition-transform hover:scale-105"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket, thumbnail only */}
                                          <img src={checkpointPhotoUrls[s.id]} alt="Checkpoint evidence" className="h-10 w-10 object-cover" />
                                        </a>
                                      ) : (
                                        <span className="text-[--centrum-muted]">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
              {livePatrols.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No patrols in progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <Clock size={16} className="text-brand" />
            Shifts
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-surface-alt text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Guard</th>
                <th className="px-5 py-2.5 font-medium">Site</th>
                <th className="px-5 py-2.5 font-medium">Start</th>
                <th className="px-5 py-2.5 font-medium">End</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium text-[--centrum-text]">{s.guardName}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{s.siteName}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{new Date(s.scheduledStart).toLocaleString()}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{new Date(s.scheduledEnd).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <Badge variant={s.status}>{statusLabel(s.status)}</Badge>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No shifts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-medium text-[--centrum-text]">
            <AlertTriangle size={16} className="text-brand" />
            Incidents
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-surface-alt text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Guard</th>
                <th className="px-5 py-2.5 font-medium">Site</th>
                <th className="px-5 py-2.5 font-medium">Description</th>
                <th className="px-5 py-2.5 font-medium">Occurred</th>
                <th className="px-5 py-2.5 font-medium">Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {incidents.map((i) => {
                const photoUrls = photoUrlsByIncident[i.id] ?? [];
                return (
                  <tr key={i.id}>
                    <td className="px-5 py-3 font-medium text-[--centrum-text]">{i.guardName}</td>
                    <td className="px-5 py-3 text-[--centrum-muted]">{i.siteName}</td>
                    <td className="px-5 py-3 text-[--centrum-muted]">{i.description}</td>
                    <td className="px-5 py-3 text-[--centrum-muted]">{new Date(i.occurredAt).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {photoUrls.length === 0 ? (
                        <span className="text-[--centrum-muted]">—</span>
                      ) : (
                        <div className="flex gap-1.5">
                          {photoUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-lg border border-black/10 shadow-sm transition-transform hover:scale-105"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from a private bucket, not worth next/image remote-pattern config for a thumbnail-sized dashboard gallery */}
                              <img src={url} alt="Incident evidence" className="h-12 w-12 object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No incidents yet.
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
