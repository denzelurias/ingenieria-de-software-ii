import { Link } from 'react-router';
import { formatCurrency } from '../../utils/format.js';
import StatusBadge from '../business/StatusBadge.jsx';
import ZoneBadge from '../business/ZoneBadge.jsx';
export default function ProductCard({ product, onReport }) {
  const content = <><div className="h-44 bg-slate-100 overflow-hidden">{product.imagen_url && <img src={product.imagen_url} alt={product.nombre} loading="lazy" className="w-full h-full object-cover" />}</div><div className="p-4 grid gap-2"><h3 className="font-bold text-lg text-unison-blue">{product.nombre}</h3><p className="font-bold text-unison-blue">{formatCurrency(product.precio)}</p>{product.descripcion && <p className="text-sm text-slate-600 break-words whitespace-pre-wrap">{product.descripcion}</p>}{product.estado === 'pausado' && <span className="rounded-lg bg-amber-100 p-2 text-amber-900 text-sm">No disponible temporalmente</span>}{product.business && <><p className="font-semibold">{product.business.nombre_negocio}</p><StatusBadge business={product.business} /><ZoneBadge business={product.business} /></>}</div></>;
  return <article className="surface overflow-hidden">{product.business ? <Link className="block h-full" to={`/negocio/${product.business.slug}`}>{content}</Link> : content}{onReport && <button className="text-button mx-4" type="button" onClick={() => onReport(product)}>Reportar producto</button>}</article>;
}
