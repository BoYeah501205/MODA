# Multi-Tenant Architecture Plan

> **Status**: Planning Document - Not Yet Implemented  
> **Created**: January 15, 2025  
> **Purpose**: Reference guide for implementing multi-company and multi-factory support in MODA

---

## Overview

MODA will support multiple companies (organizations) and multiple factories per company. This document outlines the architecture decisions and implementation plan.

### Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Supabase Project | **Single shared** | Easier to manage, shared schema, RLS for isolation |
| Factory Switching | **Filter data** (no page reload) | Better UX, faster switching |
| Remember Selection | **Yes, localStorage** | Convenience for users |
| Cross-Factory Views | **Yes, for admins/executives** | Aggregate metrics across factories |
| URL Strategy | **Path-based/query params for MVP** | Simpler hosting, add subdomains later |
| Migration | **Backfill existing data** | All current data → Autovol/Nampa |

---

## Database Schema

### New Tables

```sql
-- ============================================================================
-- ORGANIZATIONS (Companies like Autovol, Company2)
-- ============================================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,           -- 'autovol', 'company2' (for URL/subdomain)
    name TEXT NOT NULL,                  -- 'Autovol'
    logo_url TEXT,                       -- Company logo
    primary_color TEXT,                  -- Brand color (optional theming)
    settings JSONB DEFAULT '{}',         -- Company-specific settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FACTORIES (Nampa, Factory2, Phoenix, etc.)
-- ============================================================================
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    slug TEXT NOT NULL,                  -- 'nampa', 'factory2' (for URL)
    name TEXT NOT NULL,                  -- 'Nampa Factory'
    location TEXT,                       -- Address or city
    timezone TEXT DEFAULT 'America/Boise',
    settings JSONB DEFAULT '{}',         -- Factory-specific settings (stations, shifts, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)        -- Slug unique within organization
);

-- ============================================================================
-- USER FACTORY ACCESS (Many-to-many relationship)
-- Which factories can each user access?
-- ============================================================================
CREATE TABLE user_factory_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    factory_id UUID REFERENCES factories(id) ON DELETE CASCADE NOT NULL,
    is_default BOOLEAN DEFAULT false,    -- User's default factory on login
    access_level TEXT DEFAULT 'standard', -- 'standard', 'manager', 'admin'
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, factory_id)
);

-- Ensure only one default factory per user
CREATE UNIQUE INDEX idx_user_default_factory 
ON user_factory_access(user_id) 
WHERE is_default = true;
```

### Profile Table Updates

```sql
-- Add organization link to profiles
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN default_factory_id UUID REFERENCES factories(id);

-- Index for faster lookups
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
```

### Data Table Updates

All tenant-scoped tables need a `factory_id` column:

```sql
-- Projects
ALTER TABLE projects ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_projects_factory ON projects(factory_id);

-- Modules
ALTER TABLE modules ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_modules_factory ON modules(factory_id);

-- Employees
ALTER TABLE employees ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_employees_factory ON employees(factory_id);

-- Weekly Schedules
ALTER TABLE weekly_schedules ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_weekly_schedules_factory ON weekly_schedules(factory_id);

-- Completed Weeks
ALTER TABLE completed_weeks ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_completed_weeks_factory ON completed_weeks(factory_id);

-- Departments
ALTER TABLE departments ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_departments_factory ON departments(factory_id);

-- Station Assignments
ALTER TABLE station_assignments ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_station_assignments_factory ON station_assignments(factory_id);

-- QA Issues
ALTER TABLE qa_issues ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_qa_issues_factory ON qa_issues(factory_id);

-- Transport/Yard data
ALTER TABLE yard_locations ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_yard_locations_factory ON yard_locations(factory_id);

-- Equipment
ALTER TABLE equipment ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_equipment_factory ON equipment(factory_id);

-- RFIs
ALTER TABLE rfis ADD COLUMN factory_id UUID REFERENCES factories(id);
CREATE INDEX idx_rfis_factory ON rfis(factory_id);

-- Activity Log (optional - may want org-level visibility)
ALTER TABLE activity_log ADD COLUMN factory_id UUID REFERENCES factories(id);
ALTER TABLE activity_log ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

---

## Row-Level Security (RLS) Policies

### Organization Isolation

```sql
-- Users can only see data from their organization
CREATE POLICY "Users see own organization data" ON projects
    FOR ALL USING (
        factory_id IN (
            SELECT factory_id FROM user_factory_access 
            WHERE user_id = auth.uid()
        )
    );

