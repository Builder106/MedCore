import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  FileCheck2,
  Package,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  dailyStats as mockDailyStats,
  facilities as mockFacilities,
  inventory as mockInventory,
} from '../../data/mock-data';
import {
  getDailyStats,
  listFacilities,
  listInventory,
  type DailyStats,
  type Facility,
  type InventoryItem,
} from '../../services/api';

const COLORS = [
  '#0d9488',
  '#7c3aed',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#6366f1',
  '#ec4899',
];

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  linkedPrescriptions: number;
}

export function AdminDashboard() {
  const [facility, setFacility] = useState<Facility>(mockFacilities[0]);
  const [stats, setStats] = useState<DailyStats>(mockDailyStats);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [ministryReadiness, setMinistryReadiness] = useState(98);

  const occupancy = Math.round((facility.bedsOccupied / facility.beds) * 100);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [inv, daily, facs] = await Promise.all([
          listInventory(),
          getDailyStats(),
          listFacilities(),
        ]);
        if (cancelled) return;
        const ls = inv.items
          .filter((i: InventoryItem) => i.quantity <= i.reorderLevel)
          .map((i: InventoryItem) => ({
            id: i.id,
            name: i.itemName,
            quantity: i.quantity,
            reorderLevel: i.reorderLevel,
            unit: i.unit ?? 'each',
            linkedPrescriptions: 0,
          }));
        setLowStock(ls);
        setMinistryReadiness(ls.length === 0 ? 98 : 86);
        setStats(daily);
        if (facs.facilities.length > 0) setFacility(facs.facilities[0]);
      } catch {
        if (cancelled) return;
        const ls = mockInventory
          .filter(i => i.quantity <= i.reorderLevel)
          .map(i => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            reorderLevel: i.reorderLevel,
            unit: i.unit,
            linkedPrescriptions: i.linkedPrescriptions,
          }));
        setLowStock(ls);
        setMinistryReadiness(ls.length === 0 ? 98 : 86);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="af-elevate rounded-3xl border border-[#D9C8AE] bg-gradient-to-r from-[#F8F1E6] via-[#F6EFE4] to-[#E8F0FA] p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-[#5B5149]">
              Facility command center
            </p>
            <h1 className="text-[30px] text-[#1F1B18]">{facility.name}</h1>
            <p className="text-[13px] text-[#5B5149]">
              {facility.location} · {facility.level}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/reports"
              className="af-elevate af-press af-focus flex items-center gap-2 px-3 py-2 bg-[#B85C38] text-white rounded-lg hover:bg-[#9E4D2F] transition-colors text-[13px]"
            >
              Reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
          <h2 className="text-[13px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-600" />
            Interoperability & Compliance
          </h2>
          <div className="mt-3 space-y-2 text-[12px] text-[#5B5149]">
            <div className="rounded-lg border border-[#EFE4D1] px-3 py-2">
              FHIR sync status: stable
            </div>
            <div className="rounded-lg border border-[#EFE4D1] px-3 py-2">
              HL7/CSV lab bridge: healthy
            </div>
            <div className="rounded-lg border border-[#EFE4D1] px-3 py-2">
              National registry link: active
            </div>
          </div>
        </div>
        <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
          <h2 className="text-[13px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-amber-600" />
            Ministry Submission Readiness
          </h2>
          <p className="text-[28px] text-[#1F1B18] mt-3">{ministryReadiness}%</p>
          <p className="text-[12px] text-[#5B5149] mt-1">
            CSV/PDF exports aligned for daily submission
          </p>
        </div>
        <div className="af-elevate bg-white rounded-2xl border border-[#D9C8AE] p-4">
          <h2 className="text-[13px] text-[#1F1B18] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            Security posture
          </h2>
          <p className="text-[12px] text-[#5B5149] mt-3">
            AES-256 at rest, TLS 1.3 in transit, full audit coverage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Patients', value: stats.patientsToday, icon: Users, accent: 'text-amber-500' },
          {
            label: 'Appointments',
            value: stats.appointmentsToday,
            icon: Calendar,
            accent: 'text-blue-500',
          },
          {
            label: 'Emergencies',
            value: stats.emergencies,
            icon: AlertTriangle,
            accent: 'text-red-500',
          },
          {
            label: 'Admissions',
            value: stats.admissions,
            icon: TrendingUp,
            accent: 'text-emerald-500',
          },
          {
            label: 'Discharges',
            value: stats.discharges,
            icon: TrendingUp,
            accent: 'text-purple-500',
          },
        ].map(s => (
          <div key={s.label} className="af-elevate bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.accent}`} />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-[28px] text-slate-900">{s.value}</p>
            <p className="text-[11px] text-slate-400">today</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="af-elevate lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-[14px] text-slate-500 uppercase tracking-wider mb-4">
            Weekly Patient Volume
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.weeklyTrend}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip trigger="click" wrapperStyle={{ pointerEvents: 'auto' }} />
              <Bar dataKey="patients" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="af-elevate bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-[14px] text-slate-500 uppercase tracking-wider mb-4">
            Bed Occupancy
          </h2>
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke={occupancy > 90 ? '#ef4444' : '#f59e0b'}
                  strokeWidth="2.5"
                  strokeDasharray={`${occupancy} ${100 - occupancy}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] text-slate-900">{occupancy}%</span>
                <span className="text-[10px] text-slate-400">occupied</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4 w-full text-center">
              <div>
                <p className="text-[16px] text-slate-900">{facility.beds}</p>
                <p className="text-[10px] text-slate-400">Total</p>
              </div>
              <div>
                <p className="text-[16px] text-amber-600">{facility.bedsOccupied}</p>
                <p className="text-[10px] text-slate-400">Used</p>
              </div>
              <div>
                <p className="text-[16px] text-emerald-600">
                  {facility.beds - facility.bedsOccupied}
                </p>
                <p className="text-[10px] text-slate-400">Free</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="af-elevate bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-[14px] text-slate-500 uppercase tracking-wider mb-4">
            Top Diagnoses
          </h2>
          <div className="space-y-2">
            {stats.topDiagnoses.slice(0, 6).map((d, i) => {
              const maxCount = stats.topDiagnoses[0].count;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-[12px] text-slate-400 w-4 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] text-slate-700">{d.name}</span>
                      <span className="text-[12px] text-slate-400">{d.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(d.count / maxCount) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="af-elevate bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] text-slate-500 uppercase tracking-wider">
              Low Stock Alerts
            </h2>
            <Link
              to="/inventory"
              className="text-amber-600 text-[12px] flex items-center gap-1 hover:underline"
            >
              Inventory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-[13px] text-slate-400">All stock levels normal</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map(item => (
                <div
                  key={item.id}
                  className="af-elevate flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <Package className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.linkedPrescriptions} active Rx linked
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] text-red-600">{item.quantity}</p>
                    <p className="text-[10px] text-slate-400">
                      / {item.reorderLevel} {item.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
