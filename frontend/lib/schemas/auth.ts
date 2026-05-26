/**
 * Zod schemas for authentication forms.
 *
 * Frontend-only validation — the backend re-validates everything via Pydantic,
 * so these are purely for UX (instant feedback in forms).
 *
 * Password rules:
 *   - Login: any non-empty string (don't reject legacy accounts whose password
 *     might predate stricter rules).
 *   - Register: min 8 chars (V1 baseline; backend should mirror this in a
 *     future feature branch — currently has no min).
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email requis").email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  organization_name: z
    .string()
    .min(1, "Nom du cabinet requis")
    .max(255, "Nom trop long (255 caractères maximum)"),
  email: z.string().min(1, "Email requis").email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
