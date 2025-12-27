import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash a password with scrypt and a random salt
 * Returns format: "salt:hash"
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedHashBuffer = scryptSync(password, salt, 64);

  return timingSafeEqual(hashBuffer, suppliedHashBuffer);
}
