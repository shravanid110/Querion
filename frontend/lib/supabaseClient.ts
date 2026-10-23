// lib/supabaseClient.ts
// Supabase client singleton for use in frontend (Next.js)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        '❌ Missing Supabase environment variables. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY are set in .env.local'
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        fetch: async (...args) => {
            try {
                return await fetch(...args);
            } catch (err) {
                // Return a 503 response instead of an uncaught rejected promise
                // to gracefully prevent unhandled "TypeError: Failed to fetch"
                return new Response(JSON.stringify({ error: "network_unavailable", message: "Network request failed" }), {
                    status: 503,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }
    }
});

export default supabase;
