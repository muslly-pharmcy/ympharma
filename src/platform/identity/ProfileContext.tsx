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
import { getMyProfile, updateMyProfile } from "./profile.functions";
import type { UserProfile } from "./types";

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (patch: Partial<UserProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const getFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getFn());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [getFn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<UserProfile>) => {
      const next = await updateFn({ data: patch as never });
      setProfile(next);
    },
    [updateFn],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, loading, error, refresh, update }),
    [profile, loading, error, refresh, update],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within <ProfileProvider>");
  return ctx;
}

export function useOptionalProfile(): ProfileContextValue | null {
  return useContext(ProfileContext);
}
