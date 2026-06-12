/**
 * Tests for the shared client form (create + edit modes).
 *
 * Covers: rendering, zod validation surfacing, normalized payload on submit
 * ("" → null via toClientPayload), edit-mode pre-fill, and the
 * clientToFormValues mapping (null → "").
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Client } from "@/lib/types";
import { ClientForm, clientToFormValues } from "./client-form";

const baseClient: Client = {
  id: "client-1",
  name: "Dupont SARL",
  siren: "123456789",
  contact_email: "contact@dupont.fr",
  contact_phone: "+33123456789",
  organization_id: "org-1",
  created_at: "2026-05-24T10:00:00Z",
};

function renderForm(props: Partial<React.ComponentProps<typeof ClientForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <ClientForm
      onSubmit={onSubmit}
      submitLabel="Créer le client"
      cancelHref="/clients"
      {...props}
    />,
  );
  return { onSubmit };
}

describe("ClientForm", () => {
  it("renders the four fields and the submit button", () => {
    renderForm();

    expect(screen.getByLabelText("Nom *")).toBeInTheDocument();
    expect(screen.getByLabelText("SIREN")).toBeInTheDocument();
    expect(screen.getByLabelText("Email de contact")).toBeInTheDocument();
    expect(screen.getByLabelText("Téléphone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Créer le client" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Annuler" })).toHaveAttribute(
      "href",
      "/clients",
    );
  });

  it("shows a validation error and does not submit when name is empty", async () => {
    const { onSubmit } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Créer le client" }));

    expect(await screen.findByText("Nom requis")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a validation error for an invalid SIREN", async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByLabelText("Nom *"), {
      target: { value: "Dupont SARL" },
    });
    fireEvent.change(screen.getByLabelText("SIREN"), {
      target: { value: "12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le client" }));

    expect(
      await screen.findByText("Le SIREN doit contenir exactement 9 chiffres"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a normalized payload (empty optional fields → null)", async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByLabelText("Nom *"), {
      target: { value: "  Dupont SARL  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le client" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Dupont SARL",
      siren: null,
      contact_email: null,
      contact_phone: null,
    });
  });

  it("pre-fills fields in edit mode", () => {
    renderForm({
      defaultValues: clientToFormValues(baseClient),
      submitLabel: "Enregistrer",
    });

    expect(screen.getByLabelText("Nom *")).toHaveValue("Dupont SARL");
    expect(screen.getByLabelText("SIREN")).toHaveValue("123456789");
    expect(screen.getByLabelText("Email de contact")).toHaveValue(
      "contact@dupont.fr",
    );
    expect(screen.getByLabelText("Téléphone")).toHaveValue("+33123456789");
  });
});

describe("clientToFormValues", () => {
  it("maps null fields to empty strings", () => {
    expect(
      clientToFormValues({
        ...baseClient,
        siren: null,
        contact_email: null,
        contact_phone: null,
      }),
    ).toEqual({
      name: "Dupont SARL",
      siren: "",
      contact_email: "",
      contact_phone: "",
    });
  });

  it("keeps non-null fields as-is", () => {
    expect(clientToFormValues(baseClient)).toEqual({
      name: "Dupont SARL",
      siren: "123456789",
      contact_email: "contact@dupont.fr",
      contact_phone: "+33123456789",
    });
  });
});
