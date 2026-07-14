import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyOrganizations,
  switchOrganization as switchOrgFn,
} from "./queries.functions";
import type { OrganizationWithRole } from "./types";

const STORAGE_KEY = "phoenix.currentOrg";

interface TenantContextValue {
  organizations: OrganizationWithRole[];
  currentOrg: OrganizationWithRole | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  switchTo: (organizationId: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const listFn = useServerFn(listMyOrganizations);
  const switchFn = useServerFn(switchOrgFn);

  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const orgs = await listFn();
      setOrganizations(orgs);
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const valid = stored && orgs.some((o) => o.id === stored) ? stored : orgs[0]?.id ?? null;
      setCurrentId(valid);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchTo = useCallback(
    async (organizationId: string) => {
      await switchFn({ data: { id: organizationId } });
      setCurrentId(organizationId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, organizationId);
      }
    },
    [switchFn],
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      organizations,
      currentOrg: organizations.find((o) => o.id === currentId) ?? null,
      loading,
      error,
      refresh,
      switchTo,
    }),
    [organizations, currentId, loading, error, refresh, switchTo],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within <TenantProvider>");
  return ctx;
}

export function useOptionalTenant(): TenantContextValue | null {
  return useContext(TenantContext);
}
