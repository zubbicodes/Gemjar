"use client";

import {
  Award,
  BarChart3,
  Crown,
  Medal,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";
import {
  EmptyRow,
  ErrorRow,
  LoadingRow,
  PanelHeading,
} from "@/components/portal-primitives";
import { useApi } from "@/lib/portal-api";

// Categorical order from the validated default palette (dataviz skill):
// fixed hue order, never cycled or reassigned by rank.
const CHANNEL_COLOR: Record<string, string> = {
  B2C: "#2a78d6",
  B2B: "#eb6834",
  SALES_AGENT: "#1baf7a",
  ADMIN: "#4a3aa7",
};
const ACCENT = "#2a78d6";
const GOLD = "#eda100";
const GRID = "rgba(68,68,68,0.08)";
const AXIS_TEXT = "rgba(68,68,68,0.55)";

type Breakdown = {
  channels: Array<{ channel: string; orders: number; revenueMinor: number }>;
  topProducts: Array<{
    sku: string;
    name: string;
    quantity: number;
    revenueMinor: number;
  }>;
  topCustomers: Array<{
    organization?: { name: string; accountNumber: string } | null;
    orders: number;
    revenueMinor: number;
  }>;
  agents: Array<{
    agentId: string;
    code?: string | null;
    name?: string | null;
    orders: number;
    revenueMinor: number;
  }>;
};
type Agent = {
  id: string;
  code: string;
  active: boolean;
  user: { email: string; firstName: string; lastName: string };
  assignments: Array<{ active: boolean }>;
};
type Audit = {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { email: string; firstName: string; lastName: string } | null;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-[11px] shadow-lg">
      <p className="font-bold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-0.5 flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.name}: {formatMoney(entry.value)}
        </p>
      ))}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-5">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl"
        style={{ background: `${tint}1a`, color: tint }}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-ink/45">
          {label}
        </p>
        <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

