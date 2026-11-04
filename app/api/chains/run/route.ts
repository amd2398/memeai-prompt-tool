
import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabase, requireAdmin } from "@/lib/admin";

type ChainStep = {
    id: string;
    step_order: number;
    prompt_template: string;
    temperature: number | null;
    llm_model_id: string | null;
};

type GeminiPart =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } };

const BUCKET_NAME = "generation-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
];

export async function POST(request: NextRequest) {
    try {
        // Only superadmins can run chains
        const admin = await requireAdmin();

        if (!admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is missing." },
                { status: 500 }
            );
        }

        const formData = await request.formData();

        const chainId = String(formData.get("chain_id") ?? "");
        const inputText = String(formData.get("input_text") ?? "");
        const image = formData.get("image");

        if (!chainId) {
            return NextResponse.json(
                { error: "Missing chain ID." },
                { status: 400 }
            );
        }

        if (!inputText.trim() && !(image instanceof File && image.size > 0)) {
            return NextResponse.json(
                { error: "Please upload an image or enter some context." },
                { status: 400 }
            );
        }

        // Validate uploaded image before saving anything
        let imageBuffer: Buffer | null = null;
        let imageMimeType: string | null = null;

        if (image instanceof File && image.size > 0) {
            if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
                return NextResponse.json(
                    {
                        error: "Only PNG, JPEG, and WebP images are supported.",
                    },
                    { status: 400 }
                );
            }

            if (image.size > MAX_IMAGE_SIZE) {
                return NextResponse.json(
                    { error: "Image must be under 5 MB." },
                    { status: 400 }
                );
            }

            imageBuffer = Buffer.from(await image.arrayBuffer());
            imageMimeType = image.type;
        }

        const db = await getAdminDatabase();

        // Load selected chain
        const { data: chain, error: chainError } = await db
            .from("prompt_chains")
            .select("id, name")
            .eq("id", chainId)
            .single();

        if (chainError || !chain) {
            return NextResponse.json(
                { error: "Chain not found." },
                { status: 404 }
            );
        }

        // Load chain steps
        const { data: steps, error: stepsError } = await db
            .from("prompt_chain_steps")
            .select(
                "id, step_order, prompt_template, temperature, llm_model_id"
            )
            .eq("prompt_chain_id", chainId)
            .order("step_order", { ascending: true });

        if (stepsError) {
            throw new Error(stepsError.message);
        }

        if (!steps || steps.length === 0) {
            return NextResponse.json(
                { error: "This chain has no steps." },
                { status: 400 }
            );
        }

        // Create generation record
        const { data: generation, error: generationError } = await db
            .from("generation_requests")
            .insert({
                prompt_chain_id: chainId,
                input_text: inputText,
                status: "processing",
            })
            .select("id")
            .single();

        if (generationError || !generation) {
            throw new Error(
                generationError?.message ?? "Could not create generation."
            );
        }

        const outputs: {
            step: number;
            prompt: string;
            response: string;
        }[] = [];

        let previousOutput = inputText;

        try {
            // NEW: Save the uploaded image to Supabase Storage
            if (imageBuffer && imageMimeType) {
                const extension =
                    imageMimeType === "image/png"
                        ? "png"
                        : imageMimeType === "image/webp"
                            ? "webp"
                            : "jpg";

                const imagePath = `generations/${generation.id}/original.${extension}`;

                const { error: uploadError } = await db.storage
                    .from(BUCKET_NAME)
                    .upload(imagePath, imageBuffer, {
                        contentType: imageMimeType,
                        upsert: false,
                    });

                if (uploadError) {
                    throw new Error(
                        `Could not save uploaded image: ${uploadError.message}`
                    );
                }

                // Link the saved image to this generation
                const { error: imageUpdateError } = await db
                    .from("generation_requests")
                    .update({ image_path: imagePath })
                    .eq("id", generation.id);

                if (imageUpdateError) {
                    // Clean up the uploaded file if linking fails
                    await db.storage
                        .from(BUCKET_NAME)
                        .remove([imagePath]);

                    throw new Error(
                        `Could not link image to generation: ${imageUpdateError.message}`
                    );
                }
            }

            // Run each step in order
            for (const step of steps as ChainStep[]) {
                let modelIdentifier = "gemini-3.5-flash-lite";

                if (step.llm_model_id) {
                    const { data: model } = await db
                        .from("llm_models")
                        .select("model_identifier")
                        .eq("id", step.llm_model_id)
                        .single();

                    if (model?.model_identifier) {
                        modelIdentifier = model.model_identifier;
                    }
                }

                // Pass the previous step's output to the next step
                const prompt = [
                    step.prompt_template,
                    "",
                    "Original user context:",
                    inputText || "(No additional context)",
                    "",
                    "Previous step output:",
                    previousOutput || "(This is the first step)",
                ].join("\n");

                const parts: GeminiPart[] = [{ text: prompt }];

                // Send the uploaded image to Gemini in the first step
                if (
                    step.id === steps[0].id &&
                    imageBuffer &&
                    imageMimeType
                ) {
                    parts.push({
                        inline_data: {
                            mime_type: imageMimeType,
                            data: imageBuffer.toString("base64"),
                        },
                    });
                }

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelIdentifier)}:generateContent`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-goog-api-key": apiKey,
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: "user",
                                    parts,
                                },
                            ],
                            generationConfig: {
                                temperature: step.temperature ?? 0.7,
                            },
                        }),
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error?.message ??
                        `Gemini request failed (${response.status}).`
                    );
                }

                const output = (
                    result.candidates?.[0]?.content?.parts ?? []
                )
                    .map((part: { text?: string }) => part.text ?? "")
                    .join("\n")
                    .trim();

                if (!output) {
                    throw new Error(
                        `Step ${step.step_order} returned no text.`
                    );
                }

                previousOutput = output;

                // Save each step's response
                const { error: responseError } = await db
                    .from("llm_responses")
                    .insert({
                        generation_request_id: generation.id,
                        llm_model_id: step.llm_model_id,
                        prompt_chain_step_id: step.id,
                        response_text: output,
                    });

                if (responseError) {
                    throw new Error(responseError.message);
                }

                outputs.push({
                    step: step.step_order,
                    prompt: step.prompt_template,
                    response: output,
                });
            }

            // Mark generation as completed
            const { error: completionError } = await db
                .from("generation_requests")
                .update({ status: "completed" })
                .eq("id", generation.id);

            if (completionError) {
                throw new Error(completionError.message);
            }

            return NextResponse.json({
                success: true,
                generation_id: generation.id,
                chain_name: chain.name,
                outputs,
                final_output: previousOutput,
            });
        } catch (error) {
            // Mark unsuccessful generations as failed
            await db
                .from("generation_requests")
                .update({ status: "failed" })
                .eq("id", generation.id);

            throw error;
        }
    } catch (error) {
        console.error("Chain generation error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "An unexpected error occurred.",
            },
            { status: 500 }
        );
    }
}
