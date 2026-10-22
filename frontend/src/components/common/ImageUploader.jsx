import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../utils/constants.js';
export default function ImageUploader({ value = null, imageUrl = null, onChange, onRemove, label = 'Imagen', name = 'imagen', disabled = false, error }) {
  const id = useId(); const input = useRef(null);
  const [preview, setPreview] = useState(null); const [localError, setLocalError] = useState(null);
  useEffect(() => {
    if (!(value instanceof File)) { setPreview(null); return; }
    const url = URL.createObjectURL(value); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  const selected = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) { setLocalError('La imagen debe ser JPG, PNG o WebP y pesar máximo 5 MB.'); return; }
    setLocalError(null); onChange?.(file);
  };
  const remove = () => { setLocalError(null); onChange?.(null); onRemove?.(); };
  return <div className="image-uploader"><label className="field-label" htmlFor={id}>{label}</label>
    {(preview || imageUrl) && <img className="upload-preview" src={preview || imageUrl} alt={`Vista previa: ${label.toLocaleLowerCase('es-MX')}`} />}
    <input ref={input} className="sr-only" id={id} name={name} type="file" accept={IMAGE_TYPES.join(',')} disabled={disabled} onChange={selected} aria-describedby={`${id}-hint${localError || error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(localError || error)} />
    <div className="upload-actions"><button type="button" className="button button-secondary" disabled={disabled} onClick={() => input.current.click()}><ImagePlus size={19} aria-hidden="true" />{preview || imageUrl ? 'Cambiar imagen' : 'Elegir imagen'}</button>
      {(value || imageUrl) && <button type="button" className="icon-button danger-icon" disabled={disabled} onClick={remove} aria-label={`Quitar ${label.toLocaleLowerCase('es-MX')}`}><Trash2 size={20} aria-hidden="true" /></button>}</div>
    <p id={`${id}-hint`} className="field-hint">JPG, PNG o WebP · Máximo 5 MB</p>{(localError || error) && <p id={`${id}-error`} className="field-error" role="alert">{localError || error}</p>}</div>;
}
