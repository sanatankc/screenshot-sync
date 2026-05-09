# Deploy Backend to Cloudflare

This project already runs locally with Wrangler, D1, R2, and Durable Objects. To deploy the backend for real latency testing, set up production Cloudflare resources and then deploy the Worker using the `production` Wrangler environment.

## 1. Prerequisites

- Logged into Wrangler:
  - `pnpm --filter screenshot-sync-server exec wrangler login`
- Cloudflare account with Workers, D1, and R2 enabled
- A production Vercel web domain ready to allow in CORS

## 2. Create Cloudflare resources

From the repo root:

```bash
cd /Users/sanatan/Desktop/hot-things/screenshot-sync/server
```

Create a production D1 database:

```bash
pnpm exec wrangler d1 create screenshot-sync-db-production
```

Create a production R2 bucket:

```bash
pnpm exec wrangler r2 bucket create screenshot-sync-assets-production
```

Create a production queue:

```bash
pnpm exec wrangler queues create screenshot-sync-retention-production
```

## 3. Fill in production Wrangler bindings

Update [`server/wrangler.jsonc`](/Users/sanatan/Desktop/hot-things/screenshot-sync/server/wrangler.jsonc):

- replace `replace-with-production-d1-id`
- replace `ALLOWED_ORIGINS` with your real Vercel domain(s)
  - example: `https://screenshot-sync.vercel.app`
  - if needed, comma-separate multiple origins

## 4. Set migration credentials for Drizzle / remote D1 access

Export these before remote migration commands:

```bash
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
export CLOUDFLARE_D1_DATABASE_ID=your-production-d1-id
```

## 5. Apply production migrations

```bash
pnpm run db:migrate:production
```

## 6. Deploy the backend

```bash
pnpm run deploy:production
```

## 7. Verify the backend

Check the deployed health endpoint:

```txt
https://<your-worker-domain>/health
```

You should get JSON confirming Workers, Durable Objects, D1, and R2 are available.

## 8. What the web app should point to

Once deployed, the Vercel app should use the deployed Worker origin as:

```bash
VITE_API_BASE_URL=https://<your-worker-domain>
```

## Notes

- Viewer session CORS is now environment-driven via `ALLOWED_ORIGINS`.
- Pairing sessions still expire quickly, but viewer sessions are now long-lived and sliding.
- Asset reads are authenticated through the viewer session token and served from the Worker, not directly from public R2 URLs.
