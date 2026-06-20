import { createFileRoute } from "@tanstack/react-router";
import { runAgentHook } from "@/lib/agent-workers.server";

export const Route = createFileRoute("/api/public/hooks/agents/cto")({
  server: {
    handlers: {
      POST: async ({ request }) => runAgentHook(request, "cto"),
      GET: async () => new Response(JSON.stringify({ ok: true, agent: "cto", hint: "POST with x-cron-secret" }), { headers: { "Content-Type": "application/json" } }),
    },
  },
});
