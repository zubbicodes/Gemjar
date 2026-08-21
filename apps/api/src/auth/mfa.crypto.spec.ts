import { describe, expect, it } from "vitest";
import { decodeBase32, decryptSecret, encodeBase32, encryptSecret, generateTotp, verifyTotp } from "./mfa.crypto";

describe("MFA cryptography", () => {
  it("round-trips base32 and encrypted secrets", () => {
    const source = Buffer.from("Gemjar MFA secret");
    const encoded = encodeBase32(source);
    expect(decodeBase32(encoded)).toEqual(source);
    expect(decryptSecret(encryptSecret(encoded))).toBe(encoded);
  });

  it("matches the RFC 6238 SHA1 value after truncating to six digits", () => {
    const secret = encodeBase32(Buffer.from("12345678901234567890"));
    expect(generateTotp(secret, 59_000)).toBe("287082");
    expect(verifyTotp(secret, "287082", 59_000)).toBe(true);
    expect(verifyTotp(secret, "000000", 59_000)).toBe(false);
  });
});
