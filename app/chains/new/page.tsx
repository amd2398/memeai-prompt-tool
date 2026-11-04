
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminDatabase, requireAdmin } from "@/lib/admin";
export const instant = false;

export default async function NewChainPage() {
    await requireAdmin();

    async function createChain(formData: FormData) {
        "use server";

        await requireAdmin();

        const name = String(formData.get("name") ?? "").trim();
        const description = String(
            formData.get("description") ?? ""
        ).trim();
        const isActive = formData.get("is_active") === "on";

        if (!name) {
            throw new Error("Chain name is required.");
        }

        const supabase = await getAdminDatabase();

        const { data, error } = await supabase
            .from("prompt_chains")
            .insert({
                name,
                description: description || null,
                is_active: isActive,
            })
            .select("id")
            .single();

        if (error || !data) {
            throw new Error(
                error?.message || "Failed to create chain."
            );
        }

        redirect(`/chains/${data.id}`);
    }

    return (
        <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
            <header className="border-b border-gray-200 px-8 py-7 dark:border-gray-800">
                <Link href="/" className="text-2xl font-bold">
                    MemeAI
                    <span className="ml-3 border-l border-gray-300 pl-3 text-sm font-normal text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Prompt Tool
          </span>
                </Link>
            </header>

            <section className="mx-auto max-w-3xl px-8 py-16">
                <Link
                    href="/chains"
                    className="text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                    ← Back to Prompt Chains
                </Link>

                <p className="mb-4 mt-12 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500">
                    Prompt Management
                </p>

                <h1 className="text-5xl font-bold tracking-tight">
                    Create a chain.
                </h1>

                <p className="mt-5 text-gray-500 dark:text-gray-400">
                    Start a new AI workflow. You can add and organize
                    its steps afterward.
                </p>

                <form action={createChain} className="mt-12 space-y-8">
                    <div>
                        <label
                            htmlFor="name"
                            className="mb-3 block text-sm font-medium"
                        >
                            Chain Name
                        </label>

                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            maxLength={120}
                            placeholder="e.g. Funny Photo Captions"
                            className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 text-black outline-none transition focus:border-black dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="description"
                            className="mb-3 block text-sm font-medium"
                        >
                            Description
                        </label>

                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            placeholder="Describe what this prompt chain does..."
                            className="w-full rounded-xl border border-gray-300 bg-white px-5 py-4 text-black outline-none transition focus:border-black dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white"
                        />
                    </div>

                    <label className="flex items-center gap-3 text-sm">
                        <input
                            name="is_active"
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4 accent-black dark:accent-white"
                        />
                        Active chain
                    </label>

                    <div className="flex flex-wrap gap-4">
                        <button
                            type="submit"
                            className="rounded-xl border border-gray-300 px-8 py-4 font-medium transition hover:border-black hover:bg-black hover:text-white dark:border-gray-600 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                        >
                            Create Chain
                        </button>

                        <Link
                            href="/chains"
                            className="rounded-xl px-8 py-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </section>
        </main>
    );
}
