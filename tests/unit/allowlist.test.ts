import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeEmail } from "@/lib/auth/allowlist";
import { verifyNeonWebhook, type Jwks } from "@/lib/auth/webhook-signature";

describe("normalizeEmail (AC-3)", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Jo@Example.COM \n")).toBe("jo@example.com");
    expect(normalizeEmail("jo@example.com")).toBe("jo@example.com");
  });
});

// Signs a body the way Neon Auth does: an Ed25519 detached JWS over
// base64url(timestamp + "." + base64url(body)).
function neonSigner(kid = "key-1") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwks: Jwks = { keys: [{ ...(publicKey.export({ format: "jwk" }) as JsonWebKey), kid }] };
  const signBody = (body: string, timestamp: string, alg = "EdDSA") => {
    const header = Buffer.from(JSON.stringify({ alg, typ: "JWS", kid })).toString("base64url");
    const payload = Buffer.from(`${timestamp}.${Buffer.from(body).toString("base64url")}`).toString("base64url");
    const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
    return new Headers({
      "x-neon-signature": `${header}..${signature}`,
      "x-neon-signature-kid": kid,
      "x-neon-timestamp": timestamp,
    });
  };
  return { jwks, signBody };
}

describe("verifyNeonWebhook", () => {
  const body = JSON.stringify({ event_type: "user.before_create", user: { email: "jo@example.com" } });
  const now = 1_763_500_000_000;

  it("accepts a correctly signed, fresh request", async () => {
    const { jwks, signBody } = neonSigner();
    const headers = signBody(body, String(now - 1000));
    expect(await verifyNeonWebhook(body, headers, { getJwks: async () => jwks, now })).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const { jwks, signBody } = neonSigner();
    const headers = signBody(body, String(now));
    const tampered = body.replace("jo@", "eve@");
    expect(await verifyNeonWebhook(tampered, headers, { getJwks: async () => jwks, now })).toBe(false);
  });

  it("rejects a signature from another key", async () => {
    const signer = neonSigner("key-1");
    const other = neonSigner("key-1");
    const headers = other.signBody(body, String(now));
    expect(await verifyNeonWebhook(body, headers, { getJwks: async () => signer.jwks, now })).toBe(false);
  });

  it("rejects an unknown key ID, a stale timestamp, a non-EdDSA header, and missing headers", async () => {
    const { jwks, signBody } = neonSigner("key-1");
    const opts = { getJwks: async () => jwks, now };

    const unknownKid = signBody(body, String(now));
    unknownKid.set("x-neon-signature-kid", "key-2");
    expect(await verifyNeonWebhook(body, unknownKid, opts)).toBe(false);

    const stale = signBody(body, String(now - 6 * 60 * 1000));
    expect(await verifyNeonWebhook(body, stale, opts)).toBe(false);

    const hs256 = signBody(body, String(now), "HS256");
    expect(await verifyNeonWebhook(body, hs256, opts)).toBe(false);

    expect(await verifyNeonWebhook(body, new Headers(), opts)).toBe(false);
  });

  it("refetches the JWKS once when the key ID is unknown (key rotation)", async () => {
    const old = neonSigner("old");
    const rotated = neonSigner("new");
    let calls = 0;
    const getJwks = async (refresh: boolean) => {
      calls++;
      return refresh ? rotated.jwks : old.jwks;
    };
    const headers = rotated.signBody(body, String(now));
    expect(await verifyNeonWebhook(body, headers, { getJwks, now })).toBe(true);
    expect(calls).toBe(2);
  });
});
