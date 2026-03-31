# Telegram Wallet Mini App (Lao-focused)

Production-ready starter for a Telegram Mini App multi-currency wallet stack:

- Frontend: React + Vite + Tailwind + Router + i18n + charts + motion
- API: Cloudflare Workers + itty-router
- Data/Auth: Supabase PostgreSQL + RLS

## 1) Supabase Setup

Run your schema SQL in Supabase SQL Editor (tables, RLS, seed data, and settings), then run:

```sql
create or replace function increment_balance(wallet_id uuid, delta numeric)
returns void language sql as $$
  update wallets set balance = balance + delta, updated_at = now() where id = wallet_id;
$$;
```

## 2) Worker Setup

`worker/wrangler.toml` already contains the runtime config shell.

Set secrets:

```bash
cd worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put BOT_TOKEN
```

Install and deploy:

```bash
cd worker
npm install
npm run deploy
```

## 3) Frontend Setup

Copy env template:

```bash
cd frontend
copy .env.example .env
```

Build:

```bash
cd frontend
npm install
npm run build
```

Cloudflare Pages:

- Build command: `cd frontend && npm install && npm run build`
- Build output: `frontend/dist`
- Root directory: `/`

## 4) Architecture Notes

- Telegram `initData` is validated on each API request.
- No hardcoded admin IDs; admin privileges are checked in `admins` table.
- All UI/API settings are fetched from `settings` table.
- Wallet balance mutations use `increment_balance` RPC.
- Language toggle persists to `localStorage`.
