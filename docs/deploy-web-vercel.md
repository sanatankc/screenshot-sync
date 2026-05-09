# Deploy Web to Vercel

This repo is a monorepo, so deploy from the repository root instead of the `web/` subfolder.

## 1. Required environment variable

Set this on Vercel for the project:

```bash
VITE_API_BASE_URL=https://capture-server-production.<your-cloudflare-subdomain>.workers.dev
```

The web build uses this at build time.

## 2. Deploy from the repo root

From `/Users/sanatan/Desktop/hot-things/screenshot-sync`:

```bash
vercel
```

For production:

```bash
vercel --prod
```

## 3. Build behavior

Vercel uses [`vercel.json`](/Users/sanatan/Desktop/hot-things/screenshot-sync/vercel.json) with:

- install: `pnpm install --frozen-lockfile`
- build: `pnpm --filter screenshot-sync-web build`
- output: `web/dist`

## 4. After deploy

Verify:

- QR pairing screen loads
- web can connect to the deployed backend
- viewer restore works on refresh
- gallery fetches screenshots
- websocket updates move screenshots from `pending` to `ready`

## Notes

- The backend currently supports `ALLOWED_ORIGINS="*"` for deployment convenience during the prototype phase.
- Tighten this to explicit Vercel domains later.
