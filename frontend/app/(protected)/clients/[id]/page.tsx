"use client";

/**
 * Client detail — GET /clients/{id}.
 *
 * V1 scope: client info + actions (edit, documents). No stats, history, or
 * recent activity. A 404 (client not found in the caller's organization —
 * the backend's multi-tenant scoping) renders a dedicated "not found" state
 * with a link back to the list.
 *
 * The "Documents" action points to /clients/[id]/documents — a placeholder
 * route in this branch, implemented in the next feature.
 */
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import type { Client } from "@/lib/types";

/** ISO 8601 → "24/05/2026 10:00" (fr-FR). Em dash when null. */
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export default function ClientDetailPage({
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

  async function handleDelete() {
    await api.delete<void>(`/clients/${id}`);
    toast.success("Client supprimé");
    router.push("/clients");
  }

  if (loading && !notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
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
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-destructive">
          {error ?? "Erreur de chargement"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Clients
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {client.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/clients/${client.id}/documents`}
            className={buttonVariants({ variant: "outline" })}
          >
            Documents
          </Link>
          <Link
            href={`/clients/${client.id}/edit`}
            className={buttonVariants()}
          >
            Modifier
          </Link>
          <DeleteClientDialog
            clientName={client.name}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Coordonnées et identité du client.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" value={client.name} />
            <Field label="SIREN" value={client.siren} />
            <Field label="Email de contact" value={client.contact_email} />
            <Field label="Téléphone" value={client.contact_phone} />
            <Field
              label="Créé le"
              value={formatDateTime(client.created_at)}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
