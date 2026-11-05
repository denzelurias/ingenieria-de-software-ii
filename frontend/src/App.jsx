import { useEffect, useState } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router';
import { Rocket } from 'lucide-react';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Footer from './components/layout/Footer.jsx';
import EntrepreneurLayout from './components/layout/EntrepreneurLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import RequireRole from './components/routing/RequireRole.jsx';
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
import DashboardPage from './pages/entrepreneur/DashboardPage.jsx';
import ProfileEditorPage from './pages/entrepreneur/ProfileEditorPage.jsx';
import CatalogManagerPage from './pages/entrepreneur/CatalogManagerPage.jsx';
import ScheduleLocationPage from './pages/entrepreneur/ScheduleLocationPage.jsx';
import ProfilePreviewPage from './pages/entrepreneur/ProfilePreviewPage.jsx';
import NotificationsPage from './pages/entrepreneur/NotificationsPage.jsx';
import AccountSettingsPage from './pages/entrepreneur/AccountSettingsPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import PendingRequestsPage from './pages/admin/PendingRequestsPage.jsx';
import ReportsManagerPage from './pages/admin/ReportsManagerPage.jsx';
import CategoriesManagerPage from './pages/admin/CategoriesManagerPage.jsx';
import ModerationProductsPage from './pages/admin/ModerationProductsPage.jsx';
import SystemMaintenancePage from './pages/admin/SystemMaintenancePage.jsx';

function PublicLayout() { return <main id="contenido" tabIndex={-1} className="container section-space"><Outlet /></main>; }
function ScrollChrome() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(height > 0 ? Math.min(100, (winScroll / height) * 100) : 0);
      setShowTop(winScroll > 450);
      const header = document.querySelector('.site-header');
      if (header) header.classList.toggle('header-compact', winScroll > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <>
    <div aria-hidden="true" className="fixed top-0 left-0 h-1 bg-gradient-to-r from-brand-gold via-brand-gold-light to-brand-cobalt z-50 transition-all duration-100 pointer-events-none" style={{ width: `${progress}%` }} />
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={`fixed bottom-22 md:bottom-6 right-5 z-30 w-11 h-11 rounded-full bg-brand-navy text-white font-bold shadow-xl hover:scale-110 transition-all flex items-center justify-center group ${showTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-label="Volver arriba">
      <Rocket size={19} className="group-hover:-translate-y-0.5 transition-transform text-brand-gold" aria-hidden="true" />
    </button>
  </>;
}
function RouteFocus() {
  const location = useLocation();
  useEffect(() => {
    document.title = 'EmprendeBúho · Tu campus, tus emprendimientos';
    const frame = requestAnimationFrame(() => {
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) document.querySelector('main')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);
  return null;
}
export default function App() {
  return <BrowserRouter><ToastProvider><AuthProvider><FavoritesProvider><div className="app-shell"><a className="skip-link" href="#contenido">Saltar al contenido</a><ScrollChrome /><RouteFocus /><Navbar />
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
      <Route path="/panel" element={<RequireRole role="emprendedor"><EntrepreneurLayout /></RequireRole>}>
        <Route index element={<DashboardPage />} />
        <Route path="perfil" element={<ProfileEditorPage />} />
        <Route path="catalogo" element={<CatalogManagerPage />} />
        <Route path="horarios" element={<ScheduleLocationPage />} />
        <Route path="vista-previa" element={<ProfilePreviewPage />} />
        <Route path="notificaciones" element={<NotificationsPage />} />
        <Route path="cuenta" element={<AccountSettingsPage />} />
      </Route>
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="solicitudes" element={<PendingRequestsPage />} />
        <Route path="reportes" element={<ReportsManagerPage />} />
        <Route path="categorias" element={<CategoriesManagerPage />} />
        <Route path="moderacion" element={<ModerationProductsPage />} />
        <Route path="mantenimiento" element={<SystemMaintenancePage />} />
      </Route>
    </Routes><Footer /><BottomNav /></div></FavoritesProvider></AuthProvider></ToastProvider></BrowserRouter>;
}
