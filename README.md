# BBQ Cornhole — Next.js (App Router)

A single-page tournament app with groups/round-robin/single-elim, live scoreboard, and a canvas coin flip with custom heads/tails.

## Quickstart
```bash
pnpm i    # or npm i / yarn
pnpm dev  # or npm run dev / yarn dev
```

Open http://localhost:3000

## Custom coin images
Drop your PNGs into `/public` and keep these names (or update in `app/page.tsx`):
```ts
const HEADS_URL = "/coin_heads_768.png";
const TAILS_URL = "/coin_tails_768.png";
```

## Deploy
Perfect for Vercel (Next.js 14). Push this folder to a repo and import into Vercel.
