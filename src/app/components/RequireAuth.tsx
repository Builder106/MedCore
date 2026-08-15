import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';

export function RequireAuth() {
  const { sessionLoading, sessionUser } = useApp();
  const { t } = useTranslation();
  const location = useLocation();

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3ECE1] text-[#5B5149]">
        <p className="text-sm">{t('auth.checkingSession')}</p>
      </div>
    );
  }

  if (!sessionUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
