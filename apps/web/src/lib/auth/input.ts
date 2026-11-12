import { z } from 'zod';
export const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const passwordSchema = z.string().min(12, 'Use uma senha com pelo menos 12 caracteres').max(128);
export const authTokenSchema = z.string().regex(/^[\w-]{43}$/, 'Link inválido ou expirado');
