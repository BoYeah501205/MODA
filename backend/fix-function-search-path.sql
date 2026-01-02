-- Fix function search_path security warnings
-- Run this in Supabase SQL Editor
-- Date: 2026-01-01
-- 
-- STEP 1: First, run this query to see the actual function signatures:
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'initialize_project_heat_map',
    'handle_new_user', 
    'update_updated_at_column',
    'check_user_exists',
    'link_employee_to_user'
);

-- STEP 2: Run these ALTER statements with correct signatures:

ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.initialize_project_heat_map(p_project_id text) SET search_path = '';
ALTER FUNCTION public.check_user_exists(check_email text) SET search_path = '';
ALTER FUNCTION public.link_employee_to_user(employee_email text) SET search_path = '';
