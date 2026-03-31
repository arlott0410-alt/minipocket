insert into settings (key, value, label) values
  ('admin_contact_name', 'Mini Pocket Admin', 'Admin contact name'),
  ('admin_contact_telegram', '@mini_pocket_admin', 'Admin Telegram'),
  ('admin_contact_phone', '', 'Admin phone'),
  ('admin_contact_note', 'ຕິດຕໍ່ແອດມິນເພື່ອຕໍ່ອາຍຸ subscription', 'Admin contact note')
on conflict (key) do nothing;
