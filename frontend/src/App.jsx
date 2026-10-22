import { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { ArrowUpRight, MapPin, MessageCircle, Sprout, Heart, ArrowLeft } from 'lucide-react';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Footer from './components/layout/Footer.jsx';
import EntrepreneurLayout from './components/layout/EntrepreneurLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import RequireRole from './components/routing/RequireRole.jsx';
import EmptyState from './components/common/EmptyState.jsx';
import Avatar from './components/common/Avatar.jsx';
import { ADMIN_LINKS, ENTREPRENEUR_LINKS } from './utils/constants.js';

// Estas vistas breves reservan las rutas; las páginas de negocio y formularios se implementan en F3.
function PendingSection({ title = 'Próximamente', description = 'Estamos preparando esta sección. Pronto encontrarás aquí más herramientas para tu comunidad.', icon = Sprout }) {
  return <div className="surface pending-section"><EmptyState icon={icon} title={title} description={description} /></div>;
}
function Welcome() {
  return <main id="contenido" tabIndex={-1} className="container welcome-main"><section className="welcome-hero" aria-labelledby="welcome-title"><div className="hero-copy"><div className="campus-tag"><span aria-hidden="true" />DIRECTORIO ESTUDIANTIL · UNISON</div>
    <h1 id="welcome-title">Tu campus,<br />tus <em>emprendimientos.</em></h1><p className="hero-description">Las ideas de nuestra comunidad merecen encontrarse. Un espacio para conectar con quienes crean, preparan y emprenden en la UNISON.</p>
    <div className="hero-actions"><Link className="button button-primary" to="/explorar">Conocer el directorio<ArrowUpRight size={19} aria-hidden="true" /></Link><Link className="hero-link" to="/registro">Soy emprendedor<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <p className="campus-caption"><MapPin size={16} aria-hidden="true" />Hermosillo, Sonora · Un campus, muchas ideas</p></div>
    <aside className="community-card" aria-label="Comunidad emprendedora"><div className="community-card-top"><span className="eyebrow">HECHO EN EL CAMPUS</span><Sprout size={24} strokeWidth={1.5} aria-hidden="true" /></div>
      <div className="community-art" aria-hidden="true"><span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-seed"><Sprout size={72} strokeWidth={1.25} /></span><span className="art-note note-one">Ideas que crecen</span><span className="art-note note-two">Talento UNISON</span></div>
      <h2>Lo que buscas puede<br />estar entre clases.</h2><div className="community-card-bottom"><Avatar name="Comunidad UNISON" size={36} /><span>De estudiantes,<br /><strong>para estudiantes.</strong></span><ArrowUpRight size={22} aria-hidden="true" /></div></aside>
    </section><section className="foundation-intro" aria-labelledby="next-title"><div><span className="eyebrow">ESTO APENAS COMIENZA</span><h2 id="next-title">Un lugar para encontrarnos.</h2></div><p>El directorio está en preparación. Muy pronto podrás descubrir los emprendimientos del campus.</p></section>
    <div className="welcome-grid"><div className="surface welcome-status"><EmptyState title="Estamos preparando el directorio" description="Aquí encontrarás los negocios y productos de nuestra comunidad cuando esté disponible la exploración." /></div>
      <div className="principles"><article><span className="principle-icon"><MapPin size={22} aria-hidden="true" /></span><div><h3>Cerca de ti, a tu manera</h3><p>Cada emprendedor decide cuándo compartir su zona en el campus.</p></div></article>
        <article><span className="principle-icon"><MessageCircle size={22} aria-hidden="true" /></span><div><h3>Una conversación de distancia</h3><p>Conecta directamente con quien está detrás de cada idea.</p></div></article><p className="principles-note">CONEXIONES LOCALES. IDEAS QUE CRECEN.</p></div></div></main>;
}
function PublicLayout() { return <main id="contenido" tabIndex={-1} className="container section-space"><Outlet /></main>; }
function LoginPlaceholder() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) return <Navigate to={user.rol === 'admin' ? '/admin' : '/panel'} replace />;
  return <PendingSection title="Acceso emprendedor" description="El formulario de inicio de sesión estará disponible próximamente." />;
}
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
    <Routes><Route path="/" element={<Welcome />} /><Route element={<PublicLayout />}>
      <Route path="/explorar" element={<PendingSection title="Explora tu campus" description="La búsqueda y los filtros del directorio estarán disponibles próximamente." />} />
      <Route path="/favoritos" element={<PendingSection icon={Heart} title="Tus favoritos, en un solo lugar" description="La consulta de los negocios que guardes estará disponible próximamente." />} />
      <Route path="/login" element={<LoginPlaceholder />} />
      {[['registro', 'Comparte lo que haces'], ['estado-solicitud', 'Estado de tu solicitud'], ['estado-cuenta', 'Estado de tu cuenta'], ['recuperar-password', 'Recupera tu acceso'], ['restablecer-password', 'Restablece tu contraseña'], ['negocio/:slug', 'Un emprendimiento de tu comunidad']].map(([path, title]) => <Route key={path} path={path} element={<PendingSection title={title} />} />)
      }</Route>
      <Route path="/panel" element={<RequireRole role="emprendedor"><EntrepreneurLayout /></RequireRole>}><Route index element={<PendingSection title="Bienvenido a tu espacio" />} />{ENTREPRENEUR_LINKS.slice(1).map(link => <Route key={link.to} path={link.to.split('/').at(-1)} element={<PendingSection title={link.label} />} />)}</Route>
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}><Route index element={<PendingSection title="Resumen de la comunidad" />} />{ADMIN_LINKS.slice(1).map(link => <Route key={link.to} path={link.to.split('/').at(-1)} element={<PendingSection title={link.label} />} />)}</Route>
      <Route path="*" element={<main id="contenido" tabIndex={-1} className="container section-space"><EmptyState title="No encontramos esta sección" description="Vuelve al inicio para continuar." action={<Link to="/" className="button button-primary"><ArrowLeft size={18} aria-hidden="true" />Ir al inicio</Link>} /></main>} />
    </Routes><Footer /><BottomNav /></div></FavoritesProvider></AuthProvider></ToastProvider></BrowserRouter>;
}
