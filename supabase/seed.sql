-- Design Book · seed.sql (placeholder names — rename in Admin → Outlets / Categories)
insert into public.outlets (code, name, is_head_office, address, phone) values
  ('HO',  'Head Office', true,  null, null),
  ('OUT1', 'Outlet 1',   false, null, null),
  ('OUT2', 'Outlet 2',   false, null, null),
  ('OUT3', 'Outlet 3',   false, null, null)
on conflict (code) do nothing;

insert into public.categories (name, sort_order) values
  ('Rings', 1), ('Necklaces', 2), ('Earrings', 3), ('Bangles', 4), ('Pendants', 5)
on conflict (name) do nothing;

insert into public.app_settings (key, value) values
  ('age_bands', '{"green_max": 30, "amber_max": 90}'),
  ('hold_expiry_warning_hours', '24')
on conflict (key) do nothing;
