import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CsrfGuard } from "./csrf.guard";

function context(request: object) {
  return { getHandler: vi.fn(), getClass: vi.fn(), switchToHttp: () => ({ getRequest: () => request }) } as never;
}

describe("CsrfGuard", () => {
  it("allows safe methods", () => {
    const guard = new CsrfGuard({ getAllAndOverride: vi.fn().mockReturnValue(false) } as never);
    expect(guard.canActivate(context({ method: "GET", cookies: { gj_access: "access" }, headers: {} }))).toBe(true);
  });

  it("requires matching double-submit tokens for cookie-authenticated mutations", () => {
    const guard = new CsrfGuard({ getAllAndOverride: vi.fn().mockReturnValue(false) } as never);
    expect(() => guard.canActivate(context({ method: "PATCH", cookies: { gj_access: "access", gj_csrf: "correct-token" }, headers: {} }))).toThrow(ForbiddenException);
    expect(guard.canActivate(context({ method: "PATCH", cookies: { gj_access: "access", gj_csrf: "correct-token" }, headers: { "x-csrf-token": "correct-token" } }))).toBe(true);
  });

  it("does not require CSRF for bearer-only clients", () => {
    const guard = new CsrfGuard({ getAllAndOverride: vi.fn().mockReturnValue(false) } as never);
    expect(guard.canActivate(context({ method: "POST", cookies: {}, headers: { authorization: "Bearer token" } }))).toBe(true);
  });
});
