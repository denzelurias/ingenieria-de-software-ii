import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (!totalPages || totalPages <= 1) return null;
  return <nav className="pagination" aria-label="Páginas de resultados"><button type="button" className="button button-secondary" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={18} aria-hidden="true" />Anterior</button>
    <span aria-live="polite">Página {page} de {totalPages}</span><button type="button" className="button button-secondary" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente<ChevronRight size={18} aria-hidden="true" /></button></nav>;
}
