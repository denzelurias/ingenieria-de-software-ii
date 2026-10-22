import { NavLink, Outlet } from 'react-router';
import AdminSidebar from './AdminSidebar.jsx';
import { ADMIN_LINKS } from '../../utils/constants.js';
export default function AdminLayout() {
  return <main id="contenido" tabIndex={-1} className="container panel-space"><div className="panel-heading"><span className="eyebrow">COMUNIDAD UNISON</span><h1>Administración</h1><p>Un espacio para cuidar los emprendimientos de nuestro campus.</p></div>
    <nav className="panel-mobile-nav" aria-label="Secciones de administración">{ADMIN_LINKS.map(link => <NavLink className="section-link" key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}</nav>
    <div className="admin-grid"><AdminSidebar /><div className="panel-content"><Outlet /></div></div></main>;
}