export function AnalyticsReport() {
  const view = useApi<Breakdown>("/admin/analytics/breakdown");
  const agentsView = useApi<{ data: Agent[] }>("/agents");
  if (view.loading)
    return (
      <section className="surface">
        <LoadingRow />
      </section>
    );
  if (view.error)
    return (
      <section className="surface">
        <ErrorRow message={view.error} />
      </section>
    );
  const data = view.data!;

  const totalRevenue = data.channels.reduce(
    (sum, row) => sum + row.revenueMinor,
    0,
  );
  const totalOrders = data.channels.reduce((sum, row) => sum + row.orders, 0);
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const activeAgentCount =
    agentsView.data?.data.filter((agent) => agent.active).length ?? 0;

  const channelData = data.channels.map((row) => ({
    name: row.channel.replace("_", " "),
    revenue: row.revenueMinor,
    orders: row.orders,
    color: CHANNEL_COLOR[row.channel] ?? ACCENT,
  }));

  const agentRows = [...data.agents]
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .map((row) => {
      const agent = agentsView.data?.data.find((a) => a.id === row.agentId);
      const customers =
        agent?.assignments.filter((a) => a.active).length ?? 0;
      return {
        ...row,
        displayName: row.name ?? row.code ?? "Unassigned",
        customers,
        avgOrderValue: row.orders ? Math.round(row.revenueMinor / row.orders) : 0,
      };
    });
  const agentChartData = agentRows.slice(0, 8).map((row, index) => ({
    name: row.displayName,
    revenue: row.revenueMinor,
    color: index === 0 ? GOLD : ACCENT,
  }));

  const medal = [Crown, Medal, Award];

  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Commerce analytics"
        description="Revenue, product, customer, and agent performance from live orders."
      />

      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={TrendingUp}
          label="Total revenue"
          value={formatMoney(totalRevenue)}
          tint="#2a78d6"
        />
        <StatTile
          icon={ShoppingBag}
          label="Total orders"
          value={totalOrders.toLocaleString("en-GB")}
          tint="#1baf7a"
        />
        <StatTile
          icon={Receipt}
          label="Average order value"
          value={formatMoney(avgOrderValue)}
          tint="#eb6834"
        />
        <StatTile
          icon={UsersRound}
          label="Active sales agents"
          value={activeAgentCount.toLocaleString("en-GB")}
          tint="#4a3aa7"
        />
      </div>

      <div className="grid gap-6 border-t border-ink/10 p-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-ink/40" />
            <h3 className="text-sm font-bold">Revenue by channel</h3>
          </div>
          {!channelData.length ? (
            <EmptyRow message="No orders yet." />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: AXIS_TEXT }}
                    axisLine={{ stroke: GRID }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: AXIS_TEXT }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatMoney(value)}
                    width={64}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(68,68,68,0.04)" }} />
                  <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                    {channelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {channelData.map((entry) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/55">
                <span className="size-2 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 p-5">
          <div className="flex items-center gap-2">
            <Percent className="size-4 text-ink/40" />
            <h3 className="text-sm font-bold">Top products by revenue</h3>
          </div>
          {!data.topProducts.length ? (
            <EmptyRow message="No product sales yet." />
          ) : (
            <div className="mt-4" style={{ height: Math.max(160, data.topProducts.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data.topProducts.map((row) => ({
                    name: row.name.length > 22 ? `${row.name.slice(0, 22)}…` : row.name,
                    revenue: row.revenueMinor,
                  }))}
                  margin={{ left: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: AXIS_TEXT }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatMoney(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: AXIS_TEXT }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(68,68,68,0.04)" }} />
                  <Bar dataKey="revenue" name="Revenue" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ink/10 p-6">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-ink/40" />
          <h3 className="text-sm font-bold">Agent performance</h3>
        </div>
        <p className="mt-1 text-[11px] text-ink/45">
          Ranked by revenue on live orders. Highest performer highlighted in gold.
        </p>
        {!agentRows.length ? (
          <EmptyRow message="No agent-attributed orders yet." />
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div style={{ height: Math.max(180, agentChartData.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={agentChartData}
                  margin={{ left: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: AXIS_TEXT }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatMoney(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: AXIS_TEXT }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(68,68,68,0.04)" }} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                    {agentChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {agentRows.slice(0, 6).map((row, index) => {
                const Medallion = medal[index];
                return (
                  <li
                    key={row.agentId ?? row.displayName}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      index === 0
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-ink/10 bg-white"
                    }`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-amber-400 text-white"
                          : "bg-mist text-ink/60"
                      }`}
                    >
                      {Medallion ? <Medallion className="size-4" /> : `#${index + 1}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{row.displayName}</p>
                      <p className="text-[10px] text-ink/45">
                        {row.customers} customer{row.customers === 1 ? "" : "s"} · {row.orders} order
                        {row.orders === 1 ? "" : "s"} · avg {formatMoney(row.avgOrderValue)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums">
                      {formatMoney(row.revenueMinor)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-ink/10 p-6">
        <div className="flex items-center gap-2">
          <UsersRound className="size-4 text-ink/40" />
          <h3 className="text-sm font-bold">Top customers</h3>
        </div>
        {!data.topCustomers.length ? (
          <EmptyRow message="No customer orders yet." />
        ) : (
          <div className="mt-4" style={{ height: Math.max(140, data.topCustomers.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.topCustomers.map((row) => ({
                  name: row.organization?.name ?? "Unknown",
                  revenue: row.revenueMinor,
                }))}
                margin={{ left: 0 }}
              >
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: AXIS_TEXT }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatMoney(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: AXIS_TEXT }}
                  axisLine={false}
                  tickLine={false}
                  width={160}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(68,68,68,0.04)" }} />
                <Bar dataKey="revenue" name="Revenue" fill="#1baf7a" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {!agentsView.error ? null : (
        <div className="border-t border-ink/10">
          <ErrorRow message={agentsView.error} />
        </div>
      )}
    </section>
  );
}

export function AuditReport() {
  const view = useApi<{ data: Audit[] }>("/admin/audit?limit=250");
  return (
    <section className="surface overflow-hidden">
      <PanelHeading
        title="Audit trail"
        description="Privileged and commercial changes, newest first."
      />
      {view.loading ? (
        <LoadingRow />
      ) : view.error ? (
        <ErrorRow message={view.error} />
      ) : !view.data?.data.length ? (
        <EmptyRow message="No audit events yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-ink/[.025] text-[10px] uppercase tracking-wider text-ink/40">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Event</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Actor</th>
              </tr>
            </thead>
            <tbody>
              {view.data.data.map((item) => (
                <tr key={item.id} className="border-t border-ink/[.06]">
                  <td className="p-4">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold">{item.event}</td>
                  <td className="p-4">
                    {item.entityType} · {item.entityId}
                  </td>
                  <td className="p-4">{item.actor?.email ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
