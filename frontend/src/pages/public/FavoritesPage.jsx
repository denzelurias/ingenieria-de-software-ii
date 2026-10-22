import { useEffect } from 'react';
import { Link } from 'react-router';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import BusinessCard from '../../components/business/BusinessCard.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorAlert from '../../components/common/ErrorAlert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
export default function FavoritesPage() {
  const { favorites, reconcileFavorites } = useFavorites(); const ids = favorites.join(',');
  const result = useApi(async ({ signal }) => {
    const requestedIds = ids.split(',').filter(Boolean).map(Number);
    if (!requestedIds.length) return { data: [] };
    // El servidor limita a 50 por página; consultar todas antes de depurar IDs.
    const first = await api.get('/businesses', { params: { ids, limit: 50, page: 1 }, signal, auth: false });
    const all = [...first.data];
    for (let page = 2; page <= first.meta.total_pages; page += 1) {
      const next = await api.get('/businesses', { params: { ids, limit: 50, page }, signal, auth: false }); all.push(...next.data);
    }
    if (!signal.aborted) reconcileFavorites(all.map(item => item.id), requestedIds);
    return { data: all };
  }, { immediate: false });
  useEffect(() => { void result.execute(); }, [ids, result.execute]);
  return <div className="grid gap-5"><h1 className="text-3xl font-heading text-unison-blue">Tus favoritos</h1><p className="text-slate-600">Guardados en este navegador, sin necesidad de una cuenta.</p><ErrorAlert error={result.error} onRetry={result.refetch} />{result.loading ? <Spinner label="Actualizando favoritos…" /> : !result.error && (favorites.length && result.data?.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{result.data.filter(item => favorites.includes(item.id)).map(business => <BusinessCard key={business.id} business={business} />)}</div> : <EmptyState title="Todavía no tienes favoritos" description="Toca el corazón de un negocio para encontrarlo aquí." action={<Link className="button button-primary" to="/explorar">Explorar negocios</Link>} />)}</div>;
}
