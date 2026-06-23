// Refreshes the Supabase session + invalidates the AdminGate cache so newly
// granted admin/owner roles take effect without manual sign-out.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function RefreshAdminSession({
  variant = "outline",
  size = "sm",
}: {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
}) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("تم تحديث الصلاحيات بنجاح");
    } catch (e) {
      toast.error((e as Error).message || "تعذّر تحديث الجلسة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handle} disabled={loading} dir="rtl">
      <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "جارٍ التحديث…" : "تحديث صلاحيات الأدمن"}
    </Button>
  );
}
