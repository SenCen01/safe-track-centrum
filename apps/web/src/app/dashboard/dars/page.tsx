import { listDarSummaries } from "@/data/dashboard";
import { Card, CardBody } from "@/components/ui/Card";

export default async function DarsPage() {
  const dars = await listDarSummaries();

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
                <th className="px-5 py-2.5 font-medium">Site</th>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Shifts</th>
                <th className="px-5 py-2.5 font-medium">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {dars.map((d) => (
                <tr key={`${d.siteId}:${d.date}`}>
                  <td className="px-5 py-3 font-medium text-[--centrum-text]">{d.siteName}</td>
                  <td className="px-5 py-3 text-[--centrum-muted]">{d.date}</td>
                  <td className="px-5 py-3 text-[--centrum-text]">{d.shiftCount}</td>
                  <td className="px-5 py-3">
                    <a
                      href={`/api/sites/${d.siteId}/dar?date=${d.date}`}
                      download
                      className="font-medium text-brand hover:underline"
                    >
                      Download PDF
                    </a>
                  </td>
                </tr>
              ))}
              {dars.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-[--centrum-muted]">
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
