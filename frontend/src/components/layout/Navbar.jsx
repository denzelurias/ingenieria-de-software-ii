import { GraduationCap, Heart, ArrowUpRight, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import Avatar from '../common/Avatar.jsx';
export function Brand() {
  return <Link to="/" className="brand" aria-label="EmprendeBúho, inicio"><span className="brand-symbol"><GraduationCap size={26} strokeWidth={1.8} aria-hidden="true" /></span><span>Emprende<span className="brand-name">Búho</span><small>COMUNIDAD UNISON</small></span></Link>;
}
export default function Navbar({ searchSlot, filtersSlot }) {
  const auth = useAuth(); const { count } = useFavorites();
  const panel = auth.user?.rol === 'admin' ? '/admin' : '/panel';
  return <header className="site-header"><div className="container mobile-header"><Brand />{auth.isAuthenticated ? <button type="button" className="icon-button" onClick={auth.logout} aria-label="Cerrar sesión"><LogOut size={20} aria-hidden="true" /></button> : <Link className="mobile-campus" to="/explorar">Campus Hermosillo<ArrowUpRight size={15} aria-hidden="true" /></Link>}</div>
    <nav className="container navbar-desktop" aria-label="Navegación principal"><Brand /><div className="navbar-links"><NavLink className="nav-link" to="/explorar">Explorar</NavLink>
      <NavLink className="nav-link" to="/favoritos"><Heart size={18} aria-hidden="true" />Favoritos<span className="count-badge" aria-label={`${count} favoritos`}>{count}</span></NavLink></div>
      {searchSlot && <div className="navbar-search">{searchSlot}</div>}{filtersSlot}
      <div className="navbar-account">{auth.isAuthenticated ? <><Link to={panel} className="account-link"><Avatar name={auth.user.nombre_completo} size={34} /><span>Mi panel</span></Link><button type="button" className="icon-button" onClick={auth.logout} aria-label="Cerrar sesión"><LogOut size={19} aria-hidden="true" /></button></> : <Link to="/login" className="button button-primary" aria-disabled={auth.loading || undefined}>{auth.loading ? 'Comprobando sesión…' : 'Acceso emprendedor'}{!auth.loading && <ArrowUpRight size={17} aria-hidden="true" />}</Link>}</div>
    </nav></header>;
}
