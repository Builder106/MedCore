import { Plus, QrCode, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ResponsiveTable, type TableColumn } from '../components/ui/responsive-table';
import { patients as mockPatients } from '../data/mock-data';
import { listPatients, type Patient } from '../services/api';

export function PatientsListPage() {
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listPatients();
        if (!cancelled) setAllPatients(res.patients);
      } catch {
        if (!cancelled) {
          setAllPatients(
            mockPatients.map(p => ({
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              dob: p.dob,
              phone: p.phone,
              nationalId: p.nationalId,
              bloodType: p.bloodType,
              allergies: p.allergies,
              insuranceScheme: p.insuranceScheme,
              createdAt: 0,
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = allPatients.filter(p =>
    `${p.firstName} ${p.lastName} ${p.phone} ${p.nationalId} ${p.id}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const columns: TableColumn<Patient>[] = [
    {
      key: 'patient',
      header: 'Patient',
      cell: p => (
        <Link
          to={`/patients/${p.id}`}
          className="af-focus flex items-center gap-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-[13px] shrink-0">
            {p.firstName[0]}
            {p.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] text-purple-600 hover:underline truncate">
              {p.firstName} {p.lastName}
            </p>
            <p className="text-[11px] text-gray-400">DOB: {p.dob}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'id',
      header: 'ID',
      cell: p => <span className="text-[13px] text-gray-600">{p.nationalId}</span>,
      hideOnMobile: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: p => <span className="text-[13px] text-gray-600">{p.phone}</span>,
    },
    {
      key: 'ins',
      header: 'Insurance',
      cell: p =>
        p.insuranceScheme ? (
          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[12px]">
            {p.insuranceScheme}
          </span>
        ) : (
          <span className="text-gray-400 text-[12px]">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: 'allergies',
      header: 'Allergies',
      cell: p =>
        p.allergies.length ? (
          <div className="flex flex-wrap gap-1">
            {p.allergies.map(a => (
              <span key={a} className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[12px]">
                {a}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-[12px]">None</span>
        ),
    },
  ];

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[22px] text-slate-900">Patients</h1>
        <button className="af-tap af-press af-focus inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-[13px]">
          <Plus className="w-4 h-4" /> Register Patient
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search name, phone, ID…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[14px] min-w-0"
        />
        <button className="af-tap af-press af-focus inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[12px] hover:bg-purple-100 border border-purple-100 shrink-0">
          <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Scan QR</span>
        </button>
      </div>

      <ResponsiveTable
        columns={columns}
        rows={filtered}
        rowKey={p => p.id}
        emptyLabel={loading ? 'Loading patients…' : 'No matching patients'}
        onRowClick={p => navigate(`/patients/${p.id}`)}
        mobileTitle={p => `${p.firstName} ${p.lastName}`}
        mobileSubtitle={p => `${p.phone}${p.insuranceScheme ? ' · ' + p.insuranceScheme : ''}`}
      />
    </div>
  );
}
