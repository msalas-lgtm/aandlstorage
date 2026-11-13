import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Passwords are stored as "scrypt$<salt>$<hash>" (salted, slow to guess). Plain passwords are never stored.
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

// A fixed hash lets us do the same work when a username doesn't exist, so response time doesn't reveal it.
const DUMMY = hashPassword("not-a-real-password");

export function verifyPassword(password: string, stored: string | undefined) {
  const [scheme, salt, hash] = (stored ?? DUMMY).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual) && stored !== undefined;
}

export function passwordProblem(password: string) {
  if (password.length < 8) return "Passwords must be at least 8 characters.";
  if (password.length > 100) return "That password is too long.";
  return null;
}
