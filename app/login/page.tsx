"use client";

import { createClient } from "@/lib/supabase-browser";
import { useState } from "react";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin() {
        setLoading(true);
        setError("");

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <header className="flex items-center border-b border-gray-800 px-8 py-7">
        <span className="text-2xl font-bold tracking-tight">
          MemeAI
        </span>

                <span className="ml-3 border-l border-gray-700 pl-3 text-sm text-gray-400">
          Prompt Tool
        </span>
            </header>

            <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-32 text-center">
                <p className="mb-8 text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">
                    Prompt Chain Management
                </p>

                <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">
                    Build better prompts.
                    <br />
                    Generate better memes.
                </h1>

                <p className="mt-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
                    Create, edit, and organize AI prompt chains.
                    Test your workflows and explore generated results,
                    all in one place.
                </p>

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="mt-12 rounded-2xl border border-slate-600 px-10 py-5 text-lg font-medium transition hover:border-white hover:bg-white hover:text-black disabled:opacity-50"
                >
                    {loading ? "Redirecting..." : "Sign in with Google"}
                </button>

                {error && (
                    <p className="mt-5 text-sm text-red-400">{error}</p>
                )}

                <p className="mt-8 text-sm text-gray-600">
                    Superadmin access required
                </p>
            </section>
        </main>
    );
}
