create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  is_paid boolean default false,
  paid_until timestamptz,
  created_at timestamptz default now(),
  last_active timestamptz default now()
);

create table admins (
  telegram_id bigint primary key,
  added_at timestamptz default now()
);

create table settings (
  key text primary key,
  value text not null,
  label text,
  updated_at timestamptz default now()
);

create table currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  is_active boolean default true,
  sort_order int default 0
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name_lo text not null,
  name_en text not null,
  type text check (type in ('income','expense','both')) default 'both',
  emoji text default '📝',
  is_active boolean default true,
  sort_order int default 0
);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade,
  name text not null,
  currency text references currencies(code),
  balance numeric(20,4) default 0,
  color text default '#6366f1',
  icon text default '💰',
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table wallet_members (
  wallet_id uuid references wallets(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  permission text check (permission in ('viewer','editor')) default 'viewer',
  invited_at timestamptz default now(),
  primary key (wallet_id, user_id)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references wallets(id) on delete cascade,
  user_id uuid references users(id),
  type text check (type in ('income','expense')) not null,
  amount numeric(20,4) not null check (amount > 0),
  category_id uuid references categories(id),
  note text,
  transaction_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table transfers (
  id uuid primary key default gen_random_uuid(),
  from_wallet_id uuid references wallets(id),
  to_wallet_id uuid references wallets(id),
  from_amount numeric(20,4) not null check (from_amount > 0),
  to_amount numeric(20,4) not null check (to_amount > 0),
  exchange_rate numeric(20,8),
  fee numeric(20,4) default 0,
  note text,
  user_id uuid references users(id),
  transferred_at timestamptz default now()
);

alter table users enable row level security;
alter table wallets enable row level security;
alter table wallet_members enable row level security;
alter table transactions enable row level security;
alter table transfers enable row level security;

insert into currencies (code, name, symbol, sort_order) values
  ('LAK', 'ກີບລາວ', '₭', 1),
  ('THB', 'ບາດໄທ', '฿', 2),
  ('USD', 'ໂດລາສະຫະລັດ', '$', 3),
  ('CNY', 'ຢວນຈີນ', '¥', 4),
  ('VND', 'ດົງຫວຽດນາມ', '₫', 5),
  ('EUR', 'ຢູໂຣ', '€', 6);

insert into categories (name_lo, name_en, type, emoji, sort_order) values
  ('ອາຫານ & ເຄື່ອງດື່ມ', 'Food & Drink', 'expense', '🍜', 1),
  ('ການເດີນທາງ', 'Transport', 'expense', '🚗', 2),
  ('ຊື້ເຄື່ອງ', 'Shopping', 'expense', '🛍️', 3),
  ('ສຸຂະພາບ', 'Health', 'expense', '💊', 4),
  ('ບັນເທີງ', 'Entertainment', 'expense', '🎮', 5),
  ('ໄຟຟ້າ & ນໍ້າ', 'Utilities', 'expense', '💡', 6),
  ('ການສຶກສາ', 'Education', 'expense', '📚', 7),
  ('ອື່ນໆ (ລາຍຈ່າຍ)', 'Other Expense', 'expense', '💸', 8),
  ('ເງິນເດືອນ', 'Salary', 'income', '💰', 9),
  ('ທຸລະກິດ', 'Business', 'income', '🏪', 10),
  ('ລາຍໄດ້ອື່ນໆ', 'Other Income', 'income', '💵', 11);

insert into settings (key, value, label) values
  ('app_name', 'ກະເປົ໋າເງິນ', 'ຊື່ແອັບ'),
  ('app_logo_url', '', 'URL ໂລໂກ້'),
  ('primary_color', '#6366f1', 'ສີຫຼັກ'),
  ('subscription_price_lak', '50000', 'ລາຄາລາຍເດືອນ (ກີບ)'),
  ('free_trial_days', '30', 'ທົດລອງໃຊ້ຟຣີ (ວັນ)'),
  ('max_wallets_free', '2', 'ກະເປົ໋າສູງສຸດ (ຟຣີ)'),
  ('max_wallets_paid', '20', 'ກະເປົ໋າສູງສຸດ (ຈ່າຍ)'),
  ('payment_bank_name', 'BCEL', 'ຊື່ທະນາຄານ'),
  ('payment_account_number', '000-000-000', 'ເລກບັນຊີ'),
  ('payment_account_name', 'ຊື່ເຈົ້າຂອງບັນຊີ', 'ຊື່ບັນຊີ'),
  ('payment_instructions', 'ໂອນເງິນຕາມຂໍ້ມູນຂ້າງເທິງ ແລ້ວສົ່ງສະລິບໃຫ້ແອດມິນ', 'ຄຳແນະນຳການຈ່າຍ'),
  ('announcement', '', 'ປະກາດ (ໜ້າຫຼັກ)');

create or replace function increment_balance(wallet_id uuid, delta numeric)
returns void language sql as $$
  update wallets set balance = balance + delta, updated_at = now() where id = wallet_id;
$$;

-- Admin emails (email+password login via Supabase Auth)
create table if not exists admin_emails (
  email text primary key
);

alter table admin_emails enable row level security;

create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount_lak numeric(20,4) not null check (amount_lak > 0),
  transfer_ref text,
  slip_url text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_payment_requests_user_created on payment_requests(user_id, created_at desc);
create index if not exists idx_payment_requests_status_created on payment_requests(status, created_at desc);

alter table payment_requests enable row level security;
