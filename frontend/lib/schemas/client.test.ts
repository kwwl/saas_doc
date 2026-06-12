/**
 * Tests for the client form schema and the form → API payload conversion.
 */
import { describe, expect, it } from "vitest";
import { clientSchema, toClientPayload } from "./client";

describe("clientSchema", () => {
  it("accepts a minimal valid client (name only)", () => {
    const result = clientSchema.safeParse({ name: "Dupont SARL" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = clientSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nom requis");
    }
  });

  it("rejects a name longer than 255 chars", () => {
    const result = clientSchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("accepts a valid 9-digit SIREN", () => {
    const result = clientSchema.safeParse({
      name: "Dupont SARL",
      siren: "123456789",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty SIREN string", () => {
    const result = clientSchema.safeParse({ name: "Dupont SARL", siren: "" });
    expect(result.success).toBe(true);
  });

  it.each(["12345678", "1234567890", "12345678a", "ABCDEFGHI"])(
    "rejects invalid SIREN %s",
    (siren) => {
      const result = clientSchema.safeParse({ name: "Dupont SARL", siren });
      expect(result.success).toBe(false);
    },
  );

  it("accepts a valid contact email", () => {
    const result = clientSchema.safeParse({
      name: "Dupont SARL",
      contact_email: "contact@dupont.fr",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty contact email string", () => {
    const result = clientSchema.safeParse({
      name: "Dupont SARL",
      contact_email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid contact email", () => {
    const result = clientSchema.safeParse({
      name: "Dupont SARL",
      contact_email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a phone longer than 32 chars", () => {
    const result = clientSchema.safeParse({
      name: "Dupont SARL",
      contact_phone: "0".repeat(33),
    });
    expect(result.success).toBe(false);
  });
});

describe("toClientPayload", () => {
  it("converts empty optional strings to null", () => {
    expect(
      toClientPayload({
        name: "Dupont SARL",
        siren: "",
        contact_email: "",
        contact_phone: "",
      }),
    ).toEqual({
      name: "Dupont SARL",
      siren: null,
      contact_email: null,
      contact_phone: null,
    });
  });

  it("converts undefined optional fields to null", () => {
    expect(toClientPayload({ name: "Dupont SARL" })).toEqual({
      name: "Dupont SARL",
      siren: null,
      contact_email: null,
      contact_phone: null,
    });
  });

  it("keeps provided values and trims whitespace", () => {
    expect(
      toClientPayload({
        name: "  Dupont SARL  ",
        siren: "123456789",
        contact_email: " contact@dupont.fr ",
        contact_phone: "+33123456789",
      }),
    ).toEqual({
      name: "Dupont SARL",
      siren: "123456789",
      contact_email: "contact@dupont.fr",
      contact_phone: "+33123456789",
    });
  });

  it("converts whitespace-only optional fields to null", () => {
    expect(
      toClientPayload({ name: "Dupont SARL", siren: "   " }).siren,
    ).toBeNull();
  });
});
