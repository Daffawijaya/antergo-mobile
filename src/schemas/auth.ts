import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Email tidak valid.'),
  password: z.string().min(1, 'Password wajib diisi.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(100),
  email: z.email('Email tidak valid.').max(150),
  phone: z.string().trim().min(8, 'Nomor telepon minimal 8 digit.').max(20),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  path: ['password_confirmation'],
  message: 'Konfirmasi password tidak sama.',
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
