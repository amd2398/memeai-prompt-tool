
"use server";

import { getAdminDatabase } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export async function updateStep(formData: FormData) {
    const db = await getAdminDatabase();

    const stepId = String(formData.get("step_id") ?? "");
    const chainId = String(formData.get("chain_id") ?? "");
    const prompt = String(formData.get("prompt_template") ?? "").trim();
    const modelId = String(formData.get("llm_model_id") ?? "");
    const temperatureText = String(formData.get("temperature") ?? "").trim();

    if (!stepId || !chainId || !prompt || !modelId) {
        throw new Error("Missing required step information.");
    }

    const temperature = temperatureText === ""
        ? null
        : Number(temperatureText);

    if (
        temperature !== null &&
        (!Number.isFinite(temperature) || temperature < 0 || temperature > 2)
    ) {
        throw new Error("Temperature must be between 0 and 2.");
    }

    const { error } = await db
        .from("prompt_chain_steps")
        .update({
            prompt_template: prompt,
            llm_model_id: modelId,
            temperature,
        })
        .eq("id", stepId)
        .eq("prompt_chain_id", chainId);

    if (error) throw new Error(error.message);

    revalidatePath(`/chains/${chainId}`);
}

export async function deleteStep(formData: FormData) {
    const db = await getAdminDatabase();

    const stepId = String(formData.get("step_id") ?? "");
    const chainId = String(formData.get("chain_id") ?? "");

    if (!stepId || !chainId) {
        throw new Error("Missing step information.");
    }

    const { error } = await db
        .from("prompt_chain_steps")
        .delete()
        .eq("id", stepId)
        .eq("prompt_chain_id", chainId);

    if (error) throw new Error(error.message);

    revalidatePath(`/chains/${chainId}`);
}

export async function moveStep(formData: FormData) {
    const db = await getAdminDatabase();

    const stepId = String(formData.get("step_id") ?? "");
    const chainId = String(formData.get("chain_id") ?? "");
    const direction = String(formData.get("direction") ?? "");

    if (!stepId || !chainId || !["up", "down"].includes(direction)) {
        throw new Error("Invalid move request.");
    }

    const { data: steps, error } = await db
        .from("prompt_chain_steps")
        .select("id, step_order")
        .eq("prompt_chain_id", chainId)
        .order("step_order", { ascending: true });

    if (error) throw new Error(error.message);

    const index = steps.findIndex((step) => step.id === stepId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >= steps.length
    ) {
        return;
    }

    const current = steps[index];
    const target = steps[targetIndex];

    // Use a temporary order to avoid conflicts with unique constraints
    const temporaryOrder =
        Math.max(...steps.map((step) => step.step_order)) + 1000;

    const updates = [
        { id: current.id, step_order: temporaryOrder },
        { id: target.id, step_order: current.step_order },
        { id: current.id, step_order: target.step_order },
    ];

    for (const update of updates) {
        const { error: updateError } = await db
            .from("prompt_chain_steps")
            .update({ step_order: update.step_order })
            .eq("id", update.id)
            .eq("prompt_chain_id", chainId);

        if (updateError) throw new Error(updateError.message);
    }

    revalidatePath(`/chains/${chainId}`);
}
