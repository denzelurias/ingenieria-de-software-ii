import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../common/Spinner.jsx';
import ErrorAlert from '../common/ErrorAlert.jsx';
export default function RequireRole({ role, children }) {
  const auth = useAuth(); const location = useLocation();
  if (auth.loading) return <div className="page-loader"><Spinner label="Comprobando tu sesión…" /></div>;
  if (auth.token && auth.error) return <div className="container section-space"><ErrorAlert error={auth.error} onRetry={() => auth.refreshSession()} /></div>;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (auth.user.rol !== role) return <Navigate to={auth.user.rol === 'admin' ? '/admin' : '/panel'} replace />;
  return children ?? <Outlet />;
}
