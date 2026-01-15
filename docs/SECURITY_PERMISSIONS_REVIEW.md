# MODA Security & Permissions Architecture Review

> **Analysis Date:** January 2025  
> **Purpose:** Evaluate security implementation for multi-user deployment  
> **Focus:** RBAC, Supabase RLS, data protection, audit trails

---

## Executive Summary

MODA has a **solid RBAC foundation** with 14 defined roles and granular tab-level permissions. However, the current implementation relies primarily on **client-side enforcement**, which is insufficient for multi-user production deployment.

| Area | Status | Risk Level |
|------|--------|------------|
| Role Definitions | ✅ Complete | Low |
| Client-Side Permissions | ✅ Complete | N/A |
| Supabase RLS | 🟡 Basic | Medium |
| Data Encryption | ❌ Missing | Medium |
| Audit Logging | 🟡 Partial | Low |
| Department Isolation | ❌ Missing | High |

---

## 1. Current RBAC Implementation

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        ROLE HIERARCHY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ADMIN (Full Access)                                            │
│  ├── All tabs visible                                           │
│  ├── All CRUD operations                                        │
│  ├── User management                                            │
│  └── Protected from deletion                                    │
│                                                                  │
│  MANAGEMENT ROLES                                                │
│  ├── production_management (Production, Projects, Schedule)     │
│  ├── executive (Read-only overview)                             │
│  └── department-supervisor (Department view)                    │
│                                                                  │
│  SPECIALIST ROLES                                                │
│  ├── production_supervisor (Weekly Board editing)               │
│  ├── qa_inspector (QA records)                                  │
│  ├── transportation (Yard, shipping)                            │
│  ├── supply_chain (Inventory, materials)                        │
│  ├── preconstruction (Project setup)                            │
│  ├── onsite (Field operations)                                  │
│  ├── engineering (Documentation, issues)                        │
│  ├── maintenance (Equipment)                                    │
│  └── coordinator (Cross-department)                             │
│                                                                  │
│  BASE ROLES                                                      │
│  ├── employee (Production view only, default)                   │
│  └── no-access (Disabled account)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Structure

Each role has:
- **tabs** - Array of visible tab IDs
- **capabilities** - Object with boolean flags:
  - `canEdit` - Can modify data
  - `canDelete` - Can remove records
  - `canCreate` - Can add new records
  - `canManageUsers` - Can manage user accounts
  - `canAccessAdmin` - Can access admin panel
  - `canExportData` - Can export data
- **editableTabs** - Array of tabs where user can modify data
- **tabPermissions** - Granular per-tab permissions (new structure)

### Permission Check Functions

```javascript
// Global functions in dashboardRoles.js
window.canUserEditTab(tabId)           // Check if current user can edit tab
window.canUserPerformAction(tabId, action)  // Check specific action
window.getUserVisibleTabs()            // Get array of visible tabs
window.userHasCustomPermissions()      // Check for custom overrides
window.getUserCustomPermissions()      // Get custom permission object
```

### Protected Users

```javascript
// trevor@autovol.com is protected
if (profile?.is_protected) return true;  // Always has full access
```

---

## 2. Current Supabase RLS Status

### Current Policy Pattern (Permissive)

All tables currently use the same permissive pattern:

