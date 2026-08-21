import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "gemjar:is-public";
export const PERMISSIONS_KEY = "gemjar:permissions";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