-- Repeat for all tenant-scoped tables
```

### Factory-Level Access

```sql
-- Users can only see data from factories they have access to
CREATE POLICY "Users see accessible factory data" ON projects
    FOR SELECT USING (
        factory_id IN (
            SELECT factory_id FROM user_factory_access 
            WHERE user_id = auth.uid()
        )
    );

-- Write access may be more restrictive
CREATE POLICY "Users write to accessible factories" ON projects
    FOR INSERT WITH CHECK (
        factory_id IN (
            SELECT factory_id FROM user_factory_access 
            WHERE user_id = auth.uid()
            AND access_level IN ('standard', 'manager', 'admin')
        )
    );
```

### Cross-Factory Views (Admins/Executives)

```sql
-- Organization admins can see all factories in their org
CREATE POLICY "Org admins see all org factories" ON projects
    FOR SELECT USING (
        factory_id IN (
            SELECT f.id FROM factories f
            JOIN profiles p ON p.organization_id = f.organization_id
            WHERE p.id = auth.uid()
            AND p.dashboard_role IN ('admin', 'executive')
        )
    );
```

---

## Migration Plan

### Step 1: Create Autovol Organization

```sql
INSERT INTO organizations (slug, name, settings) VALUES 
('autovol', 'Autovol', '{"industry": "modular_construction"}');
```

### Step 2: Create Nampa Factory

```sql
INSERT INTO factories (organization_id, slug, name, location, timezone) VALUES 
(
    (SELECT id FROM organizations WHERE slug = 'autovol'),
    'nampa',
    'Nampa Factory',
    'Nampa, Idaho',
    'America/Boise'
);
```

### Step 3: Backfill Existing Data

```sql
-- Set factory_id on all existing projects
UPDATE projects SET factory_id = (
    SELECT id FROM factories WHERE slug = 'nampa'
) WHERE factory_id IS NULL;

-- Repeat for all tables...
UPDATE modules SET factory_id = (SELECT id FROM factories WHERE slug = 'nampa') WHERE factory_id IS NULL;
UPDATE employees SET factory_id = (SELECT id FROM factories WHERE slug = 'nampa') WHERE factory_id IS NULL;
-- etc.
```

### Step 4: Update User Profiles

```sql
-- Assign all existing users to Autovol organization
UPDATE profiles SET organization_id = (
    SELECT id FROM organizations WHERE slug = 'autovol'
) WHERE organization_id IS NULL;

-- Grant all existing users access to Nampa factory
INSERT INTO user_factory_access (user_id, factory_id, is_default)
SELECT 
    p.id,
    (SELECT id FROM factories WHERE slug = 'nampa'),
    true
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM user_factory_access ufa WHERE ufa.user_id = p.id
);
```

### Step 5: Make factory_id NOT NULL (after backfill)

```sql
ALTER TABLE projects ALTER COLUMN factory_id SET NOT NULL;
ALTER TABLE modules ALTER COLUMN factory_id SET NOT NULL;
-- etc.
```

---

## Frontend Implementation

### Factory Context Provider

```javascript
// js/contexts/FactoryContext.jsx
const FactoryContext = React.createContext();

