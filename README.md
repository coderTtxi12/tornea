This is **Tornea**, a [Next.js](https://nextjs.org) app: UI plus server-rendered pages under `src/app`, business logic in `src/logic`, and Postgres access in `src/db` (via [`pg`](https://node-postgres.com)).

## Setup

Copy [.env.example](.env.example) to `.env.development.local` and set `DATABASE_URL`. Omit it if you only want to run without a database (health checks report `skipped`).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Development server ([Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run prod` | `build` then `start` |

Edit the home screen in [`src/app/page.tsx`](src/app/page.tsx).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
