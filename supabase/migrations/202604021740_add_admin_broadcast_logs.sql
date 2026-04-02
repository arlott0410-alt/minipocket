create table if not exists admin_broadcast_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  target text not null check (target in ('all', 'paid', 'free')),
  message text not null,
  image_url text,
  total_users int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  failed_samples jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_broadcast_logs_created_at
  on admin_broadcast_logs(created_at desc);
