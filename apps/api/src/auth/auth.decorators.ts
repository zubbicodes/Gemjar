import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "gemjar:is-public";
export const OPTIONAL_AUTH_KEY = "gemjar:optional-auth";
export const PERMISSIONS_KEY = "gemjar:permissions";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
