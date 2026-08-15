import { Hexagon } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const { t } = useTranslation();
  const { sessionLoading, sessionUser, login } = useApp();
  const location = useLocation();
  const returnTo = (() => {
    const st = location.state as {
      from?: { pathname?: string; search?: string; hash?: string };
    } | null;
    const f = st?.from;
    if (!f?.pathname) return '/';
    return `${f.pathname}${f.search ?? ''}${f.hash ?? ''}`;
  })();

  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<'invalid' | 'locked' | null>(null);
  const [pending, setPending] = useState(false);

  if (!sessionLoading && sessionUser) {
    return <Navigate to={returnTo} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(userId.trim(), pin);
    } catch (err) {
      if (err instanceof Error && err.message === 'locked') setError('locked');
      else setError('invalid');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#F3ECE1] bg-[radial-gradient(circle_at_top,_rgba(195,154,61,0.14),_transparent_45%)]">
      <div className="w-full max-w-sm rounded-2xl border border-[#D9C8AE] bg-[#F9F5ED] p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#214838] text-[#DAB776] p-2 rounded-xl shadow-sm">
            <Hexagon className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#1F1B18]">MedCore</h1>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#5B5149]">
              {t('auth.subtitle')}
            </p>
          </div>
        </div>

        <p className="text-sm text-[#5B5149] mb-5">{t('auth.body')}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-user"
              className="block text-[11px] uppercase tracking-[0.1em] text-[#5B5149] mb-1.5"
            >
              {t('auth.userId')}
            </label>
            <input
              id="login-user"
              name="userId"
              autoComplete="username"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="af-focus w-full rounded-xl border border-[#D9C8AE] bg-white px-3 py-2.5 text-[14px] text-[#1F1B18]"
              placeholder="DOC-001"
              required
            />
          </div>
          <div>
            <label
              htmlFor="login-pin"
              className="block text-[11px] uppercase tracking-[0.1em] text-[#5B5149] mb-1.5"
            >
              {t('auth.pin')}
            </label>
            <input
              id="login-pin"
              name="pin"
              type="password"
              autoComplete="current-password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="af-focus w-full rounded-xl border border-[#D9C8AE] bg-white px-3 py-2.5 text-[14px] text-[#1F1B18]"
              placeholder="••••"
              required
              minLength={4}
            />
          </div>

          {error === 'invalid' && (
            <p className="text-sm text-[#A63D32]" role="alert">
              {t('auth.errorInvalid')}
            </p>
          )}
          {error === 'locked' && (
            <p className="text-sm text-[#A63D32]" role="alert">
              {t('auth.errorLocked')}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="af-tap af-press af-focus w-full rounded-xl bg-[#214838] px-4 py-3 text-[14px] font-medium text-[#F9F5ED] hover:bg-[#183228] disabled:opacity-60"
          >
            {pending ? t('common.loading') : t('auth.submit')}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-[#8A806F] leading-relaxed">{t('auth.demoHint')}</p>
      </div>
    </div>
  );
}
