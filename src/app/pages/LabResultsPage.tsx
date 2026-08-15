import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ResponsiveTable, type TableColumn } from '../components/ui/responsive-table';
import { useApp } from '../context/AppContext';
import { labResults as mockLabs, patients } from '../data/mock-data';
import { importLabsCsv, listLabs, type LabResult } from '../services/api';

interface LabRow {
  id: string;
  patientId: string;
  date: string;
  testName: string;
  result: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  labName: string;
}

function apiToRow(l: LabResult): LabRow {
  const uiStatus: LabRow['status'] =
    l.status === 'critical' ? 'critical' : l.status === 'normal' ? 'normal' : 'abnormal';
  return {
    id: l.id,
    patientId: l.patientId,
    date: new Date(l.collectedAt).toISOString().slice(0, 10),
    testName: l.testName,
    result: l.unit ? `${l.value} ${l.unit}` : l.value,
    referenceRange: l.referenceRange ?? '—',
    status: uiStatus,
    labName: l.reviewedByDoctor ? 'Reviewed' : 'Pending review',
  };
}

export function LabResultsPage() {
  const { role, currentPatientId } = useApp();
  const [rows, setRows] = useState<LabRow[]>([]);
  const [apiOk, setApiOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    total: number;
    errors: { row: number; reason: string }[];
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentPatientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listLabs(currentPatientId);
        if (cancelled) return;
        setRows(res.labs.map(apiToRow));
        setApiOk(true);
      } catch {
        if (cancelled) return;
        setApiOk(false);
        const mocks = (
          role === 'patient' ? mockLabs.filter(l => l.patientId === currentPatientId) : mockLabs
        ).map(l => ({
          id: l.id,
          patientId: l.patientId,
          date: l.date,
          testName: l.testName,
          result: l.result,
          referenceRange: l.referenceRange,
          status: l.status,
          labName: l.labName,
        }));
        setRows(mocks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPatientId, role, reloadKey]);

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const csv = await file.text();
      const result = await importLabsCsv(csv);
      setImportResult(result);
      if (result.imported > 0) setReloadKey(k => k + 1);
    } catch (err) {
      setImportResult({
        imported: 0,
        total: 0,
        errors: [{ row: 0, reason: (err as Error).message }],
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const statusPill = (status: LabRow['status']) => (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full ${
        status === 'critical'
          ? 'bg-red-100 text-red-700'
          : status === 'abnormal'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700'
      }`}
    >
      {status}
    </span>
  );

  const patientCell = (lab: LabRow) => {
    const patient = patients.find(p => p.id === lab.patientId);
    return (
      <span className="text-purple-600">
        {patient ? `${patient.firstName} ${patient.lastName}` : lab.patientId}
      </span>
    );
  };

  const columns: TableColumn<LabRow>[] = [
    { key: 'date', header: 'Date', cell: l => l.date },
    ...(role !== 'patient'
      ? [{ key: 'patient', header: 'Patient', cell: patientCell } as TableColumn<LabRow>]
      : []),
    { key: 'test', header: 'Test', cell: l => l.testName },
    { key: 'result', header: 'Result', cell: l => l.result },
    { key: 'range', header: 'Reference Range', cell: l => l.referenceRange, hideOnMobile: true },
    { key: 'status', header: 'Status', cell: l => statusPill(l.status) },
    { key: 'lab', header: 'Lab', cell: l => l.labName, hideOnMobile: true },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-[22px]">Lab Results</h1>
        {role !== 'patient' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChosen}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="af-tap af-press af-focus inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors text-[14px]"
            >
              <Upload className="w-4 h-4" /> {importing ? 'Importing…' : 'Import CSV'}
            </button>
          </>
        )}
      </div>
      {importResult && (
        <div
          className={`rounded-lg border px-3 py-2 text-[12px] ${importResult.errors.length === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}
        >
          <div className="flex items-center gap-2 font-medium">
            {importResult.errors.length === 0 ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            Imported {importResult.imported} of {importResult.total} lab results
            {importResult.errors.length > 0 && ` · ${importResult.errors.length} skipped`}
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 ml-6 list-disc space-y-0.5">
              {importResult.errors.slice(0, 5).map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.reason}
                </li>
              ))}
              {importResult.errors.length > 5 && (
                <li>…and {importResult.errors.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}
      {!apiOk && (
        <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          API unreachable — showing legacy demo data.
        </div>
      )}
      <ResponsiveTable
        columns={columns}
        rows={rows}
        rowKey={l => l.id}
        emptyLabel={loading ? 'Loading lab results…' : 'No lab results'}
        mobileTitle={l => l.testName}
        mobileSubtitle={l => `${l.date} · ${l.result}`}
      />
    </div>
  );
}
