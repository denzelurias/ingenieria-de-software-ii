import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useHermosilloNow } from '../../hooks/useHermosilloNow.js';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import BusinessProfileView from '../../components/business/BusinessProfileView.jsx';
import MenuLightbox from '../../components/business/MenuLightbox.jsx';
import ReportModal from '../../components/business/ReportModal.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';

export default function ProfilePreviewPage() {
  const { business } = useOutletContext(); const { dow } = useHermosilloNow();
  const favorites = useFavorites();
  const preview = useApi(({ signal }) => api.get('/my-business/preview', { signal }), { immediate: false });
  const [menu, setMenu] = useState(null); const [report, setReport] = useState(null);
  useEffect(() => { if (business) void preview.execute(); }, [business, preview.execute]);
  return <div className="grid gap-5">
    <div className="rounded-xl bg-unison-gold-soft border border-unison-gold p-4 text-unison-blue" role="note"><strong>Modo Vista Previa Consumidor — Así ven tu perfil los estudiantes</strong><p className="text-sm mt-2">Se respetan la privacidad de tu ubicación y la visibilidad de tus productos.</p></div>
    <button type="button" className="button button-secondary justify-self-start" onClick={preview.refetch} disabled={preview.loading || !business}>Actualizar vista previa</button>
    <ErrorAlert error={preview.error} onRetry={preview.refetch} />
    {preview.loading || !business ? <Spinner label="Cargando vista previa…" /> : !preview.error && preview.data && <>
      <BusinessProfileView business={preview.data} currentDay={dow} isFavorite={favorites.isFavorite(preview.data.id)} onToggleFavorite={() => favorites.toggleFavorite(preview.data.id)} onOpenMenu={setMenu} onReport={product => setReport({ productId: product?.id })} />
      <MenuLightbox open={Boolean(menu)} src={menu} alt={`Menú de ${preview.data.nombre_negocio}`} onClose={() => setMenu(null)} />
      <ReportModal key={report?.productId ?? 'business'} open={report !== null} businessId={preview.data.id} productId={report?.productId} onClose={() => setReport(null)} />
    </>}
  </div>;
}