function FactoryProvider({ children }) {
    const [currentFactory, setCurrentFactory] = useState(null);
    const [availableFactories, setAvailableFactories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load user's factory access on auth
    useEffect(() => {
        async function loadFactoryAccess() {
            const { data } = await supabase
                .from('user_factory_access')
                .select(`
                    factory_id,
                    is_default,
                    factories (id, slug, name, organization_id)
                `)
                .eq('user_id', currentUser.id);
            
            setAvailableFactories(data.map(d => d.factories));
            
            // Set default or last-selected factory
            const lastSelected = localStorage.getItem('moda_selected_factory');
            const defaultFactory = data.find(d => d.is_default)?.factories;
            
            setCurrentFactory(
                data.find(d => d.factory_id === lastSelected)?.factories 
                || defaultFactory 
                || data[0]?.factories
            );
            setIsLoading(false);
        }
        
        if (currentUser) loadFactoryAccess();
    }, [currentUser]);

    const switchFactory = (factoryId) => {
        const factory = availableFactories.find(f => f.id === factoryId);
        if (factory) {
            setCurrentFactory(factory);
            localStorage.setItem('moda_selected_factory', factoryId);
        }
    };

    return (
        <FactoryContext.Provider value={{
            currentFactory,
            availableFactories,
            switchFactory,
            isLoading,
            hasMultipleFactories: availableFactories.length > 1
        }}>
            {children}
        </FactoryContext.Provider>
    );
}
```

### Factory Switcher Component

```javascript
// js/components/FactorySwitcher.jsx
function FactorySwitcher() {
    const { currentFactory, availableFactories, switchFactory, hasMultipleFactories } = useFactory();
    
    if (!hasMultipleFactories) {
        // Single factory user - just show factory name
        return <span className="factory-name">{currentFactory?.name}</span>;
    }
    
    return (
        <select 
            value={currentFactory?.id} 
            onChange={(e) => switchFactory(e.target.value)}
            className="factory-switcher"
        >
            {availableFactories.map(factory => (
                <option key={factory.id} value={factory.id}>
                    {factory.name}
                </option>
            ))}
        </select>
    );
}
```

### Data Query Updates

All data queries need to include factory filter:

```javascript
// Before (current)
const { data } = await supabase.from('projects').select('*');

// After (multi-tenant)
const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('factory_id', currentFactory.id);
```

### "All Factories" View for Admins

```javascript
// Special aggregate view for admins/executives
async function getAllFactoriesData() {
    const { data } = await supabase
        .from('projects')
        .select('*, factories(name)')
        .in('factory_id', availableFactories.map(f => f.id));
    
    // Group by factory for display
    return groupBy(data, 'factory_id');
}
```

---

## URL Routing

### MVP: Query Parameters

```javascript
// Development and initial production
// app.modulardashboard.com?org=autovol&factory=nampa

function getFactoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        org: params.get('org'),
        factory: params.get('factory')
    };
}
```

### Future: Subdomain Detection

```javascript
// autovol.modulardashboard.com
// factory2.autovol.modulardashboard.com

