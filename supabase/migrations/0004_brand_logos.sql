-- Brand logos for the catalogue's brand spotlight.
-- logo_url is a same-origin /logos/ path (files live in public/logos) or an https URL.
-- logo_needs_chip puts the logo on a white chip; set per brand after visual review.

alter table public.brands
  add column logo_url        text,
  add column logo_needs_chip boolean not null default false,
  add constraint brands_logo_url_check check (logo_url is null or logo_url ~ '^(/logos/[a-z0-9-]+\.(svg|png|jpg|webp)|https://)');

update public.brands b set logo_url = v.url
from (values
  ('borosil',        '/logos/borosil.svg'),
  ('cytiva-whatman', '/logos/cytiva-whatman.svg'),
  ('dp-labman',      '/logos/dp-labman.webp'),
  ('dp-wensar',      '/logos/dp-wensar.webp'),
  ('jsgw',           '/logos/jsgw.png'),
  ('labtronics',     '/logos/labtronics.png'),
  ('loba-chemie',    '/logos/loba-chemie.jpg'),
  ('merck',          '/logos/merck.svg'),
  ('omsons',         '/logos/omsons.jpg'),
  ('polylab',        '/logos/polylab.png'),
  ('rakiro-aquasol', '/logos/rakiro-aquasol.png'),
  ('remi',           '/logos/remi.jpg'),
  ('riviera',        '/logos/riviera.webp'),
  ('srl',            '/logos/srl.png'),
  ('tarsons',        '/logos/tarsons.png'),
  ('thermofisher',   '/logos/thermofisher.png')
) as v(slug, url)
where b.slug = v.slug;

-- Supports the per-brand category tally below.
create index products_brand_category_idx on public.products (brand_id, category_id) where is_active and not needs_review;

-- One row per listed brand with its most common live category.
-- security_invoker: callers see only what brands/products RLS already allows them to.
create view public.brand_showcase with (security_invoker = on) as
select b.id, b.name, b.slug, b.logo_url, b.logo_needs_chip, b.display_order,
  (select c.name
     from public.products p join public.categories c on c.id = p.category_id
    where p.brand_id = b.id and p.is_active and not p.needs_review
    group by c.name
    order by count(*) desc, c.name
    limit 1) as category
from public.brands b
where b.is_active and b.product_count > 0;

grant select on public.brand_showcase to anon, authenticated;
