"use client";

/**
 * Delete confirmation dialog for a client.
 *
 * Explicit confirmation before DELETE /clients/{id} — the destructive action
 * is only reachable from the client detail page (V1 choice: not from the
 * list, to avoid accidental deletions).
 *
 * The API call is delegated to the parent through `onConfirm` (consistent
 * with ClientForm: components own UX state, pages own API calls). While the
 * promise is pending both buttons are disabled; on rejection an error toast
 * is shown and the dialog stays open for retry.
 */
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";

interface DeleteClientDialogProps {
  clientName: string;
  /** Performs the DELETE call; reject to keep the dialog open. */
  onConfirm: () => Promise<void>;
}

export function DeleteClientDialog({
  clientName,
  onConfirm,
}: DeleteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Erreur réseau, réessayez");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Supprimer
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Supprimer ce client ?</DialogTitle>
          <DialogDescription>
            Le client « {clientName} » et ses données seront définitivement
            supprimés. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={deleting} />}
          >
            Annuler
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
