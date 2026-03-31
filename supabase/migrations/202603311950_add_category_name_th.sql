alter table categories
add column if not exists name_th text;

update categories
set name_th = coalesce(nullif(name_th, ''), name_en)
where name_th is null or name_th = '';
