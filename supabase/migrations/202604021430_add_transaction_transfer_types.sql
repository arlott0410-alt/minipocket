-- Allow wallet-only movements that adjust balance but are excluded from income/expense reports.
alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('income', 'expense', 'transfer_in', 'transfer_out'));
