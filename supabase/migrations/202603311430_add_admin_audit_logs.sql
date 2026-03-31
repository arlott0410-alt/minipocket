create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at on admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_action on admin_audit_logs(action);

alter table admin_audit_logs enable row level security;
