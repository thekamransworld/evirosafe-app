-- ENABLE UUID
create extension if not exists "uuid-ossp";

-- ORGANIZATIONS
create table organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  domain text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USERS
create table users (
  id uuid primary key, -- matches auth.users.id
  org_id uuid references organizations(id),
  email text not null,
  name text not null,
  role text not null default 'WORKER',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROJECTS
create table projects (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references organizations(id),
  name text not null,
  location text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- REPORTS (Incidents, Observations)
create table reports (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references organizations(id),
  project_id uuid references projects(id),
  reporter_id uuid references users(id),
  type text not null,
  description text,
  risk_severity int,
  risk_likelihood int,
  status text default 'submitted',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- PERMITS (PTW)
create table ptws (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references organizations(id),
  project_id uuid references projects(id),
  type text not null,
  status text default 'DRAFT',
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS POLICIES (Row Level Security)
alter table organizations enable row level security;
alter table users enable row level security;
alter table projects enable row level security;
alter table reports enable row level security;
alter table ptws enable row level security;

-- Example Policy: Users can read data from their own organization
create policy "Users can view own org data" on organizations
  for select using (id = (select org_id from users where id = auth.uid()));