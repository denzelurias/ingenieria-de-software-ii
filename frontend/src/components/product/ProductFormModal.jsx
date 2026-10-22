import { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import ImageUploader from '../common/ImageUploader.jsx';

export default function ProductFormModal({ open, product = null, onSave, onClose }) {
  // El padre monta una instancia por edición para descartar borradores anteriores.
  const [nombre, setNombre] = useState(product?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(product?.descripcion ?? '');
  const [precio, setPrecio] = useState(product ? String(product.precio) : '');
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (nombre.trim().length < 2 || nombre.trim().length > 80) throw new Error('Escribe un nombre de 2 a 80 caracteres.');
    if (!descripcion.trim() || descripcion.trim().length > 500) throw new Error('La descripción debe tener de 1 a 500 caracteres.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(precio) || Number(precio) > 99999.99) throw new Error('Escribe un precio de $0 a $99,999.99, con máximo dos decimales.');
    if (!product && !image) throw new Error('La imagen es obligatoria al crear un producto.');
    const body = new FormData();
    body.append('nombre', nombre.trim());
    body.append('descripcion', descripcion.trim());
    body.append('precio', precio);
    if (image) body.append('imagen', image);
    setSaving(true);
    try { await onSave(body); } finally { setSaving(false); }
  };
  return <ConfirmDialog open={open} title={product ? 'Editar producto' : 'Nuevo producto'} confirmLabel="Guardar producto" onClose={onClose} onConfirm={save}>
    <fieldset disabled={saving} className="grid gap-4 mt-5">
      {product?.estado === 'oculto_admin' && <p className="error-alert">Puedes corregir el producto. Seguirá oculto hasta que administración lo restaure.</p>}
      <label className="field-label">Nombre<input className="w-full mt-2" name="nombre" value={nombre} onChange={event => setNombre(event.target.value)} maxLength={80} required /></label>
      <label className="field-label">Descripción<textarea className="w-full mt-2" name="descripcion" value={descripcion} onChange={event => setDescripcion(event.target.value)} maxLength={500} rows={3} required /></label>
      <p className="field-hint">{descripcion.length}/500 caracteres</p>
      <label className="field-label">Precio (MXN)<input className="w-full mt-2" name="precio" type="number" min="0" max="99999.99" step="0.01" value={precio} onChange={event => setPrecio(event.target.value)} required /></label>
      {product?.imagen_url && !image && <figure><img className="upload-preview" src={product.imagen_url} alt={`Imagen actual de ${product.nombre}`} /><figcaption className="field-hint">Imagen actual</figcaption></figure>}
      <ImageUploader label="Imagen del producto" value={image} onChange={setImage} disabled={saving} />
      {product && <p className="field-hint">Si no eliges otra imagen, se conserva la actual.</p>}
    </fieldset>
  </ConfirmDialog>;
}
