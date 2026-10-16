-- Advisor fixes: invoker-rights is_admin, extension out of public, one SELECT policy
-- per table, initplan-friendly auth.uid(), FK indexes.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

drop policy admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users for select using (user_id = (select auth.uid()));

-- replace "for all" admin policies (which also cover SELECT) with write-only ones
drop policy brands_admin_write on public.brands;
create policy brands_admin_insert on public.brands for insert with check (public.is_admin());
create policy brands_admin_update on public.brands for update using (public.is_admin()) with check (public.is_admin());
create policy brands_admin_delete on public.brands for delete using (public.is_admin());

drop policy categories_admin_write on public.categories;
create policy categories_admin_insert on public.categories for insert with check (public.is_admin());
create policy categories_admin_update on public.categories for update using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete using (public.is_admin());

drop policy products_admin_write on public.products;
create policy products_admin_insert on public.products for insert with check (public.is_admin());
create policy products_admin_update on public.products for update using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete using (public.is_admin());

create index if not exists categories_parent_idx on public.categories (parent_id);
create index if not exists quote_items_product_idx on public.quote_items (product_id);
create index if not exists quote_items_brand_idx on public.quote_items (brand_id);
