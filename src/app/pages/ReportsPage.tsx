import { Download, FileText } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dailyStats, facilities } from '../data/mock-data';

export function ReportsPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px]">Reports</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-[14px]">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-[14px]">
            <FileText className="w-4 h-4" /> Generate PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[16px] mb-4">Top Diagnoses — Ministry Report</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats.topDiagnoses} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip trigger="click" wrapperStyle={{ pointerEvents: 'auto' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[16px] mb-4">Facility Summary</h2>
          <div className="space-y-3">
            {facilities.map(f => {
              const occ = Math.round((f.bedsOccupied / f.beds) * 100);
              return (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px]">{f.name}</p>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${occ > 90 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {occ}% occupied
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {f.location} • {f.level}
                  </p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${occ > 90 ? 'bg-red-500' : occ > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${occ}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
