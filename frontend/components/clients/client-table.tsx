/**
 * Presentational table for the client list.
 *
 * Pure rendering component — data fetching and state live in the page.
 * Each row links to the client detail page (/clients/[id]).
 * Nullable fields (siren, contact_email, contact_phone, created_at) render
 * as an em dash.
 */
import Link from "next/link";

import type { Client } from "@/lib/types";

/** ISO 8601 → "24/05/2026" (fr-FR). Em dash when null. */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

function cell(value: string | null): string {
  return value || "—";
}

export function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nom</th>
            <th className="px-4 py-3 font-medium">SIREN</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Téléphone</th>
            <th className="px-4 py-3 font-medium">Créé le</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              className="border-b border-border last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/clients/${client.id}`}
                  className="font-medium hover:underline"
                >
                  {client.name}
                </Link>
              </td>
              <td className="px-4 py-3 tabular-nums">{cell(client.siren)}</td>
              <td className="px-4 py-3">{cell(client.contact_email)}</td>
              <td className="px-4 py-3">{cell(client.contact_phone)}</td>
              <td className="px-4 py-3 tabular-nums">
                {formatDate(client.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
