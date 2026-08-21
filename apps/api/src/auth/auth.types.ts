export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kind: "CONSUMER" | "B2B" | "AGENT" | "ADMIN";
  permissions: string[];
};

export type AccessPayload = {
  sub: string;
  kind: AuthenticatedUser["kind"];
  permissions: string[];
};
