import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(input: Buffer) {
  let bits = "";
  for (const byte of input) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) output += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  return output;
}

export function decodeBase32(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of clean) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("Invalid base32 input");
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function generateTotp(secret: string, time = Date.now(), step = 30) {
  const counter = BigInt(Math.floor(time / 1000 / step));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary = ((digest[offset]! & 127) << 24) | ((digest[offset + 1]! & 255) << 16) | ((digest[offset + 2]! & 255) << 8) | (digest[offset + 3]! & 255);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, time = Date.now()) {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  return [-1, 0, 1].some((window) => {
    const expected = generateTotp(secret, time + window * 30_000);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
  });
}

function encryptionKey() {
  return createHash("sha256").update(process.env.MFA_ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || "local-mfa-encryption-key").digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Encrypted secret is malformed");
  const iv = Buffer.from(parts[0]!, "base64url");
  const tag = Buffer.from(parts[1]!, "base64url");
  const encrypted = Buffer.from(parts[2]!, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function recoveryHash(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  return createHash("sha256").update(`${process.env.MFA_RECOVERY_PEPPER || process.env.JWT_ACCESS_SECRET || "local-recovery-pepper"}:${normalized}`).digest("hex");
}

export function generateRecoveryCode() {
  const raw = encodeBase32(randomBytes(8)).slice(0, 12);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
