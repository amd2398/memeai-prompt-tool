
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import ThemeSwitcher from "@/app/theme-switcher";

type StepOutput = {
    step: number;
    prompt: string;
    response: string;
};

type GenerationResult = {
    success: boolean;
    generation_id: string;
    chain_name: string;
    outputs: StepOutput[];
    final_output: string;
};

export default function RunChainPage() {
    const params = useParams<{ id: string }>();
    const chainId = params.id;

    const [image, setImage] = useState<File | null>(null);
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [error, setError] = useState("");

    async function handleGenerate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError("");
        setResult(null);

        try {
            if (!image && !context.trim()) {
                throw new Error(
                    "Please upload an image or enter some context."
                );
            }

            if (image && image.size > 5 * 1024 * 1024) {
                throw new Error("Image must be smaller than 5 MB.");
            }

            const formData = new FormData();
            formData.append("chain_id", chainId);
            formData.append("input_text", context);

            if (image) {
                formData.append("image", image);
            }

            const response = await fetch("/api/chains/run", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Generation failed.");
            }

            setResult(data as GenerationResult);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
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
            <section className="mx-auto max-w-4xl px-8 py-16">
                <Link
                    href={`/chains/${chainId}`}
                    className="text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                    ← Back to Chain Editor
                </Link>

                <p className="mb-4 mt-12 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                    AI Generation
                </p>

                <h1 className="text-5xl font-bold tracking-tight">
                    Run your chain.
                </h1>

                <p className="mt-5 text-gray-500 dark:text-gray-400">
                    Upload a photo, add context, and let Gemini run each
                    step of your prompt chain.
                </p>

                {/* Generation form */}
                <form
                    onSubmit={handleGenerate}
                    className="mt-12 space-y-8 rounded-2xl border border-gray-200 p-8 dark:border-gray-800"
                >
                    {/* Image upload */}
                    <div>
                        <label
                            htmlFor="image"
                            className="mb-3 block text-sm font-medium"
                        >
                            Upload Image
                        </label>

                        <input
                            id="image"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                                setImage(event.target.files?.[0] ?? null);
                            }}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-white dark:border-gray-700 dark:bg-black dark:text-gray-300 dark:file:bg-white dark:file:text-black"
                        />

                        {image && (
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                Selected: {image.name}
                            </p>
                        )}

                        <p className="mt-2 text-xs text-gray-500">
                            PNG, JPEG, or WebP. Maximum 5 MB.
                        </p>
                    </div>

                    {/* Additional context */}
                    <div>
                        <label
                            htmlFor="context"
                            className="mb-3 block text-sm font-medium"
                        >
                            Additional Context (Optional)
                        </label>

                        <textarea
                            id="context"
                            rows={4}
                            value={context}
                            onChange={(event) =>
                                setContext(event.target.value)
                            }
                            placeholder="e.g. Make the captions relatable to college students studying for finals."
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-black dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white"
                        />
                    </div>

                    {/* Generate button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl border border-gray-300 px-8 py-4 font-medium transition hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                    >
                        {loading
                            ? "Generating..."
                            : "Generate with Gemini"}
                    </button>

                    {/* Loading message */}
                    {loading && (
                        <p
                            role="status"
                            className="text-sm text-gray-500 dark:text-gray-400"
                        >
                            Running your prompt chain. This may take a little
                            while...
                        </p>
                    )}

                    {/* Error message */}
                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-300 p-4 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
                        >
                            {error}
                        </div>
                    )}
                </form>

                {/* Generation results */}
                {result && (
                    <div className="mt-12 space-y-6">
                        <div>
                            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                                Generation Complete
                            </p>

                            <h2 className="text-3xl font-bold">
                                {result.chain_name}
                            </h2>
                        </div>

                        {/* Final result */}
                        <div className="rounded-2xl border border-gray-400 p-8 dark:border-gray-600">
                            <h3 className="mb-5 text-xl font-semibold">
                                Final Result
                            </h3>

                            <p className="whitespace-pre-wrap leading-relaxed">
                                {result.final_output}
                            </p>
                        </div>

                        {/* Step-by-step results */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">
                                Step-by-Step Results
                            </h3>

                            {result.outputs.map((output) => (
                                <div
                                    key={output.step}
                                    className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800"
                                >
                                    <p className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                        Step {output.step}
                                    </p>

                                    <p className="mb-4 whitespace-pre-wrap text-sm text-gray-500">
                                        {output.prompt}
                                    </p>

                                    <p className="whitespace-pre-wrap leading-relaxed">
                                        {output.response}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
