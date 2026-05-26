"use client";

/**
 * Dashboard — V1 placeholder.
 *
 * Calls GET /dashboard on mount and renders the three top-level totals. Lists
 * (recent documents, recent clients) are intentionally deferred to a richer
 * dashboard branch — this page exists in `feature/frontend-auth` only to
 * validate the full login → token → authenticated API call → render pipeline.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";

/** Human-readable byte count: 1024 → "1.0 KB", 1500000 → "1.4 MB". */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  const precision = i === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[i]}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const summary = await api.get<DashboardSummary>("/dashboard");
        if (cancelled) return;
        setData(summary);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.message : "Erreur de chargement";
        setError(msg);
        // 401 already triggers a redirect via the global handler in lib/api.ts;
        // here we just surface other errors as a toast.
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de votre cabinet.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Clients</CardDescription>
              <CardTitle className="text-3xl">
                {data.total_clients}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Documents</CardDescription>
              <CardTitle className="text-3xl">
                {data.total_documents}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Stockage utilisé</CardDescription>
              <CardTitle className="text-3xl">
                {formatBytes(data.total_storage_bytes)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
