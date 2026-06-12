"use client";

/**
 * Client creation — POST /clients.
 *
 * Renders the shared ClientForm in create mode. On success, redirects to the
 * new client's detail page. API errors are toasted by the form (the promise
 * rejection keeps the form enabled for retry).
 */
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClientForm } from "@/components/clients/client-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Client, ClientCreate } from "@/lib/types";

export default function NewClientPage() {
  const router = useRouter();

  async function handleSubmit(payload: ClientCreate) {
    const created = await api.post<Client>("/clients", payload);
    toast.success("Client créé");
    router.push(`/clients/${created.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau client</CardTitle>
          <CardDescription>
            Ajoutez un client à votre cabinet. Seul le nom est obligatoire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            onSubmit={handleSubmit}
            submitLabel="Créer le client"
            cancelHref="/clients"
          />
        </CardContent>
      </Card>
    </div>
  );
}
