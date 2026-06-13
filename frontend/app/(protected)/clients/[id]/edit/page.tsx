"use client";

/**
 * Client edit — GET /clients/{id} to pre-fill, PUT /clients/{id} on submit.
 *
 * Reuses the shared ClientForm (same component and zod schema as create).
 * The full payload is sent on PUT: clearing a field sends `null`, which
 * explicitly erases the value backend-side (partial-update semantics — only
 * sent fields are modified). On success: toast + redirect to the detail page.
 * A 404 (not found / other organization) renders the same "not found" state
 * as the detail page.
 */
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ClientForm,
  clientToFormValues,
} from "@/components/clients/client-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import type { Client, ClientCreate } from "@/lib/types";

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.get<Client>(`/clients/${id}`);
        if (cancelled) return;
        setClient(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
          return;
        }
        const msg =
          e instanceof ApiError ? e.message : "Erreur de chargement";
        setError(msg);
        // 401 already triggers a redirect via the global handler in lib/api.ts.
        if (!(e instanceof ApiError) || e.status !== 401) {
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(payload: ClientCreate) {
    const updated = await api.put<Client>(`/clients/${id}`, payload);
    toast.success("Client modifié");
    router.push(`/clients/${updated.id}`);
  }

  if (loading && !notFound) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">Client introuvable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce client n&apos;existe pas ou a été supprimé.
          </p>
          <Link
            href="/clients"
            className={`${buttonVariants({ variant: "outline" })} mt-4`}
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="mx-auto max-w-xl px-6 py-8">
        <p className="text-sm text-destructive">
          {error ?? "Erreur de chargement"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Modifier le client</CardTitle>
          <CardDescription>{client.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            defaultValues={clientToFormValues(client)}
            onSubmit={handleSubmit}
            submitLabel="Enregistrer"
            cancelHref={`/clients/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
