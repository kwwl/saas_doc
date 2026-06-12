"use client";

/**
 * Shared client form — used by /clients/new (create) and /clients/[id]/edit.
 *
 * Responsibilities:
 *   - react-hook-form + zod validation (clientSchema)
 *   - normalize values via toClientPayload ("" → null, trim) before submit
 *   - submitting state (button disabled + label swap)
 *
 * The API call itself is delegated to the page through `onSubmit` so this
 * component stays agnostic of create vs update. Error toasts are handled
 * here (consistent for both modes); the page resolves its promise on
 * success and handles navigation.
 */
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  clientSchema,
  toClientPayload,
  type ClientFormValues,
} from "@/lib/schemas/client";
import type { Client, ClientCreate } from "@/lib/types";

/** Map an API Client to form values (null → "" for controlled inputs). */
export function clientToFormValues(client: Client): ClientFormValues {
  return {
    name: client.name,
    siren: client.siren ?? "",
    contact_email: client.contact_email ?? "",
    contact_phone: client.contact_phone ?? "",
  };
}

interface ClientFormProps {
  /** Pre-filled values (edit mode). Omit for create mode. */
  defaultValues?: ClientFormValues;
  /** Receives the normalized API payload; reject to keep the form enabled. */
  onSubmit: (payload: ClientCreate) => Promise<void>;
  submitLabel: string;
  /** Where the "Annuler" link goes (list in create mode, detail in edit mode). */
  cancelHref: string;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  submitLabel,
  cancelHref,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues ?? {
      name: "",
      siren: "",
      contact_email: "",
      contact_phone: "",
    },
  });

  async function submit(values: ClientFormValues) {
    try {
      await onSubmit(toClientPayload(values));
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Erreur réseau, réessayez");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom *</Label>
        <Input
          id="name"
          type="text"
          autoComplete="organization"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="siren">SIREN</Label>
        <Input
          id="siren"
          type="text"
          inputMode="numeric"
          maxLength={9}
          placeholder="123456789"
          {...register("siren")}
          aria-invalid={!!errors.siren}
        />
        {errors.siren && (
          <p className="text-sm text-destructive">{errors.siren.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_email">Email de contact</Label>
        <Input
          id="contact_email"
          type="email"
          autoComplete="email"
          {...register("contact_email")}
          aria-invalid={!!errors.contact_email}
        />
        {errors.contact_email && (
          <p className="text-sm text-destructive">
            {errors.contact_email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact_phone">Téléphone</Label>
        <Input
          id="contact_phone"
          type="tel"
          autoComplete="tel"
          {...register("contact_phone")}
          aria-invalid={!!errors.contact_phone}
        />
        {errors.contact_phone && (
          <p className="text-sm text-destructive">
            {errors.contact_phone.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : submitLabel}
        </Button>
        <Link
          href={cancelHref}
          className={buttonVariants({ variant: "ghost" })}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
