"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase, isSupabaseReady } from "@/lib/supabase";

export interface Profile {
  id: string;
  role: "admin" | "photographer" | "client";
  full_name: string;
  avatar_url: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: "admin" | "photographer" | "client" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<"admin" | "photographer" | "client" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      if (!isSupabaseReady(supabase)) return;
      // Guard against a hung/slow profile query so auth never blocks the UI.
      const query = supabase.from("profiles").select("*").eq("id", userId).single();
      const timeout = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: "profile fetch timeout" } }), 1500)
      );
      const { data, error } = (await Promise.race([query, timeout])) as {
        data: Profile | null;
        error: { message: string } | null;
      };

      if (error) {
        setProfile(null);
        setRole(null);
      } else if (data) {
        const profileData = data as Profile;
        setProfile(profileData);
        setRole(profileData.role);
      }
    } catch (err) {
      // silent — profile unavailable is not fatal
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseReady(supabase)) {
      setLoading(false);
      return;
    }

    // 1. Check active session immediately — set loading=false as soon as we know
    // whether a session exists; profile fetch runs in the background.
    supabase.auth.getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        const session = data?.session;
        if (session?.user) {
          setUser(session.user);
          setLoading(false);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }).catch(() => {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (!isSupabaseReady(supabase)) return;
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
