-- ============================================================================
-- MODA Employee Bulk Import
-- Replace the sample data below with your actual employee data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql/new
-- ============================================================================

INSERT INTO employees (first_name, last_name, email, department, job_title, is_active)
VALUES
    -- Format: ('FirstName', 'LastName', 'email@autovol.com', 'Department', 'Job Title', true)
    ('John', 'Smith', 'john.smith@autovol.com', 'Production', 'Assembly Technician', true),
    ('Jane', 'Doe', 'jane.doe@autovol.com', 'Engineering', 'Design Engineer', true),
    ('Mike', 'Johnson', 'mike.johnson@autovol.com', 'Production', 'Team Lead', true),
    ('Sarah', 'Williams', 'sarah.williams@autovol.com', 'QA', 'Quality Inspector', true),
    ('Bob', 'Brown', 'bob.brown@autovol.com', 'Logistics', 'Shipping Coordinator', true)
    -- Add more rows here, each ending with a comma EXCEPT the last one
    -- ('FirstName', 'LastName', 'email@company.com', 'Department', 'Job Title', true)
;

-- Verify import
SELECT first_name, last_name, email, department, job_title FROM employees ORDER BY last_name;
