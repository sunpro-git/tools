import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || "sunpro36.co.jp";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isDomainAllowed: boolean;
}

export function useAuth(): AuthState & {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const email = user?.email ?? "";
  const isDomainAllowed = email.endsWith(`@${ALLOWED_DOMAIN}`);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          hd: ALLOWED_DOMAIN,
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    user,
    isLoading,
    isDomainAllowed,
    signInWithGoogle,
    signOut,
  };
}
