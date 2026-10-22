import { useEffect } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router';
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
