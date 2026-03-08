"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        // Supabase JS handles the actual parsing of hash tokens automatically.
        // We just wait for it to process the token, and then redirect.
        const handleRedirect = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push('/');
            } else {
                router.push('/login');
            }
        };

        // Slight timeout ensures the auth listener in layout/context gets it first
        setTimeout(() => {
            handleRedirect();
        }, 1000);
    }, [router]);

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-6 text-sm font-medium animate-pulse">Authenticating...</p>
        </div>
    );
}
