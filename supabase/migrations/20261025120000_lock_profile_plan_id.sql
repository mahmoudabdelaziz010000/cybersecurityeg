-- Security fix: users must not be able to change their own plan.
-- plan_id is only ever written by the server (service_role) after a confirmed payment.
-- Replace the table-wide UPDATE/INSERT grants with column-level grants that exclude plan_id.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, email, display_name) ON public.profiles TO authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
