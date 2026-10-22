import { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
export default function ReportModal({ open, businessId, productId, onClose }) {
  const [motivo, setMotivo] = useState('informacion_falsa'); const [descripcion, setDescripcion] = useState(''); const toast = useToast();
  const submit = async () => {
    if (motivo === 'otro' && descripcion.trim().length < 10) throw new Error('Describe el motivo con al menos 10 caracteres.');
    await api.post('/reports', { business_id: businessId, ...(productId ? { product_id: productId } : {}), motivo, descripcion: descripcion.trim() }, { auth: false });
    setDescripcion(''); toast.success('Gracias. Tu reporte fue enviado para revisión.');
  };
  return <ConfirmDialog open={open} title={productId ? 'Reportar producto' : 'Reportar negocio'} description="Los reportes son revisados por administración. Solo puedes reportar el mismo negocio una vez cada 24 horas." confirmLabel="Enviar reporte" onConfirm={submit} onClose={onClose}><div className="grid gap-4 mt-4"><label className="field-label">Motivo<select className="w-full mt-2" value={motivo} onChange={event => setMotivo(event.target.value)}>{[['informacion_falsa', 'Información falsa'], ['contenido_inapropiado', 'Contenido inapropiado'], ['producto_prohibido', 'Producto prohibido'], ['suplantacion', 'Suplantación'], ['otro', 'Otro']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">Descripción{motivo === 'otro' ? ' (obligatoria)' : ' (opcional)'}<textarea className="w-full mt-2" rows={4} maxLength={1000} minLength={motivo === 'otro' ? 10 : undefined} value={descripcion} onChange={event => setDescripcion(event.target.value)} /></label><p className="field-hint">{descripcion.length}/1000 caracteres</p></div></ConfirmDialog>;
}
