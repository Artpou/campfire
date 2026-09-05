import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Predictable fallback for local/test only — never accept as a configured production secret. */
const DEV_INSECURE_STORAGE_ENCRYPTION_KEY = "dev-only-insecure-storage-encryption-key";

function requireEncryptionSecret(): string {
  const secret = process.env.STORAGE_ENCRYPTION_KEY?.trim();

  if (secret === DEV_INSECURE_STORAGE_ENCRYPTION_KEY) {
    throw new Error("STORAGE_ENCRYPTION_KEY must not use the built-in insecure default. Generate a random secret.");
  }

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("STORAGE_ENCRYPTION_KEY environment variable is required in production");
  }

  return DEV_INSECURE_STORAGE_ENCRYPTION_KEY;
}

function deriveKey(): Buffer {
  return crypto.scryptSync(requireEncryptionSecret(), "seedarr-storage-salt", 32);
}

/** HMAC-SHA256 signed token (`payload.sig`, base64url). Reuses STORAGE_ENCRYPTION_KEY. */
export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString(
    "base64url",
  );
  const sig = crypto.createHmac("sha256", requireEncryptionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", requireEncryptionSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = deriveKey();
  const buf = Buffer.from(ciphertext, "base64");

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final("utf8");
}
