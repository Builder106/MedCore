import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveTable, type TableColumn } from '../components/ui/responsive-table';
import { useApp } from '../context/AppContext';
import { auditLog, consentRecords } from '../data/mock-data';

type AuditRow = (typeof auditLog)[number];

export function ConsentPage() {
  const { currentPatientId } = useApp();
  const [consents, setConsents] = useState(
    consentRecords.filter(c => c.patientId === currentPatientId)
  );
  const audits = auditLog.filter(a => a.patientId === currentPatientId);

  const toggleConsent = (id: string) => {
    setConsents(prev => prev.map(c => (c.id === id ? { ...c, granted: !c.granted } : c)));
  };

  const auditColumns: TableColumn<AuditRow>[] = [
    {
      key: 'when',
      header: 'When',
      cell: a => (
        <span className="text-[12px] text-gray-500 whitespace-nowrap">
          {new Date(a.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'who',
      header: 'Who',
      cell: a => (
        <span>
          {a.accessedBy}
          <br />
          <span className="text-[11px] text-gray-400">{a.role}</span>
        </span>
      ),
    },
    { key: 'action', header: 'Action', cell: a => a.action },
    {
      key: 'section',
      header: 'Section',
      cell: a => (
        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[12px]">{a.section}</span>
      ),
    },
    { key: 'facility', header: 'Facility', cell: a => a.facility, hideOnMobile: true },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[22px] text-slate-900">Consent & Privacy</h1>
        <p className="text-[13px] text-slate-400 mt-1">
          Control who can access your health records. Grant or revoke access per provider at any
          time.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-[16px]">Provider Access</h2>
        {consents.map(c => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-start sm:items-center gap-4 flex-wrap sm:flex-nowrap"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.granted ? 'bg-green-100' : 'bg-red-100'}`}
            >
              {c.granted ? (
                <ShieldCheck className="w-5 h-5 text-green-600" />
              ) : (
                <ShieldOff className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px]">{c.providerName}</p>
              <p className="text-[12px] text-gray-500">{c.facilityName}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {c.sections.map(s => (
                  <span
                    key={s}
                    className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => toggleConsent(c.id)}
              className={`af-tap af-press af-focus px-4 py-2 rounded-lg text-[13px] transition-colors w-full sm:w-auto ${c.granted ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            >
              {c.granted ? 'Revoke' : 'Grant'}
            </button>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-[16px] mb-3">Who accessed your records</h2>
        <ResponsiveTable
          columns={auditColumns}
          rows={audits}
          rowKey={a => a.id}
          emptyLabel="No access yet"
          mobileTitle={a => `${a.action} · ${a.section}`}
          mobileSubtitle={a => `${a.accessedBy} — ${new Date(a.timestamp).toLocaleString()}`}
        />
      </div>
    </div>
  );
}
