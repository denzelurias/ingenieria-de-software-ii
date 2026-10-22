import { z } from 'zod';
export const reportBody = z.object({
  business_id: z.number().int().positive().safe(), product_id: z.number().int().positive().safe().optional(),
  motivo: z.enum(['informacion_falsa', 'contenido_inapropiado', 'producto_prohibido', 'suplantacion', 'otro']),
  descripcion: z.string().trim().max(1000).default('')
}).superRefine((data, ctx) => {
  if (data.motivo === 'otro' && data.descripcion.length < 10) ctx.addIssue({ code: 'custom', path: ['descripcion'], message: 'Describe el motivo con al menos 10 caracteres.' });
});
