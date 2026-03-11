"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import axios from "axios";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithGithub: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const syncUserToBackend = async (supabaseUser: any) => {
        // Eagerly set user context from the Supabase Session payload
        setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
            avatar_url: supabaseUser.user_metadata?.avatar_url,
        });

        try {
            // Attempt to sync to backend Database (auth_users table)
            await axios.post(`${API}/api/auth/sync`, {
                id: supabaseUser.id,
                email: supabaseUser.email,
                name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
                avatar_url: supabaseUser.user_metadata?.avatar_url || '',
            });
        } catch (error) {
            console.error("Failed to sync user to backend", error);
        }
    };

    useEffect(() => {
        // Initial session fetch
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await syncUserToBackend(session.user);
            }
            setLoading(false);
        };

        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await syncUserToBackend(session.user);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
                router.push('/login');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    prompt: 'login' // Forces Google to ask for email and password
                }
            }
        });
        if (error) throw error;
    };

    const signInWithGithub = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            }
        });
        if (error) throw error;
    };

    const login = useCallback(async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
            await syncUserToBackend(data.user);
        }
    }, []);

    const logout = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out", error);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithGithub, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
