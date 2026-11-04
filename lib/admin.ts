import "server-only";

import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export async function requireAdmin() {
    const supabase = await createClient();

    // Verify the logged-in user with Supabase Auth
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Check whether this user is a superadmin
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_superadmin")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.is_superadmin !== true) {
        redirect("/unauthorized");
    }

    return user;
}

export async function getAdminDatabase() {
    // Never create a privileged client before verifying access
    await requireAdmin();

    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
