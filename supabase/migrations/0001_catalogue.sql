-- Indian Scientific Mart — catalogue, quotes, admin.
create extension if not exists pg_trgm;

create table public.brands (
  id            bigint generated always as identity primary key,
  name          text not null,
  slug          text not null unique,
  country       text,
  source_file   text,
  product_count integer not null default 0,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  price_basis   text not null default 'unknown' check (price_basis in ('excl_gst','incl_gst','unknown')),
  price_as_of   date,
  note          text,
  updated_at    timestamptz not null default now()
);

create table public.categories (
  id            bigint generated always as identity primary key,
  name          text not null,
  slug          text not null unique,
  parent_id     bigint references public.categories(id) on delete set null,
  display_order integer not null default 0
);

create table public.products (
  id               bigint generated always as identity primary key,
  brand_id         bigint not null references public.brands(id) on delete cascade,
  category_id      bigint references public.categories(id) on delete set null,
  code             text not null,
  name             text not null,
  description      text,
  cas_no           text,
  pack_size        text,
  unit             text,
  hsn_code         text,
  gst_rate         smallint,
  list_rate        numeric(14,2),
  currency         text not null default 'INR',
  price_basis      text not null default 'unknown' check (price_basis in ('excl_gst','incl_gst','unknown')),
  price_on_request boolean not null default false,
  price_as_of      date,
  image_url        text,
  specs            jsonb not null default '{}'::jsonb,
  source_file      text,
  source_page      integer,
  is_active        boolean not null default true,
  needs_review     boolean not null default false,
  review_reason    text,
  updated_at       timestamptz not null default now(),
  search_tsv       tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(code,'') || ' ' || regexp_replace(coalesce(code,''), '[^A-Za-z0-9]', '', 'g')), 'A') ||
    setweight(to_tsvector('simple', coalesce(cas_no,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'D')
  ) stored,
  unique (brand_id, code)
);

create index products_brand_idx    on public.products (brand_id) where is_active and not needs_review;
create index products_category_idx on public.products (category_id) where is_active and not needs_review;
create index products_search_idx   on public.products using gin (search_tsv);
create index products_code_trgm    on public.products using gin (code gin_trgm_ops);
create index products_name_trgm    on public.products using gin (name gin_trgm_ops);
create index products_review_idx   on public.products (brand_id) where needs_review;

create table public.quote_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  institution text check (char_length(institution) <= 120),
  email       text not null check (char_length(email) <= 120),
  phone       text check (char_length(phone) <= 20),
  message     text check (char_length(message) <= 4000),
  needs       text[] not null default '{}',
  status      text not null default 'new' check (status in ('new','in_progress','quoted','closed')),
  notified    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.quote_items (
  id                    bigint generated always as identity primary key,
  quote_request_id      uuid not null references public.quote_requests(id) on delete cascade,
  product_id            bigint references public.products(id) on delete set null,
  brand_id              bigint references public.brands(id) on delete set null,
  product_name_snapshot text not null,
  code_snapshot         text not null,
  brand_snapshot        text,
  list_rate_snapshot    numeric(14,2),
  qty                   integer not null check (qty between 1 and 100000),
  note                  text check (char_length(note) <= 300)
);
create index quote_items_request_idx on public.quote_items (quote_request_id);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- product_count is maintained from the live (active, reviewed) catalogue
create or replace function public.refresh_brand_counts() returns void
language sql security definer set search_path = public as $$
  update public.brands b set product_count = coalesce(c.n, 0), updated_at = now()
  from (select b2.id, count(p.id) n from public.brands b2
        left join public.products p on p.brand_id = b2.id and p.is_active and not p.needs_review
        group by b2.id) c
  where c.id = b.id;
$$;

-- Catalogue search: prefix full-text over name/code/CAS plus code substring,
-- with filters, sorting and a total count in one round trip.
create or replace function public.search_products(
  q text default null, p_brand text default null, p_category text default null,
  p_basis text default null, p_sort text default 'relevance', p_limit int default 50, p_offset int default 0)
returns table (
  id bigint, code text, name text, pack_size text, cas_no text, list_rate numeric, price_basis text,
  price_on_request boolean, price_as_of date, image_url text, brand_slug text, brand_name text,
  category_slug text, category_name text, total bigint)
language plpgsql stable set search_path = public as $$
declare
  tsq tsquery;
  qq text := nullif(trim(coalesce(q, '')), '');
begin
  if qq is not null then
    select to_tsquery('simple', string_agg(quote_literal(t) || ':*', ' & '))
      into tsq
      from unnest(regexp_split_to_array(lower(regexp_replace(qq, '[^[:alnum:].\-]+', ' ', 'g')), '\s+')) t
     where t <> '';
  end if;
  return query
  select p.id, p.code, p.name, p.pack_size, p.cas_no, p.list_rate, p.price_basis, p.price_on_request,
         p.price_as_of, p.image_url, b.slug, b.name, c.slug, c.name, count(*) over()
    from public.products p
    join public.brands b on b.id = p.brand_id and b.is_active
    left join public.categories c on c.id = p.category_id
   where p.is_active and not p.needs_review
     and (p_brand is null or b.slug = p_brand)
     and (p_category is null or c.slug = p_category)
     and (p_basis is null or p.price_basis = p_basis)
     and (qq is null or (tsq is not null and p.search_tsv @@ tsq) or p.code ilike qq || '%' or p.cas_no = qq)
   order by
     case when p_sort = 'relevance' and qq is not null then
       (case when lower(p.code) = lower(qq) then 10 else 0 end) + ts_rank(p.search_tsv, coalesce(tsq, ''::tsquery)) end desc nulls last,
     case when p_sort = 'price_asc'  then p.list_rate end asc nulls last,
     case when p_sort = 'price_desc' then p.list_rate end desc nulls last,
     case when p_sort = 'code' then p.code end asc,
     p.name asc, p.id asc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.brands         enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_items    enable row level security;
alter table public.admin_users    enable row level security;

create policy brands_public_read on public.brands for select using (is_active or public.is_admin());
create policy brands_admin_write on public.brands for all using (public.is_admin()) with check (public.is_admin());
create policy categories_public_read on public.categories for select using (true);
create policy categories_admin_write on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy products_public_read on public.products for select
  using ((is_active and not needs_review and exists (select 1 from public.brands b where b.id = brand_id and b.is_active)) or public.is_admin());
create policy products_admin_write on public.products for all using (public.is_admin()) with check (public.is_admin());
-- quotes are written by the server with the service role; only admins read them
create policy quotes_admin on public.quote_requests for all using (public.is_admin()) with check (public.is_admin());
create policy quote_items_admin on public.quote_items for all using (public.is_admin()) with check (public.is_admin());
create policy admin_users_self on public.admin_users for select using (user_id = auth.uid());

revoke execute on function public.refresh_brand_counts() from anon, authenticated;
