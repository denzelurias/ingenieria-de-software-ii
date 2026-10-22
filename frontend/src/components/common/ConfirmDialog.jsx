import { useEffect, useId, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { createPortal } from 'react-dom';
import ErrorAlert from './ErrorAlert.jsx';
import Spinner from './Spinner.jsx';
export default function ConfirmDialog({ open, title = 'Confirmar acción', description, children, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive = false, onConfirm, onClose }) {
  const dialog = useRef(null); const id = useId();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) { setError(null); element.showModal(); }
    if (!open && element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [open]);
  const confirm = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await onConfirm?.(); onClose?.(); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  };
  return createPortal(<dialog ref={dialog} className="confirm-dialog" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose?.(); }} onClick={event => { if (event.target === dialog.current && !busy) onClose?.(); }}>
    <div className="dialog-content">{destructive && <TriangleAlert className="danger-icon" size={30} aria-hidden="true" />}<h2 id={`${id}-title`}>{title}</h2>
      {description && <p id={`${id}-description`}>{description}</p>}{children}<ErrorAlert error={error} />
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy} autoFocus>{cancelLabel}</button>
        <button type="button" className={`button ${destructive ? 'button-danger' : 'button-primary'}`} onClick={confirm} disabled={busy}>{busy ? <Spinner label="Procesando…" /> : confirmLabel}</button></div></div>
  </dialog>, document.body);
}
