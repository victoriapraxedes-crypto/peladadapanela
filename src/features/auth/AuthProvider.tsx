import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Player = Tables<"players">;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  player: Player | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  reloadPlayer: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [dataResolved, setDataResolved] = useState(false);

  useEffect(() => {
    // Listener PRIMEIRO, getSession depois (evita race condition no primeiro load).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionResolved(true);
      if (!newSession) {
        setProfile(null);
        setPlayer(null);
        setDataResolved(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionResolved(true);
      if (!data.session) setDataResolved(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const loadData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: pl }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("players").select("*").eq("profile_id", uid).maybeSingle(),
    ]);
    setProfile(prof ?? null);
    setPlayer(pl ?? null);
    setDataResolved(true);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setDataResolved(false);
    void loadData(userId);
  }, [userId, loadData]);

  const reloadPlayer = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("profile_id", userId)
      .maybeSingle();
    setPlayer(data ?? null);
  }, [userId]);

  const reloadProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ?? null);
  }, [userId]);

  const signInWithGoogle = useCallback(async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      return { error: result.error.message ?? "Não foi possível entrar com o Google." };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPlayer(null);
    navigate({ to: "/login" });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      player,
      loading: !sessionResolved || !dataResolved,
      signInWithGoogle,
      signOut,
      reloadPlayer,
      reloadProfile,
    }),
    [
      session,
      profile,
      player,
      sessionResolved,
      dataResolved,
      signInWithGoogle,
      signOut,
      reloadPlayer,
      reloadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
