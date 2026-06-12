/**
 * Tests for the delete confirmation dialog.
 *
 * Covers: dialog hidden until triggered, cancel does not delete, explicit
 * confirmation calls onConfirm, and a rejected onConfirm keeps the dialog
 * open (retry path).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { DeleteClientDialog } from "./delete-client-dialog";

function renderDialog(onConfirm = vi.fn().mockResolvedValue(undefined)) {
  render(
    <DeleteClientDialog clientName="Dupont SARL" onConfirm={onConfirm} />,
  );
  return { onConfirm };
}

describe("DeleteClientDialog", () => {
  it("does not show the confirmation until the trigger is clicked", () => {
    renderDialog();

    expect(
      screen.queryByText("Supprimer ce client ?"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByText("Supprimer ce client ?")).toBeInTheDocument();
    expect(screen.getByText(/« Dupont SARL »/)).toBeInTheDocument();
    expect(screen.getByText(/irréversible/)).toBeInTheDocument();
  });

  it("does not call onConfirm when cancelled", async () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() =>
      expect(
        screen.queryByText("Supprimer ce client ?"),
      ).not.toBeInTheDocument(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm on explicit confirmation", async () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer définitivement" }),
    );

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open when onConfirm rejects", async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValue(new ApiError(500, "Erreur serveur"));
    renderDialog(onConfirm);

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer définitivement" }),
    );

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Supprimer ce client ?")).toBeInTheDocument();
  });
});
