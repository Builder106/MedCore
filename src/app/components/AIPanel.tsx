import { AlertTriangle, Bot, FileText, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { aiRiskFlags, aiSummarize, type AiRiskFlag } from '../services/api';

export function AIPanel() {
  const { currentPatientId } = useApp();
  const [summary, setSummary] = useState<string>('');
  const [flags, setFlags] = useState<AiRiskFlag[]>([]);
  const [provider, setProvider] = useState<'openrouter' | 'mock' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPatientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [s, r] = await Promise.all([
          aiSummarize(currentPatientId),
          aiRiskFlags(currentPatientId),
        ]);
        if (cancelled) return;
        setSummary(s.summary);
        setFlags(Array.isArray(r.flags) ? r.flags : []);
        setProvider(s.provider);
      } catch {
        if (cancelled) return;
        setError('AI unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPatientId]);

  const topFlag = flags[0];

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-5 lg:sticky lg:top-0 lg:h-[calc(100vh-12rem)] overflow-y-auto scrollbar-hide pb-4">
      <div className="bg-gradient-to-b from-[#FDF8EE] to-[#FFFBEB] rounded-[2rem] p-6 shadow-[0_8px_30px_-15px_rgba(217,119,6,0.3)] border-2 border-amber-200/60 relative overflow-hidden flex flex-col min-h-0 flex-shrink-0">
        <div className="absolute top-0 right-0 p-6 opacity-5 mix-blend-multiply pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Bot size={140} />
        </div>

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 text-white relative">
              <Bot size={22} className="drop-shadow-md" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-200"></span>
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900 tracking-tight">Claude Assist</h2>
              <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                <Sparkles size={10} />{' '}
                {loading
                  ? 'Analyzing chart…'
                  : provider === 'openrouter'
                    ? 'OpenRouter (auto)'
                    : 'Demo mode'}
              </p>
            </div>
          </div>
        </div>

        {topFlag && !loading && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-amber-200 shadow-sm relative z-10 mb-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle
                size={18}
                className={`mt-0.5 shrink-0 ${topFlag.severity === 'high' ? 'text-red-600' : topFlag.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'}`}
              />
              <div>
                <h3 className="font-bold text-amber-900 text-sm leading-tight">
                  {topFlag.category.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs font-semibold text-amber-700/70 uppercase tracking-widest mt-1">
                  {topFlag.severity} severity
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-amber-800/90 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100">
              {topFlag.message}
            </p>
            {topFlag.action && (
              <p className="mt-2 text-xs font-semibold text-amber-900">Action: {topFlag.action}</p>
            )}
          </div>
        )}

        <div className="space-y-3 relative z-10 flex-1 overflow-y-auto scrollbar-hide pr-1">
          <h4 className="text-[11px] font-bold text-amber-700/70 uppercase tracking-widest px-1 flex items-center gap-2">
            <FileText size={12} /> Pre-visit summary
          </h4>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-amber-800/70 px-1">
              <Loader2 size={14} className="animate-spin" /> Generating summary…
            </div>
          )}

          {!loading && error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {!loading && !error && summary && (
            <div className="bg-white/60 p-3 rounded-xl border border-amber-200/50 shadow-sm">
              <p className="text-xs whitespace-pre-wrap leading-relaxed text-amber-900">
                {summary}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0F2221] rounded-[1.5rem] p-5 text-teal-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-[#1B3634] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-white">AI Status</h3>
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${provider === 'openrouter' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${provider === 'openrouter' ? 'bg-emerald-400' : 'bg-amber-300'}`}
            ></span>
            <span className="text-[10px] font-bold tracking-widest uppercase">
              {provider === 'openrouter' ? 'OpenRouter live' : 'Demo fallback'}
            </span>
          </div>
        </div>
        <p className="text-xs font-medium text-teal-100/60 leading-relaxed">
          {provider === 'openrouter'
            ? 'Connected via OpenRouter auto-routing (free tier).'
            : 'Set OPENROUTER_API_KEY on the server to enable live AI.'}
        </p>
      </div>
    </aside>
  );
}
