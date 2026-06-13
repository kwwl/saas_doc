/**
 * Smoke test for the client creation page.
 *
 * Mocks `next/navigation` (router) and `api.post` to verify the full happy
 * path: fill name → submit → POST /clients with normalized payload →
 * redirect to the new client's detail page.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Client } from "@/lib/types";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, post: vi.fn() },
  };
});

import { api } from "@/lib/api";
import NewClientPage from "./page";

const mockedPost = vi.mocked(api.post);

const created: Client = {
  id: "client-9",
  name: "Acme SARL",
  siren: null,
  contact_email: null,
  contact_phone: null,
  organization_id: "org-1",
  created_at: "2026-06-12T10:00:00Z",
};

beforeEach(() => {
  mockedPost.mockReset();
  pushMock.mockReset();
});

describe("NewClientPage", () => {
  it("creates a client and redirects to its detail page", async () => {
    mockedPost.mockResolvedValue(created);

    render(<NewClientPage />);

    fireEvent.change(screen.getByLabelText("Nom *"), {
      target: { value: "Acme SARL" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Créer le client" }),
    );

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    expect(mockedPost).toHaveBeenCalledWith("/clients", {
      name: "Acme SARL",
      siren: null,
      contact_email: null,
      contact_phone: null,
    });
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/clients/client-9"),
    );
  });

  it("does not call the API when validation fails", async () => {
    render(<NewClientPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Créer le client" }),
    );

    expect(await screen.findByText("Nom requis")).toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
