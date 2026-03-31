create table if not exists wallet_share_links (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  permission text not null default 'viewer' check (permission in ('viewer','editor')),
  is_active boolean not null default true,
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_share_links_wallet_active
  on wallet_share_links(wallet_id, is_active, created_at desc);

create index if not exists idx_wallet_share_links_token_active
  on wallet_share_links(token, is_active);

alter table wallet_share_links enable row level security;
