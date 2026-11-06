-- The DDL event trigger remains active, but its SECURITY DEFINER function
-- must not be callable through the exposed PostgREST RPC endpoint.
revoke all on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;
