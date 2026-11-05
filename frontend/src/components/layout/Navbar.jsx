import { GraduationCap, Heart, ArrowUpRight, LogOut, Sparkles } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import Avatar from '../common/Avatar.jsx';
export function Brand() {
  return <Link to="/" className="brand group" aria-label="EmprendeBúho, inicio"><span className="brand-symbol"><GraduationCap size={24} strokeWidth={2} aria-hidden="true" /></span><span>Emprende<span className="brand-name">Búho</span><small>Sonora · Comunidad UNISON</small></span></Link>;
}
export default function Navbar({ searchSlot, filtersSlot }) {
  const auth = useAuth(); const { count } = useFavorites();
  const panel = auth.user?.rol === 'admin' ? '/admin' : '/panel';
  return <>
    <aside aria-label="Avisos de la comunidad" className="relative z-40 bg-brand-navy text-white overflow-hidden py-1.5 border-b border-brand-cobalt select-none">
      <div className="animate-marquee text-[11px] md:text-xs font-semibold tracking-wide flex items-center">
        <div className="flex items-center gap-8 shrink-0 px-4">
          <span>🦉 <strong>Directorio Estudiantil UNISON</strong> · Emprendimientos verificados con credencial institucional</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
          <span>🤝 <strong>Trato y contacto directo</strong> entre estudiantes en Campus Hermosillo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
          <span>📍 <strong>Puntos de encuentro en campus</strong> · Consulta horarios y disponibilidad en vivo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
          <Link to="/registro" className="underline font-bold text-brand-gold-light hover:text-white transition-colors">Registrar mi emprendimiento →</Link>
        </div>
        <div className="flex items-center gap-8 shrink-0 px-4" aria-hidden="true">
          <span>🦉 <strong>Directorio Estudiantil UNISON</strong> · Emprendimientos verificados con credencial institucional</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
          <span>🤝 <strong>Trato y contacto directo</strong> entre estudiantes en Campus Hermosillo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
          <span>📍 <strong>Puntos de encuentro en campus</strong> · Consulta horarios y disponibilidad en vivo</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
          <Link to="/registro" tabIndex={-1} className="underline font-bold text-brand-gold-light hover:text-white transition-colors">Registrar mi emprendimiento →</Link>
        </div>
      </div>
    </aside>
    <header className="site-header"><div className="container mobile-header"><Brand />{auth.isAuthenticated ? <button type="button" className="icon-button" onClick={auth.logout} aria-label="Cerrar sesión"><LogOut size={20} aria-hidden="true" /></button> : <Link className="mobile-campus" to="/explorar">Campus Hermosillo<ArrowUpRight size={14} aria-hidden="true" /></Link>}</div>
      <nav className="container navbar-desktop" aria-label="Navegación principal"><Brand /><div className="navbar-links"><NavLink className="nav-link" to="/explorar"><Sparkles size={16} aria-hidden="true" />Explorar</NavLink>
        <NavLink className="nav-link" to="/favoritos"><Heart size={17} aria-hidden="true" />Favoritos<span className="count-badge" aria-label={`${count} favoritos`}>{count}</span></NavLink></div>
        {searchSlot && <div className="navbar-search">{searchSlot}</div>}{filtersSlot}
        <div className="navbar-account">{auth.isAuthenticated ? <><Link to={panel} className="account-link"><Avatar name={auth.user.nombre_completo} size={32} /><span>Mi panel</span></Link><button type="button" className="icon-button" onClick={auth.logout} aria-label="Cerrar sesión"><LogOut size={19} aria-hidden="true" /></button></> : <Link to="/login" className="button button-gold btn-shine" aria-disabled={auth.loading || undefined}>{auth.loading ? 'Comprobando sesión…' : 'Acceso emprendedor'}{!auth.loading && <ArrowUpRight size={16} aria-hidden="true" />}</Link>}</div>
      </nav></header>
  </>;
}
