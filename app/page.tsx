
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import ThemeSwitcher from "@/app/theme-switcher";
export const instant = false;

export default async function HomePage() {
  const user = await requireAdmin();

  return (
      <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
        {/* Navigation */}
        <header className="flex items-center justify-between gap-6 border-b border-gray-200 px-8 py-7 dark:border-gray-800">
          <div className="flex items-center">
          <span className="text-2xl font-bold tracking-tight">
            MemeAI
          </span>
            <span className="ml-3 border-l border-gray-300 pl-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Prompt Tool
          </span>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm font-medium">
            <Link
                href="/"
                className="text-black dark:text-white"
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
                className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
            >
              Generations
            </Link>

            <ThemeSwitcher />
          </nav>
        </header>

        {/* Main content */}
        <section className="mx-auto max-w-6xl px-8 py-16">
          {/* Introduction */}
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
            Prompt Chain Management
          </p>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Your creative workspace.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            Build, organize, and test AI prompt chains.
            Configure your workflows, generate creative content,
            and explore your results in one place.
          </p>

          {/* Main dashboard cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Prompt Chains */}
            <Link
                href="/chains"
                className="rounded-2xl border border-gray-200 p-8 transition hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-500"
            >
              <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Manage
              </span>
                <span className="text-xl text-gray-400">↗</span>
              </div>

              <h2 className="text-2xl font-semibold">
                Prompt Chains
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Create and organize your prompt chains.
                Configure AI models, edit instructions,
                and manage the order of each step.
              </p>

              <p className="mt-8 text-sm font-medium">
                Manage chains →
              </p>
            </Link>

            {/* Generation History */}
            <Link
                href="/generations"
                className="rounded-2xl border border-gray-200 p-8 transition hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-500"
            >
              <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Explore
              </span>
                <span className="text-xl text-gray-400">↗</span>
              </div>

              <h2 className="text-2xl font-semibold">
                Generation History
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Review your previously generated AI content.
                Explore individual step outputs and revisit
                results from different prompt chains.
              </p>

              <p className="mt-8 text-sm font-medium">
                View generations →
              </p>
            </Link>
          </div>

          {/* Quick Start */}
          <div className="mt-16">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                  Getting Started
                </p>

                <h2 className="text-2xl font-bold">
                  How it works
                </h2>
              </div>

              <Link
                  href="/chains/new"
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium transition hover:border-black hover:bg-black hover:text-white dark:border-gray-700 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
              >
                + Create New Chain
              </Link>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {/* Step 1 */}
              <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-400">
                01
              </span>

                <h3 className="mt-5 text-lg font-semibold">
                  Create a chain
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Give your workflow a name and description
                  to get started.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-400">
                02
              </span>

                <h3 className="mt-5 text-lg font-semibold">
                  Configure steps
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Write prompt instructions, choose an AI
                  model, and arrange your steps in order.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-400">
                03
              </span>

                <h3 className="mt-5 text-lg font-semibold">
                  Generate & review
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Upload an image or enter context, run your
                  chain with Gemini, and review the results.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 border-t border-gray-200 pt-6 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Signed in as {user.email}
            </p>
          </div>
        </section>
      </main>
  );
}
