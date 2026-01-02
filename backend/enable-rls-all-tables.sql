-- Enable Row Level Security on all public tables
-- Run this in Supabase SQL Editor to fix security warnings
-- Date: 2026-01-01

-- Tables with existing policies but RLS disabled
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_heat_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_staggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;

-- Tables without any policies - enable RLS and add basic authenticated access policies
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stagger_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trashed_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trashed_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_modules ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for tables that don't have any yet

-- departments: Allow authenticated users full access
CREATE POLICY "Authenticated users can view departments" ON public.departments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage departments" ON public.departments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- weekly_schedules: Allow authenticated users full access
CREATE POLICY "Authenticated users can view weekly_schedules" ON public.weekly_schedules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage weekly_schedules" ON public.weekly_schedules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- stagger_change_log: Allow authenticated users full access
CREATE POLICY "Authenticated users can view stagger_change_log" ON public.stagger_change_log
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage stagger_change_log" ON public.stagger_change_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- engineering_issues: Allow authenticated users full access
CREATE POLICY "Authenticated users can view engineering_issues" ON public.engineering_issues
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage engineering_issues" ON public.engineering_issues
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- trashed_projects: Allow authenticated users full access (for restore functionality)
CREATE POLICY "Authenticated users can view trashed_projects" ON public.trashed_projects
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage trashed_projects" ON public.trashed_projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- trashed_employees: Allow authenticated users full access (for restore functionality)
CREATE POLICY "Authenticated users can view trashed_employees" ON public.trashed_employees
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage trashed_employees" ON public.trashed_employees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- unified_modules: Allow authenticated users full access
CREATE POLICY "Authenticated users can view unified_modules" ON public.unified_modules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage unified_modules" ON public.unified_modules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
