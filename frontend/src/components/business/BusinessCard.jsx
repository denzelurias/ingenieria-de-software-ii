import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import StatusBadge from './StatusBadge.jsx';
import ZoneBadge from './ZoneBadge.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { formatPriceRange } from '../../utils/format.js';
export default function BusinessCard({ business }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(business.id);
  return <article className="surface overflow-hidden flex flex-col relative"><Link to={`/negocio/${business.slug}`} className="block grow" aria-label={`Ver ${business.nombre_negocio}`}><div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden">{business.foto_perfil_url || business.foto_menu_url ? <img src={business.foto_perfil_url || business.foto_menu_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Avatar name={business.nombre_negocio} size={70} />}</div><div className="p-5 grid gap-3"><span className="eyebrow">{business.category_nombre}</span><h2 className="text-xl font-bold text-unison-blue break-words">{business.nombre_negocio}</h2><StatusBadge business={business} /><ZoneBadge business={business} /><p className="font-semibold text-unison-blue">{formatPriceRange(business.precio_minimo, business.precio_maximo)}</p></div></Link><button type="button" className="icon-button absolute top-2 right-2 bg-white! shadow-sm" aria-label={`${saved ? 'Quitar de' : 'Guardar en'} favoritos: ${business.nombre_negocio}`} aria-pressed={saved} onClick={() => toggleFavorite(business.id)}><Heart size={22} fill={saved ? 'currentColor' : 'none'} /></button></article>;
}
