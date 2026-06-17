"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

  const fetchProfile = async (userId: string) => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error.message);
        setProfile(null);
        setRole(null);
      } else if (data) {
        setProfile(data as Profile);
        setRole((data as Profile).role);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Check active session immediately
    (supabase as any).auth.getSession().then(({ data }: any) => {
      const session = data?.session;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = (supabase as any).auth.onAuthStateChange(
      async (event: any, session: any) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
