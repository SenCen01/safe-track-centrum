import { listMyDars, listMyShifts } from "@/data/dashboard";
import { Card, CardBody } from "@/components/ui/Card";

export default async function DarsPage() {
  const [dars, shifts] = await Promise.all([listMyDars(), listMyShifts()]);
  const shiftById = new Map(shifts.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">
        Daily Activity Reports
      </h1>
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-surface-alt text-left text-[--centrum-muted]">
                <th className="px-5 py-2.5 font-medium">Guard</th>
                <th className="px-5 py-2.5 font-medium">Site</th>
                <th className="px-5 py-2.5 font-medium">Shift</th>
                <th className="px-5 py-2.5 font-medium">Patrols</th>
                <th className="px-5 py-2.5 font-medium">Incomplete</th>
                <th className="px-5 py-2.5 font-medium">Incidents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {dars.map((d) => {
                const shift = shiftById.get(d.shiftId);
                return (
                  <tr key={d.shiftId}>
                    <td className="px-5 py-3 font-medium text-[--centrum-text]">{shift?.guardName ?? "—"}</td>
                    <td className="px-5 py-3 text-[--centrum-muted]">{shift?.siteName ?? "—"}</td>
                    <td className="px-5 py-3 text-[--centrum-muted]">
                      {shift ? new Date(shift.scheduledStart).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-[--centrum-text]">{d.patrolCount}</td>
                    <td className="px-5 py-3 text-[--centrum-text]">{d.incompletePatrolCount}</td>
                    <td className="px-5 py-3 text-[--centrum-text]">{d.incidentCount}</td>
                  </tr>
                );
              })}
              {dars.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-[--centrum-muted]">
                    No reports yet.
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
