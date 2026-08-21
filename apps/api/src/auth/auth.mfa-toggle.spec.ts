import { UserKind } from "@prisma/client";
import * as argon2 from "argon2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService, mfaEnforced } from "./auth.service";

const password = "GemjarDemo!2026";

function service(overrides: { mfa?: object } = {}) {
  const user = {
    id: "user-1",
    email: "admin@gemjar.test",
    firstName: "Amara",
    lastName: "Morgan",
    kind: UserKind.ADMIN,
    mfaRequired: true,
    emailVerifiedAt: new Date(),
    passwordHash: "",
    roles: [],
  };
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
    session: { create: vi.fn().mockResolvedValue({ id: "session-1" }) },
  };
  const mfa = {
    hasVerifiedFactor: vi.fn().mockResolvedValue(true),
    issueChallenge: vi.fn().mockResolvedValue("challenge-token"),
    ...overrides.mfa,
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue("access-token") };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return {
    auth: new AuthService(
      jwt as never,
      prisma as never,
      mfa as never,
      audit as never,
    ),
    mfa,
    user,
  };
}

describe("MFA enforcement toggle", () => {
  const original = process.env.AUTH_MFA_ENABLED;

  beforeEach(async () => {
    delete process.env.AUTH_MFA_ENABLED;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_MFA_ENABLED;
    else process.env.AUTH_MFA_ENABLED = original;
  });

  it("enforces MFA when AUTH_MFA_ENABLED is unset", () => {
    expect(mfaEnforced()).toBe(true);
  });

  it("enforces MFA for any value other than false", () => {
    process.env.AUTH_MFA_ENABLED = "true";
    expect(mfaEnforced()).toBe(true);
    process.env.AUTH_MFA_ENABLED = "yes";
    expect(mfaEnforced()).toBe(true);
  });

  it("disables MFA only for an explicit false", () => {
    process.env.AUTH_MFA_ENABLED = "false";
    expect(mfaEnforced()).toBe(false);
    process.env.AUTH_MFA_ENABLED = " FALSE ";
    expect(mfaEnforced()).toBe(false);
  });

  it("challenges an administrator while enforcement is on", async () => {
    const { auth, mfa, user } = service();
    user.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const result = await auth.login(user.email, password);
    expect(result.state).toBe("MFA_REQUIRED");
    expect(mfa.issueChallenge).toHaveBeenCalled();
  });

  it("signs an administrator straight in while enforcement is off", async () => {
    process.env.AUTH_MFA_ENABLED = "false";
    const { auth, mfa, user } = service();
    user.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const result = await auth.login(user.email, password);
    expect(result.state).toBe("AUTHENTICATED");
    expect(mfa.issueChallenge).not.toHaveBeenCalled();
  });
});