function getFactoryFromSubdomain() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (parts.length >= 3) {
        // factory2.autovol.modulardashboard.com
        return { org: parts[1], factory: parts[0] };
    } else if (parts.length === 2 || parts[0] !== 'app') {
        // autovol.modulardashboard.com
        return { org: parts[0], factory: null }; // Use default factory
    }
    
    return { org: null, factory: null }; // Main app, use user's default
}
```

### Auto-Redirect on Login

```javascript
async function handleLoginSuccess(user, profile) {
    // Get user's organization
    const { data: org } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', profile.organization_id)
        .single();
    
    // Redirect to org subdomain (future)
    // window.location.href = `https://${org.slug}.modulardashboard.com`;
    
    // Or set query params (MVP)
    const url = new URL(window.location);
    url.searchParams.set('org', org.slug);
    window.history.replaceState({}, '', url);
}
```

---

## User Experience Flows

### Trevor's Experience (Multi-Factory Admin)

1. Logs in at `app.modulardashboard.com`
2. System detects: Trevor → Autovol → Nampa (default) + Factory2, Factory3 access
3. Loads Nampa factory data by default
4. Header shows: `Nampa Factory ▼` dropdown
5. Can switch to Factory2 or Factory3 anytime
6. As admin, can also access "All Factories" aggregate view

### Floor Worker Experience (Single Factory)

1. Logs in at `app.modulardashboard.com`
2. System detects: Worker → Autovol → Nampa only
3. Loads Nampa factory data
4. Header shows: `Nampa Factory` (no dropdown - only has one)
5. Cannot see other factories' data

### Future Company2 User

1. Logs in at `app.modulardashboard.com`
2. System detects: User → Company2 → Phoenix Factory
3. Redirects to `company2.modulardashboard.com` (future)
4. Loads Phoenix factory data
5. Cannot see any Autovol data (complete isolation)

---

## Implementation Phases

### Phase 1: Database Foundation
- [ ] Create `organizations` table
- [ ] Create `factories` table
- [ ] Create `user_factory_access` table
- [ ] Add `factory_id` columns to all data tables
- [ ] Create Autovol org + Nampa factory
- [ ] Backfill existing data with factory_id
- [ ] Update profiles with organization_id

### Phase 2: Auth & Profile Updates
- [ ] Update `supabase-client.js` to load user's factory access
- [ ] Add factory info to user session/profile
- [ ] Create `FactoryContext` provider
- [ ] Update login flow to set factory context

### Phase 3: Data Layer Updates
- [ ] Update `supabase-data.js` to filter by factory_id
- [ ] Update all other supabase-*.js files
- [ ] Add RLS policies for tenant isolation
- [ ] Test data isolation between factories

### Phase 4: UI - Factory Switcher
- [ ] Create `FactorySwitcher` component
- [ ] Add to header/navigation
- [ ] Store selected factory in localStorage
- [ ] Update all components to use factory context

### Phase 5: Cross-Factory Views
- [ ] Create "All Factories" aggregate dashboard
- [ ] Add factory column to relevant tables/views
- [ ] Implement factory comparison metrics

### Phase 6: URL Routing (Future)
- [ ] Add subdomain detection
- [ ] Configure DNS wildcard
- [ ] Update Vercel/hosting config
- [ ] Implement auto-redirect on login

---

## Files to Modify

### Core Files
- `js/supabase-client.js` - Add factory context loading
- `js/supabase-data.js` - Add factory_id filters to all queries
- `js/components/App.jsx` - Wrap with FactoryProvider
- `js/components/auth/AuthConstants.jsx` - Add factory-related permissions

### New Files to Create
- `js/contexts/FactoryContext.jsx` - Factory state management
- `js/components/FactorySwitcher.jsx` - Factory dropdown UI
- `backend/multi-tenant-schema.sql` - Database migration

### Data Layer Files (add factory_id filtering)
- `js/supabase-activity-log.js`
- `js/supabase-drawings.js`
- `js/supabase-heat-map.js`
- `js/supabase-issues.js`
- `js/supabase-module-import.js`
- `js/supabase-onsite.js`
- `js/supabase-procurement.js`
- `js/supabase-yard-map.js`

---

## Testing Checklist

- [ ] User with single factory sees no switcher
- [ ] User with multiple factories sees dropdown
- [ ] Switching factory filters all data correctly
- [ ] Factory selection persists across sessions
- [ ] Admin can see "All Factories" view
- [ ] RLS prevents cross-organization data access
- [ ] New records get correct factory_id
- [ ] Activity log tracks factory context
- [ ] Real-time subscriptions respect factory filter

---

## Security Considerations

1. **RLS is critical** - All data access must go through Supabase RLS policies
2. **Never trust client** - Factory ID should be validated server-side
3. **Audit logging** - Track which factory data was accessed
4. **Admin impersonation** - Consider audit trail for cross-factory admin access

---

## Cost Considerations

- Single Supabase project = single billing
- RLS adds minimal query overhead
- Real-time subscriptions may need factory-specific channels
- Storage is shared but can track per-organization usage

---

## Notes

- This is a **planning document** - implementation has not started
- Current app continues to work as single-tenant until migration
- All existing data will be preserved and assigned to Autovol/Nampa
- Backward compatibility maintained during transition
