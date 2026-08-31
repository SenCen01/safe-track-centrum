import { listMySites, listMyShifts, listMyIncidents } from "@/data/dashboard";

// No live/Realtime updates in this pass — ADR-0003 covers real-time
// Incident alerts as separate future work, not built here.
export default async function DashboardPage() {
  const [sites, shifts, incidents] = await Promise.all([
    listMySites(),
    listMyShifts(),
    listMyIncidents(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">My Sites</h1>
        <ul className="flex flex-col gap-1 text-sm">
          {sites.map((s) => (
            <li key={s.id}>
              {s.name} — {s.address}
            </li>
          ))}
          {sites.length === 0 && <li className="text-gray-500">No Sites assigned yet.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Shifts</h2>
        <table className="text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-4">Guard</th>
              <th className="pr-4">Site</th>
              <th className="pr-4">Start</th>
              <th className="pr-4">End</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td className="pr-4 py-1">{s.guardName}</td>
                <td className="pr-4 py-1">{s.siteName}</td>
                <td className="pr-4 py-1">{new Date(s.scheduledStart).toLocaleString()}</td>
                <td className="pr-4 py-1">{new Date(s.scheduledEnd).toLocaleString()}</td>
                <td className="py-1">{s.status}</td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-gray-500">
                  No shifts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Incidents</h2>
        <table className="text-sm">
          <thead>
            <tr className="text-left">
              <th className="pr-4">Guard</th>
              <th className="pr-4">Site</th>
              <th className="pr-4">Description</th>
              <th>Occurred</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td className="pr-4 py-1">{i.guardName}</td>
                <td className="pr-4 py-1">{i.siteName}</td>
                <td className="pr-4 py-1">{i.description}</td>
                <td className="py-1">{new Date(i.occurredAt).toLocaleString()}</td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-gray-500">
                  No incidents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
