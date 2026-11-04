
import Link from "next/link";
import { getAdminDatabase, requireAdmin } from "@/lib/admin";
import ThemeSwitcher from "@/app/theme-switcher";

type Generation = {
    id: string;
    prompt_chain_id: string | null;
    input_text: string | null;
    image_path: string | null;
    status: string;
    created_at: string;
};

type Response = {
    id: string;
    generation_request_id: string | null;
    response_text: string | null;
    created_at: string;
};

export default async function GenerationsPage({
                                                  searchParams,
                                              }: {
    searchParams: Promise<{ chain?: string }>;
}) {
    await requireAdmin();

    const { chain: chainId } = await searchParams;
    const db = await getAdminDatabase();

    // Load generation history, including saved image paths
    let query = db
        .from("generation_requests")
        .select(
            "id, prompt_chain_id, input_text, image_path, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(50);

    if (chainId) {
        query = query.eq("prompt_chain_id", chainId);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    const generations = (data ?? []) as Generation[];

    // Find chain names
    const chainIds = [
        ...new Set(
            generations
                .map((generation) => generation.prompt_chain_id)
                .filter((id): id is string => Boolean(id))
        ),
    ];

    const { data: chains, error: chainsError } = chainIds.length
        ? await db
            .from("prompt_chains")
            .select("id, name")
            .in("id", chainIds)
        : { data: [], error: null };

    if (chainsError) {
        throw new Error(chainsError.message);
    }

    const chainNames = new Map(
        (chains ?? []).map((chain) => [chain.id, chain.name])
    );

    // Load saved AI responses
    const generationIds = generations.map(
        (generation) => generation.id
    );

    const { data: responseData, error: responsesError } =
        generationIds.length
            ? await db
                .from("llm_responses")
                .select(
                    "id, generation_request_id, response_text, created_at"
                )
                .in("generation_request_id", generationIds)
                .order("created_at", { ascending: true })
            : { data: [], error: null };

    if (responsesError) {
        throw new Error(responsesError.message);
    }

    const responses = (responseData ?? []) as Response[];

    // Get the public URL for an uploaded image
    function getImageUrl(imagePath: string | null) {
        if (!imagePath) {
            return null;
        }

        const { data } = db.storage
            .from("generation-images")
            .getPublicUrl(imagePath);

        return data.publicUrl;
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
                        className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                    >
                        Prompt Chains
                    </Link>

                    <Link
                        href="/generations"
                        className="text-black dark:text-white"
                    >
                        Generations
                    </Link>

                    <ThemeSwitcher />
                </nav>
            </header>

            {/* Main content */}
            <section className="mx-auto max-w-6xl px-8 py-16">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                    AI Generation History
                </p>

                <h1 className="text-5xl font-bold tracking-tight">
                    Generations
                </h1>

                <p className="mt-5 text-gray-500 dark:text-gray-400">
                    Review previously generated results from your prompt chains.
                </p>

                {/* Clear chain filter */}
                {chainId && (
                    <div className="mt-6">
                        <Link
                            href="/generations"
                            className="text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                        >
                            ← View All Generations
                        </Link>
                    </div>
                )}

                {/* Empty state */}
                {generations.length === 0 ? (
                    <div className="mt-12 rounded-2xl border border-gray-200 p-12 text-center dark:border-gray-800">
                        <h2 className="text-xl font-semibold">
                            No generations yet
                        </h2>

                        <p className="mt-3 text-gray-500 dark:text-gray-400">
                            Run a prompt chain to see its results here.
                        </p>
                    </div>
                ) : (
                    <div className="mt-12 space-y-6">
                        {generations.map((generation) => {
                            // Find responses for this generation
                            const generationResponses = responses.filter(
                                (response) =>
                                    response.generation_request_id === generation.id
                            );

                            const finalResponse =
                                generationResponses[
                                generationResponses.length - 1
                                    ];

                            // NEW: Get the original uploaded image
                            const imageUrl = getImageUrl(generation.image_path);

                            return (
                                <div
                                    key={generation.id}
                                    className="rounded-2xl border border-gray-200 p-7 dark:border-gray-800"
                                >
                                    {/* Generation heading */}
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">
                                                {generation.prompt_chain_id
                                                    ? chainNames.get(
                                                    generation.prompt_chain_id
                                                ) ?? "Unknown Chain"
                                                    : "No Chain"}
                                            </h2>

                                            <p className="mt-2 text-sm text-gray-500">
                                                {new Date(
                                                    generation.created_at
                                                ).toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Status badge */}
                                        <span
                                            className={`rounded-full border px-3 py-1 text-xs ${
                                                generation.status === "completed"
                                                    ? "border-green-300 text-green-700 dark:border-green-900 dark:text-green-400"
                                                    : generation.status === "failed"
                                                        ? "border-red-300 text-red-600 dark:border-red-900 dark:text-red-400"
                                                        : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                                            }`}
                                        >
                      {generation.status}
                    </span>
                                    </div>

                                    {/* NEW: Original image and final caption */}
                                    {(imageUrl || finalResponse?.response_text) && (
                                        <div className="mt-6 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                                            <div className="flex flex-col gap-6 md:flex-row">
                                                {/* Original uploaded image */}
                                                {imageUrl && (
                                                    <div className="w-full shrink-0 md:w-64">
                                                        <p className="mb-3 text-sm font-semibold">
                                                            Original Image
                                                        </p>

                                                        {/* Using a regular img tag avoids
                                needing Next.js image configuration */}
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={imageUrl}
                                                            alt="Original uploaded generation image"
                                                            className="h-auto max-h-72 w-full rounded-xl border border-gray-200 object-contain dark:border-gray-700"
                                                        />
                                                    </div>
                                                )}

                                                {/* Final generated caption */}
                                                {finalResponse?.response_text && (
                                                    <div className="min-w-0 flex-1">
                                                        <p className="mb-3 text-sm font-semibold">
                                                            Final Result
                                                        </p>

                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                                            {finalResponse.response_text}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Input context */}
                                    {generation.input_text && (
                                        <div className="mt-6">
                                            <p className="mb-2 text-xs uppercase tracking-widest text-gray-500">
                                                Input Context
                                            </p>

                                            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                                {generation.input_text}
                                            </p>
                                        </div>
                                    )}

                                    {/* Expandable step-by-step results */}
                                    <details className="mt-5">
                                        <summary className="cursor-pointer text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                                            View Step-by-Step Results (
                                            {generationResponses.length})
                                        </summary>

                                        <div className="mt-4 space-y-4">
                                            {generationResponses.map(
                                                (response, index) => (
                                                    <div
                                                        key={response.id}
                                                        className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
                                                    >
                                                        <p className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                                            Step {index + 1}
                                                        </p>

                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                            {response.response_text}
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </details>

                                    {/* Open chain */}
                                    {generation.prompt_chain_id && (
                                        <Link
                                            href={`/chains/${generation.prompt_chain_id}`}
                                            className="mt-6 inline-block text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                                        >
                                            Open Chain →
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
