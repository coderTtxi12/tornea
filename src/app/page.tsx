import { getPool } from "@/db";
import { getDatabaseHealth } from "@/logic";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dbHealth = await getDatabaseHealth(getPool());

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Tornea · two-tier in a single repo
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            UI and business logic in Next; Postgres as the only datastore.
          </h1>
          <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            The{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              src/logic
            </code>{" "}
            folder holds domain rules with no Next.js imports: when you split out the backend,
            move that layer (and{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              src/db
            </code>
            ) into another service and have Server Components or Server Actions call it over HTTP
            instead.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Postgres status (via logic layer)
          </h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-zinc-500 dark:text-zinc-400">
                Status
              </dt>
              <dd className="font-mono">{dbHealth.status}</dd>
            </div>
            {dbHealth.detail ? (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-zinc-500 dark:text-zinc-400">
                  Detail
                </dt>
                <dd>{dbHealth.detail}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="text-sm text-zinc-600 dark:text-zinc-400">
          <p className="font-medium text-zinc-900 dark:text-zinc-200">Modes</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Development:{" "}
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                npm run dev
              </code>{" "}
              (loads{" "}
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                .env.development.local
              </code>
              )
            </li>
            <li>
              Production (local):{" "}
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                npm run prod
              </code>{" "}
              or{" "}
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                npm run build
              </code>{" "}
              +{" "}
              <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                npm run start
              </code>
              <span className="block pl-6">
                (set variables in the process environment or{" "}
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                  .env.production.local
                </code>
                )
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
