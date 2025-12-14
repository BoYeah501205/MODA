# Supabase Employee & Invite System Setup

This guide covers setting up the employee directory with Supabase persistence and email invites.

## Overview

The MODA People Directory now integrates with Supabase for:
- **Persistent employee storage** - Data survives browser refresh
- **User invite system** - Send email invites to new users
- **Automatic user linking** - Detect existing Supabase users when adding employees

## Setup Steps

### 1. Update Database Schema

Run the following SQL in your Supabase SQL Editor to update the employees table:

```sql
-- Drop existing employees table if it has old schema
-- WARNING: This will delete existing employee data!
-- DROP TABLE IF EXISTS employees;

-- Or use ALTER TABLE to add new columns (safer):
ALTER TABLE employees ADD COLUMN IF NOT EXISTS prefix TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS suffix TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'Shift-A';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT 'No Access';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'none';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add constraints (run separately if they fail due to existing data)
-- ALTER TABLE employees ADD CONSTRAINT chk_permissions CHECK (permissions IN ('No Access', 'User', 'Admin'));
-- ALTER TABLE employees ADD CONSTRAINT chk_access_status CHECK (access_status IN ('none', 'invited', 'active'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_supabase_user_id ON employees(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);
```

### 2. Add Helper Functions

Run these SQL functions for user linking:

```sql
-- Function to link employee to existing Supabase user
CREATE OR REPLACE FUNCTION link_employee_to_user(employee_email TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = employee_email;
    
    IF user_id IS NOT NULL THEN
        UPDATE employees 
        SET supabase_user_id = user_id, access_status = 'active'
        WHERE email = employee_email AND supabase_user_id IS NULL;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user exists
CREATE OR REPLACE FUNCTION check_user_exists(check_email TEXT)
RETURNS TABLE(user_id UUID, user_email TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.created_at
    FROM auth.users u
    WHERE u.email = check_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Deploy the Invite Edge Function

The invite system requires a Supabase Edge Function to securely send invites.

#### Option A: Deploy via Supabase CLI

1. Install Supabase CLI: https://supabase.com/docs/guides/cli

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd backend/supabase
   supabase link --project-ref syreuphexagezawjyjgt
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy invite-user
   ```

#### Option B: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard > Edge Functions
2. Click "Create a new function"
3. Name it `invite-user`
4. Copy the contents of `backend/supabase/functions/invite-user/index.ts`
5. Deploy

### 4. Configure Email Templates (Optional)

Customize the invite email in Supabase Dashboard:
1. Go to Authentication > Email Templates
2. Edit the "Invite User" template
3. Customize with MODA branding

Example template:
```html
<h2>Welcome to MODA!</h2>
<p>You've been invited to join the Modular Operations Dashboard.</p>
<p><a href="{{ .ConfirmationURL }}">Click here to set up your account</a></p>
<p>This link expires in 24 hours.</p>
```

## How It Works

### Adding Employees

1. **Admin adds employee** in People > Directory > Add Employee
2. **System checks** if email already exists in Supabase Auth
3. **If exists**: Employee is automatically linked, status = "active"
4. **If not**: Employee is created with status = "none"

### Sending Invites

1. **Admin clicks "Invite"** button on an employee with User/Admin permissions
2. **System checks** if user already has MODA account
3. **If exists**: Links employee record, shows "already has access" message
4. **If not**: Sends invite email via Edge Function, status = "invited"

### User Accepts Invite

1. User receives email with magic link
2. Clicks link, sets password
3. Profile is automatically created (via database trigger)
4. Employee record is linked to their auth user ID

## Troubleshooting

### "Supabase not available" errors
- Check browser console for Supabase initialization errors
- Verify `supabase-client.js` is loaded before `supabase-data.js`
- Check network tab for failed Supabase requests

### Invite emails not sending
- Verify Edge Function is deployed
- Check Supabase Dashboard > Edge Functions > Logs
- Ensure SMTP is configured in Authentication > Settings

### Employee data not persisting
- Check RLS policies allow INSERT/UPDATE for your role
- Verify you're logged in with admin permissions
- Check browser console for API errors

### Existing user not detected
- The `check_user_exists` function requires SECURITY DEFINER
- Verify the function was created successfully
- Check if the email matches exactly (case-sensitive)

## Data Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  People Module  │────▶│  supabase-data   │────▶│    Supabase     │
│   (Frontend)    │     │   (API Layer)    │     │   (Database)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                                 │
        │ Invite Request                                  │
        ▼                                                 │
┌─────────────────┐     ┌──────────────────┐             │
│ supabase-client │────▶│  Edge Function   │─────────────┘
│  (Auth Layer)   │     │  (invite-user)   │
└─────────────────┘     └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   Email Sent     │
                        │   to Employee    │
                        └──────────────────┘
```

## Files Modified

- `backend/supabase-schema.sql` - Updated employees table schema
- `js/supabase-data.js` - Enhanced EmployeesAPI with full field support
- `js/supabase-client.js` - Added `inviteUser` and `checkUserByEmail`
- `js/components/PeopleModule.jsx` - Supabase integration for CRUD + invites
- `js/components/App.jsx` - Load employees from Supabase on startup
- `backend/supabase/functions/invite-user/index.ts` - Edge Function for secure invites
