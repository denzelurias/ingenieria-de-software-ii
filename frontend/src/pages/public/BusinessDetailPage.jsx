import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useHermosilloNow } from '../../hooks/useHermosilloNow.js';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import BusinessProfileView from '../../components/business/BusinessProfileView.jsx';
import MenuLightbox from '../../components/business/MenuLightbox.jsx';
import ReportModal from '../../components/business/ReportModal.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import NotFoundPage from './NotFoundPage.jsx';
export default function BusinessDetailPage() {
  const { slug } = useParams(); const { dow } = useHermosilloNow(); const favorites = useFavorites();
  const [menu, setMenu] = useState(null); const [report, setReport] = useState(null);
  const result = useApi(({ signal }) => api.get(`/businesses/${encodeURIComponent(slug)}`, { signal, auth: false }), { immediate: false });
  useEffect(() => { void result.execute(); setMenu(null); setReport(null); const timer = setInterval(() => { if (document.visibilityState === 'visible') void result.execute(); }, 60000); return () => clearInterval(timer); }, [slug, result.execute]);
  if (result.error?.status === 404) return <NotFoundPage title="Este negocio no está disponible" />;
  if (result.error) return <ErrorAlert error={result.error} onRetry={result.refetch} />;
  if (!result.data || result.data.slug !== slug) return <div className="page-loader"><Spinner label="Cargando negocio…" /></div>;
  const business = result.data;
  return <><Link className="text-button inline-flex mb-4" to="/explorar">← Volver al directorio</Link><BusinessProfileView key={slug} business={business} currentDay={dow} isFavorite={favorites.isFavorite(business.id)} onToggleFavorite={() => favorites.toggleFavorite(business.id)} onOpenMenu={setMenu} onReport={product => setReport({ productId: product?.id })} /><MenuLightbox open={Boolean(menu)} src={menu} alt={`Menú de ${business.nombre_negocio}`} onClose={() => setMenu(null)} /><ReportModal key={`${business.id}-${report?.productId || 'business'}`} open={report !== null} businessId={business.id} productId={report?.productId} onClose={() => setReport(null)} /></>;
}
