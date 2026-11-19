// Verifies Neon Auth webhook signatures: an Ed25519 detached JWS
// (`header..signature`) over base64url(timestamp + "." + base64url(body)),
// with the public key from the branch's JWKS. See Neon's webhooks guide.
import { createPublicKey, verify } from "node:crypto";

export type Jwks = { keys: (JsonWebKey & { kid?: string })[] };

type VerifyOptions = {
  /** Returns the JWKS; `refresh` asks for a fresh copy (unknown key ID). */
  getJwks: (refresh: boolean) => Promise<Jwks>;
  now?: number;
  maxAgeMs?: number;
};

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

/** True only for a correctly signed, fresh request. Never throws. */
export async function verifyNeonWebhook(
  rawBody: string,
  headers: Headers,
  { getJwks, now = Date.now(), maxAgeMs = 5 * 60 * 1000 }: VerifyOptions,
): Promise<boolean> {
  try {
    const signature = headers.get("x-neon-signature");
    const kid = headers.get("x-neon-signature-kid");
    const timestamp = headers.get("x-neon-timestamp");
    if (!signature || !kid || !timestamp || !/^\d+$/.test(timestamp)) return false;
    if (Math.abs(now - Number(timestamp)) > maxAgeMs) return false;

    const [headerB64, payload, signatureB64, ...rest] = signature.split(".");
    if (payload !== "" || !headerB64 || !signatureB64 || rest.length) return false;
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    if (header?.alg !== "EdDSA") return false;

    let jwk = (await getJwks(false)).keys.find((k) => k.kid === kid);
    jwk ??= (await getJwks(true)).keys.find((k) => k.kid === kid);
    if (!jwk) return false;

    const signingInput = `${headerB64}.${b64url(`${timestamp}.${b64url(rawBody)}`)}`;
    const key = createPublicKey({ key: jwk, format: "jwk" });
    if (key.asymmetricKeyType !== "ed25519") return false;
    return verify(null, Buffer.from(signingInput), key, Buffer.from(signatureB64, "base64url"));
  } catch {
    return false;
  }
}

/** Fetches and caches a JWKS, refreshing at most once a minute. */
export function jwksFetcher(url: string): (refresh: boolean) => Promise<Jwks> {
  let cached: Jwks | null = null;
  let fetchedAt = 0;
  return async (refresh) => {
    if (cached && !(refresh && Date.now() - fetchedAt > 60_000)) return cached;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    cached = (await res.json()) as Jwks;
    fetchedAt = Date.now();
    return cached;
  };
}
