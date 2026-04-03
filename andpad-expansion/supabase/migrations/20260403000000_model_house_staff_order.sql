create table if not exists model_house_staff_order (
  id uuid primary key default gen_random_uuid(),
  model_house text not null,
  staff_name text not null,
  sort_order integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (model_house, staff_name)
);

alter table model_house_staff_order enable row level security;
create policy "Allow all" on model_house_staff_order for all using (true) with check (true);
