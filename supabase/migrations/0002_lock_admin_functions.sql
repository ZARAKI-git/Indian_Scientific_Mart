revoke execute on function public.refresh_brand_counts() from public, anon, authenticated;
grant execute on function public.refresh_brand_counts() to service_role;
