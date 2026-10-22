import { Compass, Heart, UserRound } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
export default function BottomNav() {
  const { user } = useAuth(); const { count } = useFavorites(); const location = useLocation();
  const account = user ? user.rol === 'admin' ? '/admin' : '/panel' : '/login';
  return <nav className="bottom-nav" aria-label="Navegación móvil"><NavLink to="/explorar" className={({ isActive }) => `bottom-link ${isActive || location.pathname === '/' ? 'is-active' : ''}`}><Compass size={22} aria-hidden="true" /><span>Explorar</span></NavLink>
    <NavLink to="/favoritos" className={({ isActive }) => `bottom-link ${isActive ? 'is-active' : ''}`}><span className="bottom-icon"><Heart size={22} aria-hidden="true" />{count > 0 && <span className="mobile-count">{count}</span>}</span><span>Favoritos<span className="sr-only">: {count}</span></span></NavLink>
    <NavLink to={account} className={({ isActive }) => `bottom-link ${isActive ? 'is-active' : ''}`}><UserRound size={22} aria-hidden="true" /><span>{user ? 'Mi panel' : 'Mi cuenta'}</span></NavLink></nav>;
}
