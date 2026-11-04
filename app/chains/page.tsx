
import Link from "next/link";
import { getAdminDatabase, requireAdmin } from "@/lib/admin";
import ThemeSwitcher from "@/app/theme-switcher";

export default async function ChainsPage() {
    await requireAdmin();

    const supabase = await getAdminDatabase();

    const { data: chains, error } = await supabase
        .from("prompt_chains")
        .select("id, name, description, is_active, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="min-h-screen bg-white p-10 text-black dark:bg-black dark:text-white">
                <p className="text-red-600 dark:text-red-400">
                    Failed to load prompt chains: {error.message}
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
            {/* Navigation */}
            <header className="flex items-center justify-between gap-6 border-b border-gray-200 px-8 py-7 dark:border-gray-800">
                <Link
                    href="/"
                    className="flex items-center text-2xl font-bold tracking-tight"
                >
                    MemeAI
                    <span className="ml-3 border-l border-gray-300 pl-3 text-sm font-normal text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Prompt Tool
          </span>
                </Link>

                <nav className="flex flex-wrap items-center gap-6 text-sm font-medium">
                    <Link
                        href="/"
                        className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                    >
                        Dashboard
                    </Link>

                    <Link
                        href="/chains"
                        className="text-black dark:text-white"
                    >
                        Prompt Chains
                    </Link>

                    <Link
                        href="/generations"
                        className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                    >
                        Generations
                    </Link>

                    <ThemeSwitcher />
                </nav>
            </header>

            {/* Main content */}
            <section className="mx-auto max-w-6xl px-8 py-16">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                    Prompt Management
                </p>

                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tight">
                            Prompt Chains
                        </h1>

                        <p className="mt-5 text-gray-500 dark:text-gray-400">
                            Create and manage your AI generation workflows.
                        </p>
                    </div>

                    <Link
                        href="/chains/new"
                        className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium transition hover:border-black hover:bg-black hover:text-white dark:border-gray-600 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                    >
                        + New Chain
                    </Link>
                </div>

                {/* Chain list */}
                <div className="mt-12 space-y-4">
                    {chains?.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 p-12 text-center dark:border-gray-800">
                            <h2 className="text-xl font-semibold">
                                No prompt chains yet
                            </h2>

                            <p className="mt-3 text-gray-500 dark:text-gray-400">
                                Create your first prompt chain to get started.
                            </p>
                        </div>
                    ) : (
                        chains?.map((chain) => (
                            <Link
                                key={chain.id}
                                href={`/chains/${chain.id}`}
                                className="block rounded-2xl border border-gray-200 p-7 transition hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-500"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <h2 className="text-xl font-semibold">
                                        {chain.name}
                                    </h2>

                                    <span
                                        className={`text-sm ${
                                            chain.is_active
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-gray-500"
                                        }`}
                                    >
                    {chain.is_active ? "Active" : "Inactive"}
                  </span>
                                </div>

                                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                    {chain.description || "No description"}
                                </p>

                                <p className="mt-5 text-sm text-gray-500">
                                    Manage steps →
                                </p>
                            </Link>
                        ))
                    )}
                </div>
            </section>
        </main>
    );
}
