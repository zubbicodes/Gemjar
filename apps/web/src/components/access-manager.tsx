"use client";
import { Button } from "@/components/ui/button";
import {
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { apiSend, useApi } from "@/lib/portal-api";
type Permission = { id: string; resource: string; action: string };
type Role = {
  id: string;
  name: string;
  permissions: Array<{ permission: Permission }>;
  _count: { users: number };
};
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{ role: Role }>;
};
export function AccessManager() {
  const view = useApi<{
    roles: Role[];
    permissions: Permission[];
    users: User[];
  }>("/admin/access");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await apiSend("/admin/access/roles", "POST", {
      name: data.get("name"),
      description: data.get("description"),
      permissionIds: data.getAll("permissionIds"),
    });
    form.reset();
    await view.reload();
  }
  async function assign(
    event: React.FormEvent<HTMLFormElement>,
    userId: string,
  ) {
    event.preventDefault();
    const roleId = String(new FormData(event.currentTarget).get("roleId"));
    await apiSend(`/admin/access/users/${userId}/roles`, "POST", { roleId });
    await view.reload();
  }
  if (view.loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (view.error || !view.data)
    return (
      <section className="surface">
        <ErrorRow message={view.error || "Access data unavailable"} />
      </section>
    );
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Roles and access"
        description="Server-enforced permissions for staff."
      />
      <form onSubmit={create} className="border-b border-ink/10 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="field"
            name="name"
            placeholder="Role name"
            required
          />
          <input
            className="field"
            name="description"
            placeholder="Description"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {view.data.permissions.map((permission) => (
            <label key={permission.id} className="text-xs">
              <input
                className="mr-2"
                type="checkbox"
                name="permissionIds"
                value={permission.id}
              />
              {permission.resource}:{permission.action}
            </label>
          ))}
        </div>
        <Button className="mt-4" type="submit">
          Create role
        </Button>
      </form>
      <div>
        {view.data.users.map((user) => (
          <article key={user.id} className="border-b border-ink/[.06] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-ink/45">
                  {user.email} ·{" "}
                  {user.roles.map(({ role }) => role.name).join(", ") ||
                    "No role"}
                </p>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => void assign(event, user.id)}
              >
                <select className="field" name="roleId" required>
                  <option value="">Choose role…</option>
                  {view.data!.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" type="submit">
                  Assign
                </Button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
