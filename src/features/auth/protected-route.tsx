import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

/** UI guard only. Real authorization must be enforced by the backend. */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
