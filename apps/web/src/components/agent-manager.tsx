"use client";

import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { apiSend, useApi } from "@/lib/portal-api";

type Organization = { id: string; name: string; accountNumber: string };
type Agent = {
  id: string;
  code: string;
  active: boolean;
  user: { email: string; firstName: string; lastName: string };
  assignments: Array<{ active: boolean; organization: Organization }>;
};

export function AgentManager() {
  const agents = useApi<{ data: Agent[] }>("/agents");
  const organizations = useApi<{ data: Organization[] }>("/organizations");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await apiSend("/agents", "POST", Object.fromEntries(data));
    form.reset();
    await agents.reload();
  }
  async function assign(
    event: React.FormEvent<HTMLFormElement>,
    agentId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const organizationId = String(new FormData(form).get("organizationId"));
    await apiSend(`/agents/${agentId}/assignments`, "POST", { organizationId });
    await agents.reload();
  }
  async function unassign(agentId: string, organizationId: string) {
    await apiSend(`/agents/${agentId}/assignments/${organizationId}`, "DELETE");
    await agents.reload();
  }
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Sales agents"
        description="Create secure agent accounts and control customer assignments."
      />
      <form
        onSubmit={create}
        className="grid gap-3 border-b border-ink/10 p-6 sm:grid-cols-3"
      >
        <input
          className="field"
          name="firstName"
          placeholder="First name"
          required
        />
        <input
          className="field"
          name="lastName"
          placeholder="Last name"
          required
        />
        <input
          className="field"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <input
          className="field"
          name="code"
          placeholder="Agent code"
          required
        />
        <input
          className="field"
          name="password"
          type="password"
          minLength={12}
          placeholder="Temporary password"
          required
        />
        <Button type="submit">
          <UserPlus className="size-4" /> Create agent
        </Button>
      </form>
      {agents.loading ? (
        <LoadingRow />
      ) : agents.error ? (
        <ErrorRow message={agents.error} />
      ) : !agents.data?.data.length ? (
        <EmptyRow message="No agents yet." />
      ) : (
        <div>
          {agents.data.data.map((agent) => (
            <article key={agent.id} className="border-b border-ink/[.06] p-6">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="font-semibold">
                    {agent.user.firstName} {agent.user.lastName}{" "}
                    <span className="text-xs text-ink/40">({agent.code})</span>
                  </h3>
                  <p className="mt-1 text-xs text-ink/45">{agent.user.email}</p>
                </div>
                <form
                  onSubmit={(event) => void assign(event, agent.id)}
                  className="flex gap-2"
                >
                  <select
                    className="field min-w-48"
                    name="organizationId"
                    required
                  >
                    <option value="">Assign customer…</option>
                    {organizations.data?.data.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm">
                    Assign
                  </Button>
                </form>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.assignments
                  .filter((item) => item.active)
                  .map(({ organization }) => (
                    <span
                      key={organization.id}
                      className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-xs"
                    >
                      {organization.name}
                      <button
                        aria-label={`Unassign ${organization.name}`}
                        onClick={() => void unassign(agent.id, organization.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
