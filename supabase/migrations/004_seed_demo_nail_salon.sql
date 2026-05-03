with org as (
  insert into organizations (name, vertical)
  values ('Polish Studio', 'nail_salon')
  returning id
),
loc as (
  insert into locations (organization_id, name, phone, address, timezone)
  select id, 'Bandra', '+912212345678', 'Bandra West, Mumbai', 'Asia/Kolkata'
  from org
  returning id, organization_id
),
hours as (
  insert into location_hours (organization_id, location_id, day_of_week, open_time, close_time, is_closed)
  select organization_id, id, d, '10:00'::time, '19:00'::time, false
  from loc, unnest(array[1,2,3,4,5,6]) as d
  union all
  select organization_id, id, 0, null::time, null::time, true
  from loc
),
svc as (
  insert into services (organization_id, name, duration_minutes, price) 
  select organization_id, name, duration_minutes, price
  from loc,
  (values
    ('Classic Manicure', 30, 400),
    ('French Manicure', 40, 550),
    ('Gel Manicure', 45, 800),
    ('Gel French Manicure', 50, 950),
    ('Gel Removal', 20, 250),
    ('Classic Pedicure', 45, 600),
    ('Spa Pedicure', 60, 900),
    ('Gel Pedicure', 55, 1000),
    ('Paraffin Pedicure', 75, 1200),
    ('Acrylic Full Set', 90, 1800),
    ('Acrylic Fill', 60, 900),
    ('Gel Extensions Full Set', 90, 2000),
    ('Gel Fill', 60, 1000),
    ('Dip Powder Full Set', 75, 1600),
    ('Nail Extension Removal', 30, 400),
    ('Mani-Pedi Classic', 75, 900),
    ('Mani-Pedi Gel', 100, 1600),
    ('Bridal Package', 180, 3500)
  ) as s(name, duration_minutes, price)
  returning id, organization_id, name
),
loc_svc as (
  insert into location_services (organization_id, location_id, service_id)
  select svc.organization_id, loc.id, svc.id
  from svc
  join loc on loc.organization_id = svc.organization_id
),
res as (
  insert into resources (organization_id, location_id, name, role, speciality)
  select organization_id, id, name, 'technician', speciality
  from loc,
  (values
    ('Priya Sharma', 'Gel manicures, nail art, ombre nails'),
    ('Riya Mehta', 'Acrylic extensions, nail sculpting'),
    ('Nisha Joshi', 'Pedicures, spa treatments, classic manicures'),
    ('Kavya Pillai', '3D nail art, chrome nails, detailed designs')
  ) as r(name, speciality)
  returning id, organization_id, location_id, name
),
res_svc as (
  insert into resource_services (organization_id, resource_id, service_id)
  select res.organization_id, res.id, svc.id
  from res
  join svc on svc.organization_id = res.organization_id
  where
    (res.name = 'Priya Sharma' and svc.name in ('Classic Manicure', 'French Manicure', 'Gel Manicure', 'Gel French Manicure', 'Gel Removal', 'Mani-Pedi Gel'))
    or (res.name = 'Riya Mehta' and svc.name in ('Acrylic Full Set', 'Acrylic Fill', 'Gel Extensions Full Set', 'Gel Fill', 'Dip Powder Full Set', 'Nail Extension Removal'))
    or (res.name = 'Nisha Joshi' and svc.name in ('Classic Manicure', 'Classic Pedicure', 'Spa Pedicure', 'Gel Pedicure', 'Paraffin Pedicure', 'Mani-Pedi Classic'))
    or (res.name = 'Kavya Pillai' and svc.name in ('Gel Manicure', 'Gel French Manicure', 'Gel Extensions Full Set', 'Dip Powder Full Set', 'Bridal Package'))
),
res_hours as (
  insert into resource_hours (organization_id, location_id, resource_id, day_of_week, start_time, end_time)
  select organization_id, location_id, id, d, '10:00'::time, '19:00'::time
  from res, unnest(array[1,2,3,4,5,6]) as d
  where name = 'Priya Sharma'
  union all
  select organization_id, location_id, id, d, '10:00'::time, '19:00'::time
  from res, unnest(array[2,3,4,5,6,0]) as d
  where name = 'Riya Mehta'
  union all
  select organization_id, location_id, id, d, '10:00'::time, '19:00'::time
  from res, unnest(array[1,2,3,4,5]) as d
  where name = 'Nisha Joshi'
  union all
  select organization_id, location_id, id, d, '10:00'::time, '19:00'::time
  from res, unnest(array[3,4,5,6,0]) as d
  where name = 'Kavya Pillai'
)
insert into voice_agents (organization_id, location_id, provider_agent_id, webhook_secret)
select organization_id, id, 'agent_polish_bandra', 'replace-this-secret'
from loc;
