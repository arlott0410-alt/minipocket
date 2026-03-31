# Supabase Migrations

Create a new SQL file for each database change.

Naming convention:

- `YYYYMMDDHHMM_<short_description>.sql`

Examples:

- `202603311410_add_payment_requests.sql`
- `202603311525_add_admin_email_index.sql`

Do not modify old migration files after they are applied in shared environments.
