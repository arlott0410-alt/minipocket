create table if not exists wallet_share_invites (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  target_user_id uuid not null references users(id) on delete cascade,
  permission text not null default 'viewer' check (permission in ('viewer','editor')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists ux_wallet_share_invites_pending_unique
  on wallet_share_invites(wallet_id, target_user_id);

create index if not exists idx_wallet_share_invites_target_status_created
  on wallet_share_invites(target_user_id, status, created_at desc);

create index if not exists idx_wallet_share_invites_wallet_status_created
  on wallet_share_invites(wallet_id, status, created_at desc);

alter table wallet_share_invites enable row level security;
