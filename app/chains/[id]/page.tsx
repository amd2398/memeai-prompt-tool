
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminDatabase, requireAdmin } from "@/lib/admin";
import { updateStep, deleteStep, moveStep } from "@/lib/chain-actions";
import DeleteChainButton from "./DeleteChainButton";
import ThemeSwitcher from "@/app/theme-switcher";

const fieldStyle =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none focus:border-black dark:border-gray-700 dark:bg-black dark:text-white dark:focus:border-white";

const buttonStyle =
    "rounded-xl border border-gray-300 px-6 py-3 transition hover:border-black hover:bg-black hover:text-white dark:border-gray-600 dark:hover:border-white dark:hover:bg-white dark:hover:text-black disabled:cursor-not-allowed disabled:opacity-40";

const cardStyle =
    "rounded-2xl border border-gray-200 p-8 dark:border-gray-800";

const secondaryText =
    "text-gray-500 dark:text-gray-400";

export default async function ChainDetailPage({
                                                  params,
                                              }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await requireAdmin();

    const supabase = await getAdminDatabase();

    // Load chain
    const { data: chain, error: chainError } = await supabase
        .from("prompt_chains")
        .select("id, name, description, is_active")
        .eq("id", id)
        .single();

    if (chainError || !chain) {
        notFound();
    }

    // Load AI models
    const { data: models, error: modelsError } = await supabase
        .from("llm_models")
        .select("id, name, model_identifier")
        .order("name");

    if (modelsError) {
        throw new Error(modelsError.message);
    }

    // Load chain steps
    const { data: steps, error: stepsError } = await supabase
        .from("prompt_chain_steps")
        .select(
            "id, step_order, prompt_template, temperature, llm_model_id"
        )
        .eq("prompt_chain_id", id)
        .order("step_order", { ascending: true });

    if (stepsError) {
        throw new Error(stepsError.message);
    }

    // Update chain details
    async function updateChain(formData: FormData) {
        "use server";

        await requireAdmin();

        const db = await getAdminDatabase();

        const name = String(formData.get("name") ?? "").trim();
        const description = String(
            formData.get("description") ?? ""
        ).trim();
        const isActive = formData.get("is_active") === "on";

        if (!name || name.length > 120) {
            throw new Error("Enter a chain name of 1–120 characters.");
        }

        const { error } = await db
            .from("prompt_chains")
            .update({
                name,
                description: description || null,
                is_active: isActive,
            })
            .eq("id", id);

        if (error) {
            throw new Error(error.message);
        }

        redirect(`/chains/${id}`);
    }

    // Delete chain while preserving saved generation results
    async function deleteChain() {
        "use server";

        await requireAdmin();

        const db = await getAdminDatabase();

        // Disconnect saved generations from the chain.
        const { error: historyError } = await db
            .from("generation_requests")
            .update({ prompt_chain_id: null })
            .eq("prompt_chain_id", id);

        if (historyError) {
            throw new Error(historyError.message);
        }

        // Find steps associated with this chain.
        const { data: chainSteps, error: fetchError } = await db
            .from("prompt_chain_steps")
            .select("id")
            .eq("prompt_chain_id", id);

        if (fetchError) {
            throw new Error(fetchError.message);
        }

        const stepIds = (chainSteps ?? []).map((step) => step.id);

        // Disconnect saved responses from the steps.
        if (stepIds.length > 0) {
            const { error: responsesError } = await db
                .from("llm_responses")
                .update({ prompt_chain_step_id: null })
                .in("prompt_chain_step_id", stepIds);

            if (responsesError) {
                throw new Error(responsesError.message);
            }
        }

        // Delete steps.
        const { error: stepsDeleteError } = await db
            .from("prompt_chain_steps")
            .delete()
            .eq("prompt_chain_id", id);

        if (stepsDeleteError) {
            throw new Error(stepsDeleteError.message);
        }

        // Delete chain.
        const { error: chainDeleteError } = await db
            .from("prompt_chains")
            .delete()
            .eq("id", id);

        if (chainDeleteError) {
            throw new Error(chainDeleteError.message);
        }

        redirect("/chains");
    }

    // Add new chain step
    async function addStep(formData: FormData) {
        "use server";

        await requireAdmin();

        const db = await getAdminDatabase();

        const prompt = String(
            formData.get("prompt_template") ?? ""
        ).trim();

        const modelId = String(
            formData.get("llm_model_id") ?? ""
        );

        const temperatureValue = String(
            formData.get("temperature") ?? ""
        ).trim();

        if (!prompt) {
            throw new Error("Prompt instructions cannot be empty.");
        }

        if (!modelId) {
            throw new Error("Please select an AI model.");
        }

        const temperature =
            temperatureValue === ""
                ? null
                : Number(temperatureValue);

        if (
            temperature !== null &&
            (!Number.isFinite(temperature) ||
                temperature < 0 ||
                temperature > 2)
        ) {
            throw new Error("Temperature must be between 0 and 2.");
        }

        // Verify selected model exists.
        const { data: selectedModel, error: modelError } = await db
            .from("llm_models")
            .select("id")
            .eq("id", modelId)
            .single();

        if (modelError || !selectedModel) {
            throw new Error("Invalid AI model.");
        }

        // Determine next step order.
        const { data: existingSteps, error: orderError } = await db
            .from("prompt_chain_steps")
            .select("step_order")
            .eq("prompt_chain_id", id)
            .order("step_order", { ascending: false })
            .limit(1);

        if (orderError) {
            throw new Error(orderError.message);
        }

        const nextOrder =
            (existingSteps?.[0]?.step_order ?? 0) + 1;

        // Save new step.
        const { error } = await db
            .from("prompt_chain_steps")
            .insert({
                prompt_chain_id: id,
                llm_model_id: modelId,
                step_order: nextOrder,
                prompt_template: prompt,
                temperature,
            });

        if (error) {
            throw new Error(error.message);
        }

        redirect(`/chains/${id}`);
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

            <section className="mx-auto max-w-5xl px-8 py-16">
                {/* Back link */}
                <Link
                    href="/chains"
                    className="text-sm text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                    ← Back to Prompt Chains
                </Link>

                <p className="mb-4 mt-12 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                    Chain Editor
                </p>

                <h1 className="text-5xl font-bold tracking-tight">
                    {chain.name}
                </h1>

                <p className={`mt-5 ${secondaryText}`}>
                    Edit your chain settings and manage its steps.
                </p>

                {/* Generation links */}
                <div className="mt-8 flex flex-wrap gap-4">
                    <Link
                        href={`/chains/${id}/run`}
                        className={buttonStyle}
                    >
                        Generate with Gemini →
                    </Link>

                    <Link
                        href={`/generations?chain=${id}`}
                        className={buttonStyle}
                    >
                        View Generations
                    </Link>
                </div>

                {/* Chain Details */}
                <form
                    action={updateChain}
                    className={`mt-12 space-y-6 ${cardStyle}`}
                >
                    <h2 className="text-xl font-semibold">
                        Chain Details
                    </h2>

                    <div>
                        <label
                            htmlFor="name"
                            className="mb-2 block text-sm font-medium"
                        >
                            Chain Name
                        </label>

                        <input
                            id="name"
                            name="name"
                            defaultValue={chain.name}
                            required
                            maxLength={120}
                            className={fieldStyle}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="description"
                            className="mb-2 block text-sm font-medium"
                        >
                            Description
                        </label>

                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            defaultValue={chain.description ?? ""}
                            className={fieldStyle}
                        />
                    </div>

                    <label className="flex items-center gap-3 text-sm">
                        <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={chain.is_active}
                            className="h-4 w-4 accent-black dark:accent-white"
                        />
                        Active chain
                    </label>

                    <button
                        type="submit"
                        className={buttonStyle}
                    >
                        Save Changes
                    </button>
                </form>

                {/* Delete Chain */}
                <div className={`mt-8 ${cardStyle}`}>
                    <h2 className="text-xl font-semibold">
                        Delete Chain
                    </h2>

                    <p className={`mt-3 text-sm ${secondaryText}`}>
                        Permanently delete this prompt chain and its steps.
                        This action cannot be undone.
                    </p>

                    <p className="mt-3 text-sm text-gray-500">
                        Saved generation results will be preserved, but will
                        no longer be associated with this chain.
                    </p>

                    <form action={deleteChain} className="mt-6">
                        <DeleteChainButton
                            chainName={chain.name}
                            disabled={false}
                        />
                    </form>
                </div>

                {/* Chain Steps */}
                <div className="mt-14">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">
                            Chain Steps
                        </h2>

                        <span className="text-sm text-gray-500">
              {steps?.length ?? 0}{" "}
                            {steps?.length === 1 ? "step" : "steps"}
            </span>
                    </div>

                    {steps?.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-gray-200 p-10 text-center dark:border-gray-800">
                            <p className={secondaryText}>
                                This chain has no steps yet.
                            </p>

                            <p className="mt-2 text-sm text-gray-500">
                                Add your first step below.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {steps?.map((step, index) => (
                                <div
                                    key={step.id}
                                    className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800"
                                >
                                    {/* Step heading and reorder buttons */}
                                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                        <h3 className="text-lg font-semibold">
                                            Step {index + 1}
                                        </h3>

                                        <div className="flex gap-2">
                                            {/* Move up */}
                                            <form action={moveStep}>
                                                <input
                                                    type="hidden"
                                                    name="chain_id"
                                                    value={id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="step_id"
                                                    value={step.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="direction"
                                                    value="up"
                                                />

                                                <button
                                                    type="submit"
                                                    disabled={index === 0}
                                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition hover:border-black dark:border-gray-700 dark:hover:border-white disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    ↑ Up
                                                </button>
                                            </form>

                                            {/* Move down */}
                                            <form action={moveStep}>
                                                <input
                                                    type="hidden"
                                                    name="chain_id"
                                                    value={id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="step_id"
                                                    value={step.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="direction"
                                                    value="down"
                                                />

                                                <button
                                                    type="submit"
                                                    disabled={index === steps.length - 1}
                                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition hover:border-black dark:border-gray-700 dark:hover:border-white disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    ↓ Down
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                    {/* Edit existing step */}
                                    <form
                                        action={updateStep}
                                        className="space-y-5"
                                    >
                                        <input
                                            type="hidden"
                                            name="chain_id"
                                            value={id}
                                        />

                                        <input
                                            type="hidden"
                                            name="step_id"
                                            value={step.id}
                                        />

                                        <div>
                                            <label
                                                htmlFor={`prompt-${step.id}`}
                                                className={`mb-2 block text-sm ${secondaryText}`}
                                            >
                                                Prompt Instructions
                                            </label>

                                            <textarea
                                                id={`prompt-${step.id}`}
                                                name="prompt_template"
                                                defaultValue={step.prompt_template}
                                                rows={4}
                                                required
                                                className={fieldStyle}
                                            />
                                        </div>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div>
                                                <label
                                                    htmlFor={`model-${step.id}`}
                                                    className={`mb-2 block text-sm ${secondaryText}`}
                                                >
                                                    AI Model
                                                </label>

                                                <select
                                                    id={`model-${step.id}`}
                                                    name="llm_model_id"
                                                    defaultValue={step.llm_model_id ?? ""}
                                                    required
                                                    className={fieldStyle}
                                                >
                                                    {models?.map((model) => (
                                                        <option
                                                            key={model.id}
                                                            value={model.id}
                                                        >
                                                            {model.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor={`temperature-${step.id}`}
                                                    className={`mb-2 block text-sm ${secondaryText}`}
                                                >
                                                    Temperature (0–2)
                                                </label>

                                                <input
                                                    id={`temperature-${step.id}`}
                                                    name="temperature"
                                                    type="number"
                                                    min="0"
                                                    max="2"
                                                    step="0.1"
                                                    defaultValue={step.temperature ?? ""}
                                                    className={fieldStyle}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className={buttonStyle}
                                        >
                                            Save Step
                                        </button>
                                    </form>

                                    {/* Delete step */}
                                    <form action={deleteStep} className="mt-5">
                                        <input
                                            type="hidden"
                                            name="chain_id"
                                            value={id}
                                        />

                                        <input
                                            type="hidden"
                                            name="step_id"
                                            value={step.id}
                                        />

                                        <button
                                            type="submit"
                                            className="text-sm text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            Delete Step
                                        </button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add New Step */}
                <form
                    action={addStep}
                    className={`mt-8 space-y-6 ${cardStyle}`}
                >
                    <h3 className="text-xl font-semibold">
                        Add New Step
                    </h3>

                    <div>
                        <label
                            htmlFor="prompt_template"
                            className="mb-2 block text-sm font-medium"
                        >
                            Prompt Instructions
                        </label>

                        <textarea
                            id="prompt_template"
                            name="prompt_template"
                            required
                            rows={5}
                            placeholder="Describe what the AI should do in this step..."
                            className={fieldStyle}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="llm_model_id"
                            className="mb-2 block text-sm font-medium"
                        >
                            AI Model
                        </label>

                        <select
                            id="llm_model_id"
                            name="llm_model_id"
                            required
                            defaultValue=""
                            className={fieldStyle}
                        >
                            <option value="" disabled>
                                Select a model
                            </option>

                            {models?.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} ({model.model_identifier})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="temperature"
                            className="mb-2 block text-sm font-medium"
                        >
                            Temperature (0–2)
                        </label>

                        <input
                            id="temperature"
                            name="temperature"
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            defaultValue="0.7"
                            className={fieldStyle}
                        />

                        <p className="mt-2 text-xs text-gray-500">
                            Lower values are more predictable.
                            Higher values encourage creativity.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={!models?.length}
                        className={buttonStyle}
                    >
                        + Add Step
                    </button>
                </form>
            </section>
        </main>
    );
}
