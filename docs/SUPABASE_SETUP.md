# MODA Supabase Setup Guide

## Overview

This guide walks you through setting up Supabase as the backend for MODA, replacing Firebase.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: MODA
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for setup (~2 minutes)

## Step 2: Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (safe for frontend)
3. Update `js/supabase-client.js`:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```

## Step 3: Set Up Database Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "New query"
3. Copy the contents of `backend/supabase-schema.sql`
4. Click "Run" to execute
5. Verify tables were created in **Table Editor**

## Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email settings:
   - **Enable email confirmations**: Optional (disable for testing)
   - **Secure email change**: Recommended ON
4. Go to **Authentication** → **URL Configuration**
5. Add your site URL to **Site URL**: `https://modulardashboard.com` (or localhost for dev)
6. Add redirect URLs if needed

## Step 5: Create Admin User

1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter admin email: `trevor@autovol.com`
4. Set a password
5. After user is created, go to **SQL Editor** and run:
   ```sql
   UPDATE profiles 
   SET dashboard_role = 'admin', is_protected = true 
   WHERE email = 'trevor@autovol.com';
   ```

## Step 6: Update Frontend

1. Add Supabase SDK to `index.html` (before other scripts):
   ```html
   <!-- Supabase SDK -->
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   
   <!-- Supabase Integration -->
   <script src="./js/supabase-client.js"></script>
   <script src="./js/supabase-data.js"></script>
   ```

2. The existing auth system will automatically detect Supabase and use it

## Step 7: Migrate Existing Data

If you have data in localStorage or Firebase:

1. Open browser console on MODA
2. Run migration:
   ```javascript
   await MODA_SUPABASE_DATA.migration.importFromLocalStorage();
   ```

## Step 8: Enable Real-time (Optional)

Real-time is enabled by default in the schema. To verify:

1. Go to **Database** → **Replication**
2. Ensure `supabase_realtime` publication includes your tables

## Environment Variables (for Production)

For production deployments, use environment variables:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Troubleshooting

### "Permission denied" errors
- Check Row Level Security policies in SQL Editor
- Ensure user has correct `dashboard_role` in profiles table

### Real-time not working
- Check that tables are added to `supabase_realtime` publication
- Verify WebSocket connection in browser Network tab

### Auth not persisting
- Check browser localStorage for `sb-xxxxx-auth-token`
- Ensure Site URL is configured correctly

## Security Notes

1. **Never expose** the `service_role` key in frontend code
2. The `anon` key is safe for frontend - RLS policies protect data
3. All sensitive operations should go through RLS policies
4. Consider enabling MFA for admin users

## Comparison: Firebase vs Supabase

| Feature | Firebase | Supabase |
|---------|----------|----------|
| Database | Firestore (NoSQL) | PostgreSQL (SQL) |
| Auth | Firebase Auth | Supabase Auth |
| Real-time | Firestore listeners | PostgreSQL subscriptions |
| Hosting | Firebase Hosting | External (Vercel/Netlify) |
| Pricing | Pay per read/write | Pay per compute/storage |

## Next Steps

1. Test authentication flow
2. Verify data CRUD operations
3. Test real-time subscriptions
4. Set up production environment
5. Configure backups in Supabase Dashboard
