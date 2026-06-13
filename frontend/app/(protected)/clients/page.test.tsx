/**
 * Smoke tests for the client list page.
 *
 * `@/lib/api` is partially mocked (real ApiError, mocked api.get) so we can
 * drive the three states: populated table, empty state, API error.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Client } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn() },
  };
});

import { api } from "@/lib/api";
import ClientsPage from "./page";

const mockedGet = vi.mocked(api.get);

const clients: Client[] = [
  {
    id: "client-1",
    name: "Dupont SARL",
    siren: "123456789",
    contact_email: "contact@dupont.fr",
    contact_phone: null,
    organization_id: "org-1",
    created_at: "2026-05-24T10:00:00Z",
  },
  {
    id: "client-2",
    name: "Martin & Co",
    siren: null,
    contact_email: null,
    contact_phone: null,
    organization_id: "org-1",
    created_at: null,
  },
];

beforeEach(() => {
  mockedGet.mockReset();
});

describe("ClientsPage", () => {
  it("renders the client table with detail links", async () => {
    mockedGet.mockResolvedValue(clients);

    render(<ClientsPage />);

    expect(await screen.findByText("Dupont SARL")).toBeInTheDocument();
    expect(screen.getByText("Martin & Co")).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith("/clients");
    expect(
      screen.getByRole("link", { name: "Dupont SARL" }),
    ).toHaveAttribute("href", "/clients/client-1");
    // Null fields render as em dashes (Martin & Co: siren, email, phone, date).
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("renders the empty state when there are no clients", async () => {
    mockedGet.mockResolvedValue([]);

    render(<ClientsPage />);

    expect(
      await screen.findByText("Aucun client pour le moment"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Créer un client" }),
    ).toHaveAttribute("href", "/clients/new");
  });

  it("surfaces an API error message", async () => {
    const { ApiError } = await import("@/lib/api");
    mockedGet.mockRejectedValue(new ApiError(500, "Erreur serveur"));

    render(<ClientsPage />);

    expect(await screen.findByText("Erreur serveur")).toBeInTheDocument();
  });
});
