-- Logos re-exported as transparent PNGs (edge white removed) for the hero coverflow.
update public.brands b set logo_url = v.url
from (values
  ('dp-labman',   '/logos/dp-labman.png'),
  ('dp-wensar',   '/logos/dp-wensar.png'),
  ('loba-chemie', '/logos/loba-chemie.png'),
  ('omsons',      '/logos/omsons.png')
) as v(slug, url)
where b.slug = v.slug;
