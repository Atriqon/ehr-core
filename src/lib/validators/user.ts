import { z } from 'zod';

export const userCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(10, 'Mínimo 10 caracteres'),
  full_name: z.string().min(1, 'Nombre requerido').max(255).trim(),
  role: z.enum(['admin', 'doctor', 'receptionist']),
});

export const userUpdateSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  full_name: z.string().min(1, 'Nombre requerido').max(255).trim().optional(),
  role: z.enum(['admin', 'doctor', 'receptionist']).optional(),
  is_active: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const resetPasswordSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  new_password: z.string().min(10, 'Mínimo 10 caracteres'),
});

export const clinicSettingsSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(255).trim(),
  address: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  timezone: z.string().min(1, 'Zona horaria requerida').max(50),
  week_starts_on: z.coerce.number().int().min(0).max(1).optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ClinicSettingsInput = z.infer<typeof clinicSettingsSchema>;
