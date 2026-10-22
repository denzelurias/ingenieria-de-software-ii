import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
export default function MenuLightbox({ open, src, alt = 'Menú del negocio', onClose }) {
  const dialog = useRef(null); const id = useId();
  useEffect(() => { const node = dialog.current; if (open && !node.open) node.showModal(); if (!open && node.open) node.close(); return () => { if (node.open) node.close(); }; }, [open]);
  return createPortal(<dialog ref={dialog} className="confirm-dialog max-w-5xl! w-[calc(100%_-_24px)]!" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}><div className="p-4"><div className="flex items-center justify-between gap-4 mb-3"><h2 id={id} className="font-bold">{alt}</h2><button type="button" className="button button-secondary" onClick={onClose} autoFocus>Cerrar</button></div>{open && src && <img src={src} alt={alt} className="w-full max-h-[80dvh] object-contain" />}</div></dialog>, document.body);
}
