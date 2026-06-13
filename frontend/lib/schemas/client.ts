/**
 * Zod schema for the client create/edit form.
 *
 * Frontend-only validation — the backend re-validates everything via Pydantic.
 * One schema serves both create and edit (same rules, mirrors backend):
 *   - name:          required, 1-255 chars
 *   - siren:         optional, exactly 9 digits when provided
 *   - contact_email: optional, valid email when provided
 *   - contact_phone: optional, max 32 chars
 *
 * Form fields are plain strings ("" when empty). The backend rejects "" for
 * `contact_email` (Pydantic validates it as an email), so `toClientPayload`
 * converts empty strings to `null` before any API call. Sending `null` on
 * PUT explicitly clears the field (the backend only updates sent fields).
 */
import { z } from "zod";
import type { ClientCreate } from "@/lib/types";

export const clientSchema = z.object({
  name: z
    .string()
    .min(1, "Nom requis")
    .max(255, "Nom trop long (255 caractères maximum)"),
  siren: z
    .string()
    .regex(/^\d{9}$/, "Le SIREN doit contenir exactement 9 chiffres")
    .or(z.literal(""))
    .optional(),
  contact_email: z
    .string()
    .email("Email invalide")
    .or(z.literal(""))
    .optional(),
  contact_phone: z
    .string()
    .max(32, "Téléphone trop long (32 caractères maximum)")
    .optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

/**
 * Convert validated form values to an API payload.
 * Empty strings become `null` so the backend never receives "" for optional
 * fields (which would fail Pydantic validation on `contact_email`).
 */
export function toClientPayload(values: ClientFormValues): ClientCreate {
  return {
    name: values.name.trim(),
    siren: values.siren?.trim() || null,
    contact_email: values.contact_email?.trim() || null,
    contact_phone: values.contact_phone?.trim() || null,
  };
}
