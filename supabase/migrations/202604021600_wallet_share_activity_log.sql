-- Audit trail when a shared wallet member (non-owner) edits or deletes a transaction.
create table wallet_share_activity_log (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  actor_user_id uuid not null references users(id) on delete cascade,
  action text not null check (action in ('transaction_updated', 'transaction_deleted')),
  transaction_id uuid references transactions(id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_share_activity_wallet_created
  on wallet_share_activity_log(wallet_id, created_at desc);

alter table wallet_share_activity_log enable row level security;
