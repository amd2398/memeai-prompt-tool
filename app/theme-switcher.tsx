
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-10 w-32 rounded-xl border border-gray-700" />
        );
    }

    return (
        <div className="flex items-center gap-2">
            <label
                htmlFor="theme"
                className="text-sm text-gray-400 dark:text-gray-400"
            >
                Theme
            </label>

            <select
                id="theme"
                value={theme ?? "system"}
                onChange={(event) => setTheme(event.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none dark:border-gray-700 dark:bg-black dark:text-white"
            >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
            </select>
        </div>
    );
}
