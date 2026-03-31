create index if not exists idx_wallets_owner_archived
  on wallets(owner_id, is_archived, created_at);

create index if not exists idx_wallet_members_user_wallet
  on wallet_members(user_id, wallet_id);

create index if not exists idx_transactions_wallet_date
  on transactions(wallet_id, transaction_date desc, created_at desc);

create index if not exists idx_transactions_wallet_type_date
  on transactions(wallet_id, type, transaction_date desc);
