import { Check, Download, Fingerprint, Share2, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { patients } from '../data/mock-data';
import { isLikelyUnreachableForQrScan, resolvePublicOrigin } from '../lib/publicOrigin';
import { exportFhirBundle } from '../services/api';

export function healthIdChartUrl(patientId: string, origin: string) {
  const path = `/patients/${encodeURIComponent(patientId)}?from=health-id`;
  try {
    return new URL(path, origin).href;
  } catch {
    return `${origin}${path}`;
  }
}

export function HealthIdPage() {
  const { currentPatientId } = useApp();
  const patient = patients.find(p => p.id === currentPatientId)!;
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicOrigin = useMemo(
    () =>
      resolvePublicOrigin(
        import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined,
        typeof window !== 'undefined' ? window.location.origin : ''
      ),
    []
  );
  const chartUrl = useMemo(
    () => healthIdChartUrl(patient.id, publicOrigin),
    [patient.id, publicOrigin]
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const json = await exportFhirBundle(patient.id);
      const blob = new Blob([json], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medcore-${patient.id}-fhir.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    await navigator.clipboard.writeText(chartUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const qrWarn = typeof window !== 'undefined' && isLikelyUnreachableForQrScan(publicOrigin);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <h1 className="text-[22px] text-slate-900">Your Health ID</h1>
        <p className="text-[13px] text-slate-400 mt-1">Scannable at any MedCore-enabled facility</p>
        {qrWarn && (
          <p className="text-left mt-3 mx-auto max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            Other phones cannot open localhost or LAN URLs. Open the app via your tunnel URL, or set{' '}
            <code className="font-mono text-[10px]">VITE_PUBLIC_APP_ORIGIN</code> to that URL and
            rebuild—the QR encodes that origin.
          </p>
        )}
        <p className="text-[10px] text-slate-400 mt-2 font-mono break-all max-w-sm mx-auto">
          {chartUrl}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Card top */}
        <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center text-[20px] text-white shrink-0">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-[18px]">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-slate-400 text-[13px] mt-0.5 font-mono">{patient.id}</p>
            </div>
          </div>
          <div className="relative flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
            <Fingerprint className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-[12px] text-slate-400">
              AES-256 encrypted · FHIR R4 compliant
            </span>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="bg-white p-3 rounded-xl border-2 border-slate-100">
            <QRCodeSVG value={chartUrl} size={180} level="H" includeMargin />
          </div>

          <div className="w-full mt-6 space-y-0 divide-y divide-slate-100">
            {[
              ['National ID', patient.nationalId],
              ['Date of Birth', patient.dob],
              ['Blood Type', patient.bloodType],
              ['Phone', patient.phone],
              ['Insurance', patient.insuranceScheme],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[13px] py-2.5">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-800">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] py-2.5">
              <span className="text-slate-400">Allergies</span>
              <span className={patient.allergies.length ? 'text-red-600' : 'text-slate-400'}>
                {patient.allergies.length ? patient.allergies.join(', ') : 'None recorded'}
              </span>
            </div>
          </div>

          <div className="flex gap-3 mt-6 w-full">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60 transition-colors text-[13px]"
            >
              <Download className="w-4 h-4" /> {downloading ? 'Exporting…' : 'FHIR Export'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-[13px]"
            >
              {copied ? (
                <Check className="w-4 h-4 text-teal-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
        <Shield className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] text-teal-800">Your data is protected</p>
          <p className="text-[11px] text-teal-600 mt-0.5">
            Only authorised providers with your consent can access your records. You can revoke
            access at any time from Privacy settings.
          </p>
        </div>
      </div>
    </div>
  );
}
