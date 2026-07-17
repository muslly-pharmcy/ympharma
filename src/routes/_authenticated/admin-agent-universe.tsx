import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { universeStats } from "@/lib/ai-universe.functions";
import { listPendingApprovals, decideApproval } from "@/lib/approvals.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin-agent-universe")({
  head: () => ({
    meta: [
      { title: "🤖 Agent Universe — الكون الوكلائي" },
      {
        name: "description",
        content: "مراقبة وكلاء الذكاء الاصطناعي والأدوات والاتصالات مع العالم.",
      },
    ],
  }),
  component: UniversePage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-red-500">تعذر التحميل: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function UniversePage() {
  const fetchStats = useServerFn(universeStats);
  const q = useSuspenseQuery({
    queryKey: ["universe", "stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 20_000,
  });

  const { permissions, actions, world } = q.data;

  const permsByAgent = new Map<string, string[]>();
  for (const p of permissions) {
    const list = permsByAgent.get(p.agent_name) ?? [];
    list.push(p.permission);
    permsByAgent.set(p.agent_name, list);
  }

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-teal-400">🌌 Agent Universe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          الوكلاء · الأدوات · اتصالات العالم · الموافقات — Phases 3, 4, 5 + Wave A
        </p>
      </header>

      <Tabs defaultValue="agents" dir="rtl">
        <TabsList>
          <TabsTrigger value="agents">الوكلاء ({permsByAgent.size})</TabsTrigger>
          <TabsTrigger value="world">صحة العالم</TabsTrigger>
          <TabsTrigger value="actions">آخر التنفيذات ({actions.length})</TabsTrigger>
          <TabsTrigger value="approvals">🛡 الموافقات</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <section className="rounded-lg border border-teal-900/50 bg-black/40 p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(permsByAgent.entries()).map(([agent, perms]) => (
                <div key={agent} className="rounded-md border border-teal-900/30 p-3 bg-slate-950/50">
                  <div className="font-mono text-sm text-teal-300">{agent}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <span key={p} className="text-xs bg-teal-900/30 text-teal-200 px-2 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="world">
          <section className="rounded-lg border border-teal-900/50 bg-black/40 p-5">
            {world.length === 0 ? (
              <p className="text-sm text-muted-foreground">لم يتم تشغيل فحص الصحة بعد.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-right text-muted-foreground">
                  <tr>
                    <th className="py-2">النظام</th>
                    <th>الحالة</th>
                    <th>آخر فحص</th>
                  </tr>
                </thead>
                <tbody>
                  {world.map((w) => (
                    <tr key={w.system_name} className="border-t border-teal-900/20">
                      <td className="py-2 font-mono">{w.system_name}</td>
                      <td>
                        <span
                          className={
                            w.status === "online"
                              ? "text-emerald-400"
                              : w.status === "degraded"
                                ? "text-amber-400"
                                : "text-red-400"
                          }
                        >
                          ● {w.status}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(w.checked_at).toLocaleString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </TabsContent>

        <TabsContent value="actions">
          <section className="rounded-lg border border-teal-900/50 bg-black/40 p-5">
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا يوجد أي تنفيذ حتى الآن.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-right text-muted-foreground">
                    <tr>
                      <th className="py-2">الوكيل</th>
                      <th>الأداة</th>
                      <th>الحالة</th>
                      <th>موافقة؟</th>
                      <th>الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((a) => (
                      <tr key={a.id} className="border-t border-teal-900/20">
                        <td className="py-2 font-mono text-xs text-teal-300">{a.agent_name}</td>
                        <td className="font-mono text-xs">{a.tool_name}</td>
                        <td>
                          <span
                            className={
                              a.status === "completed"
                                ? "text-emerald-400"
                                : a.status === "pending_approval"
                                  ? "text-amber-400"
                                  : "text-red-400"
                            }
                          >
                            {a.status}
                          </span>
                        </td>
                        <td>{a.requires_approval ? "نعم" : "—"}</td>
                        <td className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("ar-EG")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalsPanel() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listPendingApprovals);
  const decide = useServerFn(decideApproval);
  const [note, setNote] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => fetchList(),
    refetchInterval: 15_000,
  });

  const mut = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) =>
      decide({ data: { id: input.id, decision: input.decision, note: note[input.id] } }),
    onSuccess: (_, vars) => {
      toast.success(vars.decision === "approved" ? "تمت الموافقة" : "تم الرفض");
      qc.invalidateQueries({ queryKey: ["approvals", "pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-lg border border-amber-900/50 bg-black/40 p-5">
      <p className="text-xs text-muted-foreground mb-3">
        كل إجراء تنفيذي لأي وكيل ذكاء اصطناعي يمر من هنا قبل التنفيذ.
      </p>
      {list.isLoading ? (
        <p className="text-muted-foreground">…</p>
      ) : list.error ? (
        <p className="text-red-500">{(list.error as Error).message}</p>
      ) : (list.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد طلبات معلّقة.</p>
      ) : (
        <ul className="space-y-3">
          {list.data!.map((r) => (
            <li key={r.id} className="rounded-md border border-amber-900/30 p-3 bg-slate-950/50">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{r.action_type}</Badge>
                <span className="text-xs font-mono text-teal-300">{r.agent_id}</span>
                {typeof r.ai_confidence === "number" && (
                  <span className="text-xs text-muted-foreground">
                    ثقة: {(r.ai_confidence * 100).toFixed(0)}%
                  </span>
                )}
                {typeof r.ai_risk_score === "number" && (
                  <span className="text-xs text-red-400">مخاطرة: {r.ai_risk_score}</span>
                )}
                <span className="text-xs text-muted-foreground mr-auto">
                  {new Date(r.created_at).toLocaleString("ar-EG")}
                </span>
              </div>
              {r.customer_message && (
                <p className="text-sm mt-2 text-slate-200">{r.customer_message}</p>
              )}
              <pre className="mt-2 text-[10px] bg-black/40 p-2 rounded overflow-x-auto text-slate-400 max-h-32">
                {JSON.stringify(r.payload, null, 2)}
              </pre>
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  placeholder="ملاحظة (اختياري)"
                  className="flex-1 text-xs bg-slate-900/60 border border-slate-700 rounded px-2 py-1"
                  value={note[r.id] ?? ""}
                  onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  onClick={() => mut.mutate({ id: r.id, decision: "approved" })}
                  disabled={mut.isPending}
                >
                  موافقة
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => mut.mutate({ id: r.id, decision: "rejected" })}
                  disabled={mut.isPending}
                >
                  رفض
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
