-- Closest-match fallback for searches with no exact result.
-- search_products ANDs every word; this ORs them (prefix match, 3+ letter words) and ranks
-- by how much of the query each item covers. With p_category set, the rest of that category
-- follows the word matches, so a link like "watch glass" in glassware still lands on glassware.
create or replace function public.similar_products(
  q text, p_brand text default null, p_category text default null, p_limit int default 12)
returns table (
  id bigint, code text, name text, pack_size text, cas_no text, list_rate numeric, price_basis text,
  price_on_request boolean, price_as_of date, image_url text, brand_slug text, brand_name text,
  category_slug text, category_name text, total bigint)
language plpgsql stable set search_path = public as $$
declare
  tsq tsquery;
begin
  select to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' | '))
    into tsq
    from (select distinct w
            from unnest(regexp_split_to_array(lower(regexp_replace(coalesce(q, ''), '[^[:alpha:]]+', ' ', 'g')), '\s+')) w
           where length(w) >= 3 and w not in ('and', 'for', 'the', 'with', 'set', 'per')) words;

  if tsq is null and p_category is null then return; end if;

  return query
  select p.id, p.code, p.name, p.pack_size, p.cas_no, p.list_rate, p.price_basis, p.price_on_request,
         p.price_as_of, p.image_url, b.slug, b.name, c.slug, c.name, count(*) over()
    from public.products p
    join public.brands b on b.id = p.brand_id and b.is_active
    left join public.categories c on c.id = p.category_id
   where p.is_active and not p.needs_review
     and (p_brand is null or b.slug = p_brand)
     and (p_category is null or c.slug = p_category)
     and (p_category is not null or p.search_tsv @@ tsq)
   order by (tsq is not null and p.search_tsv @@ tsq) desc,
            ts_rank(p.search_tsv, coalesce(tsq, ''::tsquery)) desc,
            p.name asc, p.id asc
   limit least(greatest(p_limit, 1), 24);
end $$;
