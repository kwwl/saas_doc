"use client";

/**
 * Client documents — PLACEHOLDER.
 *
 * This route exists to reserve the URL and wire the navigation from the
 * client detail page. The actual document management UI (upload, list,
 * download, delete — backend endpoints already exist) lands in the next
 * feature branch (feature/frontend-documents).
 */
import { use } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function ClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div>
        <Link
          href={`/clients/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Fiche client
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Documents
        </h1>
      </div>

      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">Bientôt disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La gestion des documents de ce client arrive dans une prochaine
          version.
        </p>
        <Link
          href={`/clients/${id}`}
          className={`${buttonVariants({ variant: "outline" })} mt-4`}
        >
          Retour à la fiche client
        </Link>
      </div>
    </div>
  );
}
