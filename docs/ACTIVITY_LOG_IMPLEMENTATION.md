# Activity Log Implementation

## Overview

Comprehensive activity tracking system for MODA that logs all user activity for audit and analytics purposes.

## Files Created

### 1. `backend/create-activity-log-table.sql`
Supabase migration script that creates:
- **`activity_logs`** table - Main log storage with indexes
- **`activity_logs_archive`** table - For logs older than 90 days
- **`archive_old_activity_logs()`** function - Moves old logs to archive
- **`log_activity()`** helper function - Direct SQL logging
- **`activity_stats`** view - Aggregated stats for dashboard
- **RLS policies** - Admins see all, users see own, no updates allowed

### 2. `js/supabase-activity-log.js`
Data access layer providing:
- **Constants**: `ACTION_TYPES`, `ACTION_CATEGORIES`, `SEVERITY`
- **Logging methods**: `log()`, `logLogin()`, `logLogout()`, `logCreate()`, `logUpdate()`, `logDelete()`, `logImport()`, `logExport()`, `logPermissionChange()`
- **Query methods**: `getLogs()`, `getEntityHistory()`, `getUserActivity()`, `getRecentActivity()`, `getStats()`
- **Batching**: Low-priority logs are batched and flushed every 5 seconds

### 3. `js/hooks/useActivityLogger.js`
React hooks:
- **`useActivityLogger(options)`** - Component-level logging with category/entity defaults
- **`useActivityLogs(filters)`** - Fetch logs with pagination and filtering
- **`useActivityFeed(filters)`** - Real-time activity feed subscription

### 4. `js/components/ActivityLogViewer.jsx`
Admin UI components:
- **`ActivityLogViewer`** - Full log viewer with filters, pagination, export
- **`ActivityFeed`** - Compact real-time feed for dashboards

## Files Modified

### `index.html`
Added script imports:
- `js/supabase-activity-log.js`
- `js/hooks/useActivityLogger.js`
- `js/components/ActivityLogViewer.jsx`

### `js/components/App.jsx`
Added ActivityLogViewer to Admin tab (line ~1361-1376)

### `js/supabase-client.js`
Added activity logging for:
- Successful login
- Failed login attempts
- Logout

### `js/supabase-data.js`
Added activity logging for:
- Project create/update/delete
- Module create/update/delete
- Employee create/update/delete

## Database Schema

```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    action_type TEXT NOT NULL,      -- login, logout, create, update, delete, etc.
    action_category TEXT NOT NULL,  -- auth, project, module, employee, etc.
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT DEFAULT 'info',   -- info, warning, critical
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Action Types
- `login`, `logout`, `login_failed`, `password_reset`, `password_change`
- `create`, `read`, `update`, `delete`
- `import`, `export`, `bulk_update`
- `view`, `navigate`

## Categories
- `auth`, `project`, `module`, `employee`, `user`
- `permission`, `role`, `deviation`, `transport`
- `equipment`, `schedule`, `system`

## Severity Levels
- **info** - Normal operations (default)
- **warning** - Failed logins, bulk updates
- **critical** - Deletions, permission changes

## Usage Examples

### Log from a component
```javascript
const logger = useActivityLogger({ category: 'project', entityType: 'project' });

// Log creation
await logger.logCreate(projectId, projectName, { status: 'Active' });

// Log update with before/after
await logger.logUpdate(projectId, projectName, { status: 'Planning' }, { status: 'Active' });
```

### Query logs
```javascript
const { logs, loading, totalCount, loadMore } = useActivityLogs({
    actionCategory: 'auth',
    severity: 'warning',
    startDate: '2025-01-01',
    limit: 50
});
```

### Direct logging
```javascript
await ActivityLog.logPermissionChange(userId, email, 'employee', 'admin');
```

## Deployment Steps

1. **Run SQL migration** in Supabase SQL Editor:
   - Open `backend/create-activity-log-table.sql`
   - Execute in Supabase Dashboard → SQL Editor

2. **Push to GitHub** for Vercel deployment

3. **Test** by:
   - Logging in/out
   - Creating/editing a project
   - Viewing Admin → Activity Log

## Access Control

- **Admin users**: Full access to all logs
- **Regular users**: Can only see their own activity
- **No one**: Can modify or delete logs (immutable audit trail)

## Retention Policy

- Active logs: 90 days in main table
- Archive: Older logs moved to `activity_logs_archive`
- Run `SELECT archive_old_activity_logs();` periodically (or set up a cron job)

## Future Enhancements

1. Add logging to more operations (QA deviations, transport, etc.)
2. Dashboard analytics with charts
3. Automated alerts for suspicious activity
4. Export to external SIEM systems
