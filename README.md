# parametrizar-rutas

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Mapping persistence (PROD)

The `GET/PUT /api/mfe-mapping` endpoints persist the mapping.

### PostgreSQL (source of truth)

Set `DATABASE_URL` to your PostgreSQL connection string. When `DATABASE_URL` is set, the API stores the full mapping as a single `jsonb` document in a table called `mfe_mapping_store` (auto-created on first request).

Note: JSON file persistence has been removed; `DATABASE_URL` is required for reads/writes.

Neon notes:

- Prefer the **pooled** connection string (PgBouncer) for Vercel to avoid exhausting connections.
- Ensure SSL is enabled (Neon typically uses `?sslmode=require`).

Vercel setup:

- Project → Settings → Environment Variables
- Add `DATABASE_URL` (for Production / Preview as needed)
- Redeploy

### Incremental updates

Besides `PUT` (replace full mapping), you can use `PATCH /api/mfe-mapping` to upsert a module by ID and/or append screens without sending the whole document.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
