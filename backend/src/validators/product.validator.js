import { z } from 'zod';
const price = z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform(Number).pipe(z.number().min(0).max(99999.99));
const fields = { nombre: z.string().trim().min(2).max(80), descripcion: z.string().trim().min(1).max(500), precio: price };
export const createProductBody = z.object(fields);
export const editProductBody = z.object(fields).partial();
export const productStatusBody = z.object({ estado: z.enum(['activo', 'pausado']) });