```sql
-- Current: All authenticated users can do everything
CREATE POLICY "Allow authenticated read" ON projects
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

**Problem:** This provides no actual data isolation. Any authenticated user can read/write all data.

### Tables with RLS Enabled

| Table | RLS Enabled | Policy Type |
|-------|-------------|-------------|
| projects | ✅ | Permissive (all authenticated) |
| employees | ✅ | Permissive (all authenticated) |
| modules | ✅ | Permissive (all authenticated) |
| profiles | ✅ | Permissive (all authenticated) |
| weekly_schedules | ✅ | Permissive (all authenticated) |
| station_staggers | ✅ | Permissive (all authenticated) |
| production_weeks | ✅ | Permissive (all authenticated) |
| stagger_change_log | ✅ | Permissive (all authenticated) |
| transport | ✅ | Permissive (all authenticated) |
| transport_yards | ✅ | Permissive (all authenticated) |
| transport_companies | ✅ | Permissive (all authenticated) |
| transport_modules | ✅ | Permissive (all authenticated) |
| departments | ✅ | Permissive (all authenticated) |
| engineering_issues | ✅ | Permissive (all authenticated) |
| activity_log | ✅ | Permissive (all authenticated) |
| drawings | ✅ | Permissive (all authenticated) |
| drawing_sheets | ✅ | Permissive (all authenticated) |

---

## 3. Security Gaps

### Gap 1: Client-Side Only Permission Enforcement

**Current:** Permissions checked in React components
```jsx
// Example from App.jsx
{auth.canEditTab('production') && (
    <button onClick={handleEdit}>Edit</button>
)}
```

**Risk:** Malicious users can:
- Modify JavaScript in browser
- Call Supabase API directly
- Bypass all UI restrictions

**Fix:** Implement server-side RLS policies that mirror client permissions.

### Gap 2: No Department/Project Isolation

**Current:** All users see all data
**Risk:** 
- Employees see other departments' data
- Sensitive project info exposed
- No multi-tenant capability

**Fix:** Add department_id and project access tables.

### Gap 3: localStorage Data Exposure

**Current:** Sensitive data stored unencrypted:
```javascript
localStorage.setItem('autovol_projects', JSON.stringify(projects));
localStorage.setItem('autovol_employees', JSON.stringify(employees));
localStorage.setItem('autovol_users', JSON.stringify(users));
```

**Risk:**
- Anyone with device access can read data
- Browser extensions can access localStorage
- Data persists after logout

**Fix:** 
- Minimize localStorage usage
- Clear on logout
- Consider encryption for sensitive fields

### Gap 4: Missing Audit Trail for All Changes

**Current:** Partial logging via ActivityLog
```javascript
if (window.ActivityLog) {
    window.ActivityLog.logCreate('project', 'project', data.id, data.name, { status: data.status });
}
```

**Risk:** Not all changes are logged, inconsistent coverage.

**Fix:** Implement database triggers for comprehensive audit logging.

---

## 4. Recommended RLS Policies

### Helper Function: Check User Role

```sql
-- Create helper function to get user's dashboard role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT dashboard_role 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin or protected
CREATE OR REPLACE FUNCTION is_admin_or_protected()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (dashboard_role = 'admin' OR is_protected = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Projects Table RLS

```sql
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow authenticated read" ON projects;
DROP POLICY IF EXISTS "Allow authenticated write" ON projects;

-- Read: All authenticated users can view all projects
-- (For now - can add project-level access later)
CREATE POLICY "projects_select" ON projects
    FOR SELECT TO authenticated
    USING (true);

-- Insert: Only users with canCreate capability
CREATE POLICY "projects_insert" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'preconstruction')
    );

-- Update: Only users with canEdit on projects tab
CREATE POLICY "projects_update" ON projects
    FOR UPDATE TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'preconstruction', 'production_supervisor')
    );

-- Delete: Only admins
CREATE POLICY "projects_delete" ON projects
    FOR DELETE TO authenticated
    USING (is_admin_or_protected());
```

### Modules Table RLS

```sql
-- Read: All authenticated users
CREATE POLICY "modules_select" ON modules
    FOR SELECT TO authenticated
    USING (true);

-- Insert: Users who can edit projects
CREATE POLICY "modules_insert" ON modules
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'preconstruction', 'production_supervisor')
    );

-- Update: Users who can edit production
CREATE POLICY "modules_update" ON modules
    FOR UPDATE TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'production_supervisor', 'qa_inspector')
    );

-- Delete: Only admins
CREATE POLICY "modules_delete" ON modules
    FOR DELETE TO authenticated
    USING (is_admin_or_protected());
```

### Employees Table RLS

```sql
-- Read: All authenticated users
CREATE POLICY "employees_select" ON employees
    FOR SELECT TO authenticated
    USING (true);

-- Insert/Update/Delete: Only admins and HR roles
CREATE POLICY "employees_modify" ON employees
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() = 'production_management'
    )
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() = 'production_management'
    );
```

### Profiles Table RLS

```sql
-- Read: All authenticated users can see all profiles
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT TO authenticated
    USING (true);

-- Insert: Allow new user profile creation
CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Update own profile: Any user
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Update any profile: Admins only
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE TO authenticated
    USING (is_admin_or_protected());

-- Delete: Never (soft delete only)
CREATE POLICY "profiles_delete" ON profiles
    FOR DELETE TO authenticated
    USING (false);
```

### Weekly Schedules RLS (Restricted)

```sql
-- Read: All authenticated users
CREATE POLICY "weekly_schedules_select" ON weekly_schedules
    FOR SELECT TO authenticated
    USING (true);

-- Modify: Only specific users (trevor@autovol.com, stephanie@autovol.com)
CREATE POLICY "weekly_schedules_modify" ON weekly_schedules
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND email IN ('trevor@autovol.com', 'stephanie@autovol.com')
        )
    )
    WITH CHECK (
        is_admin_or_protected() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND email IN ('trevor@autovol.com', 'stephanie@autovol.com')
        )
    );
```

---

## 5. Department Isolation (Future)

### Schema Addition

```sql
-- Add department_id to relevant tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Create project access table
CREATE TABLE IF NOT EXISTS project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;
```

### Department-Based RLS Example

```sql
-- Employees: Users can only see employees in their department (or all if admin)
CREATE POLICY "employees_department_select" ON employees
    FOR SELECT TO authenticated
    USING (
        is_admin_or_protected() OR
        department_id = (SELECT department_id FROM profiles WHERE id = auth.uid()) OR
        department_id IS NULL
    );
```

---

## 6. Audit Logging Enhancement

### Database Trigger for Audit

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables
CREATE TRIGGER projects_audit AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
    
CREATE TRIGGER modules_audit AFTER INSERT OR UPDATE OR DELETE ON modules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
    
CREATE TRIGGER employees_audit AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 7. localStorage Security

### Current Sensitive Keys

```javascript
// Keys containing sensitive data
'autovol_projects'      // Project details, module specs
'autovol_employees'     // Employee personal info
'autovol_users'         // User accounts, roles
'autovol_unified_modules'  // Module data
'autovol_current_user'  // Session data (sessionStorage)
```

### Recommended Cleanup on Logout

```javascript
// Add to logout function
function secureLogout() {
    // Clear session
    sessionStorage.removeItem('autovol_current_user');
    
    // Clear sensitive cached data
    const sensitiveKeys = [
        'autovol_projects',
        'autovol_employees', 
        'autovol_users',
        'autovol_unified_modules'
    ];
    
    sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Keep non-sensitive preferences
    // 'autovol_dashboard_roles' - role definitions (not sensitive)
    // 'autovol_theme' - UI preferences
    
    // Redirect to login
    window.location.href = '/';
}
```

---

## 8. Implementation Priority

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Implement role-based RLS policies | 2 days | 🔴 Critical |
| 2 | Add audit triggers to critical tables | 1 day | 🟡 High |
| 3 | Secure logout (clear localStorage) | 0.5 days | 🟡 Medium |
| 4 | Add department isolation schema | 2 days | 🟡 Medium |
| 5 | Implement project-level access | 3 days | 🟢 Low (future) |

---

## 9. Migration Script

```sql
-- ============================================================================
-- MODA SECURITY UPGRADE - RUN IN SUPABASE SQL EDITOR
-- ============================================================================

-- Step 1: Create helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT dashboard_role FROM profiles WHERE id = auth.uid()),
        'employee'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_protected()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (dashboard_role = 'admin' OR is_protected = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update projects policies
DROP POLICY IF EXISTS "Allow authenticated read" ON projects;
DROP POLICY IF EXISTS "Allow authenticated write" ON projects;

CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated 
    WITH CHECK (is_admin_or_protected() OR get_user_role() IN ('production_management', 'preconstruction'));
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated 
    USING (is_admin_or_protected() OR get_user_role() IN ('production_management', 'preconstruction', 'production_supervisor'));
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated 
    USING (is_admin_or_protected());

-- Step 3: Update modules policies
DROP POLICY IF EXISTS "Allow authenticated read" ON modules;
DROP POLICY IF EXISTS "Allow authenticated write" ON modules;

CREATE POLICY "modules_select" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_insert" ON modules FOR INSERT TO authenticated 
    WITH CHECK (is_admin_or_protected() OR get_user_role() IN ('production_management', 'preconstruction', 'production_supervisor'));
CREATE POLICY "modules_update" ON modules FOR UPDATE TO authenticated 
    USING (is_admin_or_protected() OR get_user_role() IN ('production_management', 'production_supervisor', 'qa_inspector'));
CREATE POLICY "modules_delete" ON modules FOR DELETE TO authenticated 
    USING (is_admin_or_protected());

-- Step 4: Verify
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

---

## 10. Summary

### Current Strengths
- Well-defined role hierarchy with 14 roles
- Granular tab-level permissions
- Protected user support
- Custom per-user permission overrides
- Real-time role sync via Supabase

### Critical Gaps to Address
1. **RLS policies are too permissive** - Need role-based restrictions
2. **No department isolation** - All users see all data
3. **Client-side only enforcement** - Bypassable
4. **localStorage exposure** - Sensitive data persists

### Recommended Next Steps
1. Run migration script to add role-based RLS
2. Implement secure logout with data cleanup
3. Add audit triggers for compliance
4. Plan department isolation for multi-site
