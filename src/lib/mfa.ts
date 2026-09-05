import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { TOTP, Secret } from "otpauth";
function key() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error("A strong AUTH_SECRET is required");
  return createHash("sha256").update(process.env.AUTH_SECRET).digest();
}
export function encryptMfa(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString("base64url")).join(".");
}
export function decryptMfa(value: string) {
  const [iv, tag, data] = value.split(".").map(v => Buffer.from(v, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
export function createTotp(secret: string, email = "ZeitTrack") {
  return new TOTP({ issuer: "ZeitTrack", label: email, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) });
}
export function validMfaStep(secret: string, token: string, now = Date.now()) {
  if (!/^\d{6}$/.test(token)) return null;
  const delta = createTotp(secret).validate({ token, timestamp: now, window: 1 });
  return delta === null ? null : Math.floor(now / 30000) + delta;
}
