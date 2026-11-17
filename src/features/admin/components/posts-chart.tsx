"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function PostsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="postsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) =>
              new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            className="text-muted-foreground"
          />
          <Tooltip
            labelFormatter={(value) =>
              new Date(String(value)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
            contentStyle={{
              backgroundColor: "var(--popover)",
              borderColor: "var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="currentColor"
            strokeWidth={2}
            fill="url(#postsFill)"
            className="text-foreground"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
