REVOKE ALL ON FUNCTION public.run_all_agents_now() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_all_agents_now() TO authenticated, service_role;