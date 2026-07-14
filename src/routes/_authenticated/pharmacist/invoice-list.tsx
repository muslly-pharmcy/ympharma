// Phoenix Invoice Intelligence — list uploaded invoices
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listMyInvoices } from "@/modules/invoice-intake/functions/upload.functions";

export const Route = createFileRoute("/_authenticated/pharmacist/invoice-list")({
  head: () => ({ meta: [{ title: "الفواتير | Muslly" }] }),
  component: InvoiceListPage,
});

function InvoiceListPage() {
  const [orgId, setOrgId] = useState("");
  const listFn = useServerFn(listMyInvoices);
  const { data = [] } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => listFn({ data: { organization_id: orgId } }),
  });

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4" dir="rtl">
      <h1 className="text-xl font-bold">الفواتير المرفوعة</h1>
      <Input
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        placeholder="فلترة بمعرف المؤسسة (اختياري)"
        dir="ltr"
      />
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">لا توجد فواتير.</p>}
        {(data as Array<Record<string, string | number | boolean | null>>).map((row) => (
          <Link
            key={String(row.id)}
            to="/pharmacist/invoice-review/$id"
            params={{ id: String(row.id) }}
            className="block border rounded-md p-3 hover:bg-muted"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{String(row.id).slice(0, 8)}</span>
              <Badge>{String(row.status)}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {String(row.created_at)} · {String(row.source)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
