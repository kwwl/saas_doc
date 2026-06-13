"use client";

/**
 * Client list — GET /clients on mount.
 *
 * V1 scope: full list (no search, filter, or pagination — the backend returns
 * everything). States: loading, error, empty, populated table.
 * Multi-tenant scoping is enforced backend-side; this page renders whatever
 * the API returns for the caller's organization.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { ClientTable } from "@/components/clients/client-table";
import { buttonVariants } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.get<Client[]>("/clients");
        if (cancelled) return;
        setClients(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
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
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Les clients de votre cabinet.
          </p>
        </div>
        <Link href="/clients/new" className={buttonVariants()}>
          Nouveau client
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && clients && clients.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium">Aucun client pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez votre premier client pour commencer à organiser ses
            documents.
          </p>
          <Link
            href="/clients/new"
            className={`${buttonVariants({ variant: "outline" })} mt-4`}
          >
            Créer un client
          </Link>
        </div>
      )}

      {!loading && !error && clients && clients.length > 0 && (
        <ClientTable clients={clients} />
      )}
    </div>
  );
}
