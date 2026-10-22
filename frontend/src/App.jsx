import { useEffect } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router';
import { Sprout } from 'lucide-react';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Footer from './components/layout/Footer.jsx';
import EntrepreneurLayout from './components/layout/EntrepreneurLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import RequireRole from './components/routing/RequireRole.jsx';
import EmptyState from './components/common/EmptyState.jsx';
import { ADMIN_LINKS, ENTREPRENEUR_LINKS } from './utils/constants.js';
import ExplorePage from './pages/public/ExplorePage.jsx';
import BusinessDetailPage from './pages/public/BusinessDetailPage.jsx';
import FavoritesPage from './pages/public/FavoritesPage.jsx';
import ApplicationStatusPage from './pages/public/ApplicationStatusPage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterRequestPage from './pages/auth/RegisterRequestPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import AccountStatusPage from './pages/auth/AccountStatusPage.jsx';

// Los paneles conservan sus vistas provisionales hasta F3B y F3C.
function PendingSection({ title = 'Próximamente', description = 'Estamos preparando esta sección. Pronto encontrarás aquí más herramientas para tu comunidad.', icon = Sprout }) {
  return <div className="surface pending-section"><EmptyState icon={icon} title={title} description={description} /></div>;
}
function PublicLayout() { return <main id="contenido" tabIndex={-1} className="container section-space"><Outlet /></main>; }
function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    document.title = 'EmprendeBúho · Tu campus, tus emprendimientos';
    const frame = requestAnimationFrame(() => { document.querySelector('main')?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);
  return null;
}
export default function App() {
  return <BrowserRouter><ToastProvider><AuthProvider><FavoritesProvider><div className="app-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a><RouteFocus /><Navbar />
    <Routes><Route element={<PublicLayout />}>
      <Route path="/" element={<ExplorePage />} />
      <Route path="/explorar" element={<ExplorePage />} />
      <Route path="/negocio/:slug" element={<BusinessDetailPage />} />
      <Route path="/favoritos" element={<FavoritesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterRequestPage />} />
      <Route path="/estado-solicitud" element={<ApplicationStatusPage />} />
      <Route path="/estado-cuenta" element={<AccountStatusPage />} />
      <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
      <Route path="/restablecer-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/panel" element={<RequireRole role="emprendedor"><EntrepreneurLayout /></RequireRole>}><Route index element={<PendingSection title="Bienvenido a tu espacio" />} />{ENTREPRENEUR_LINKS.slice(1).map(link => <Route key={link.to} path={link.to.split('/').at(-1)} element={<PendingSection title={link.label} />} />)}</Route>
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}><Route index element={<PendingSection title="Resumen de la comunidad" />} />{ADMIN_LINKS.slice(1).map(link => <Route key={link.to} path={link.to.split('/').at(-1)} element={<PendingSection title={link.label} />} />)}</Route>
    </Routes><Footer /><BottomNav /></div></FavoritesProvider></AuthProvider></ToastProvider></BrowserRouter>;
}
