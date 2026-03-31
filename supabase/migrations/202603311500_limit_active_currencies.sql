-- Keep only LAK, THB, USD, CNY active for wallet creation.
update currencies
set is_active = case
  when code in ('LAK', 'THB', 'USD', 'CNY') then true
  else false
end;
