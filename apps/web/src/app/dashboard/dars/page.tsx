import { listMyDars, listMyShifts } from "@/data/dashboard";

export default async function DarsPage() {
  const [dars, shifts] = await Promise.all([listMyDars(), listMyShifts()]);
  const shiftById = new Map(shifts.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Daily Activity Reports</h1>
      <table className="text-sm">
        <thead>
          <tr className="text-left">
            <th className="pr-4">Guard</th>
            <th className="pr-4">Site</th>
            <th className="pr-4">Shift</th>
            <th className="pr-4">Patrols</th>
            <th className="pr-4">Incomplete</th>
            <th>Incidents</th>
          </tr>
        </thead>
        <tbody>
          {dars.map((d) => {
            const shift = shiftById.get(d.shiftId);
            return (
              <tr key={d.shiftId}>
                <td className="pr-4 py-1">{shift?.guardName ?? "—"}</td>
                <td className="pr-4 py-1">{shift?.siteName ?? "—"}</td>
                <td className="pr-4 py-1">
                  {shift ? new Date(shift.scheduledStart).toLocaleDateString() : "—"}
                </td>
                <td className="pr-4 py-1">{d.patrolCount}</td>
                <td className="pr-4 py-1">{d.incompletePatrolCount}</td>
                <td className="py-1">{d.incidentCount}</td>
              </tr>
            );
          })}
          {dars.length === 0 && (
            <tr>
              <td colSpan={6} className="py-2 text-gray-500">
                No reports yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
