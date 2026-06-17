import { supabase } from "@/integrations/supabase/client";

export async function createAndDownloadBackup(kind: "manual" | "daily" | "weekly" = "manual") {
  const { data: id, error } = await supabase.rpc("create_backup", { _kind: kind });
  if (error) throw error;
  const { data, error: fErr } = await supabase
    .from("backups")
    .select("id, created_at, kind, orders_count, rx_count, payload")
    .eq("id", id as string)
    .maybeSingle();
  if (fErr || !data) throw fErr || new Error("not found");
  downloadJSON(`backup-${data.kind}-${new Date(data.created_at).toISOString().slice(0,10)}.json`, data.payload);
  return data;
}

export function downloadJSON(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}
