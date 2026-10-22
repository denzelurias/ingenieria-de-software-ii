import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FAVORITES_KEY, MAX_FAVORITES } from '../utils/constants.js';
const FavoritesContext = import.meta.hot?.data.favoritesContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.favoritesContext = FavoritesContext;
const sanitize = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, MAX_FAVORITES) : [];
function readFavorites() { try { return sanitize(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')); } catch { return []; } }
export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(readFavorites);
  useEffect(() => { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* Favoritos disponibles en memoria si el navegador bloquea el almacenamiento. */ } }, [favorites]);
  useEffect(() => {
    const changed = event => { if (event.key === FAVORITES_KEY || event.key === null) setFavorites(readFavorites()); };
    window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed);
  }, []);
  const toggleFavorite = useCallback(id => {
    if (!Number.isSafeInteger(id) || id < 1) return;
    setFavorites(items => items.includes(id) ? items.filter(item => item !== id) : items.length < MAX_FAVORITES ? [...items, id] : items);
  }, []);
  const removeFavorite = useCallback(id => setFavorites(items => items.filter(item => item !== id)), []);
  // F3A llama esta función tras consultar exactamente los IDs solicitados, nunca una página parcial.
  const reconcileFavorites = useCallback((availableIds, requestedIds) => {
    const available = new Set(sanitize(availableIds)); const requested = new Set(sanitize(requestedIds));
    setFavorites(items => items.filter(id => !requested.has(id) || available.has(id)));
  }, []);
  const value = useMemo(() => ({ favorites, count: favorites.length, isFavorite: id => favorites.includes(id), toggleFavorite, removeFavorite, reconcileFavorites }), [favorites, toggleFavorite, removeFavorite, reconcileFavorites]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
export function useFavorites() { const value = useContext(FavoritesContext); if (!value) throw new Error('useFavorites requiere FavoritesProvider.'); return value; }
export default FavoritesContext;
