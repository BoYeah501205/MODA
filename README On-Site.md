# MODA ON-SITES MODULE - COMPLETE README

**Version:** 2.2  
**Status:** Ready for Implementation  
**Developer:** Trevor Fletcher  
**Tools:** Windsurf + Claude AI  
**Timeline:** 5 days (8-12 hours total)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [File Structure](#file-structure)
4. [Database Setup](#database-setup)
5. [Core Files Implementation](#core-files-implementation)
6. [Component Development](#component-development)
7. [Page Development](#page-development)
8. [Testing Guide](#testing-guide)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Success Criteria](#success-criteria)

---

## 🎯 PROJECT OVERVIEW

### **What We're Building**

A mobile-first field reporting system for Autovol On-Sites crew to log daily reports and module issues with photo documentation.

### **Key Features**

- **Daily Site Reports:** Weather, progress tracking, units set
- **Module Issues:** Link to production modules, 5 photos max per issue
- **Global Issues:** Site-wide problems affecting multiple modules
- **Photo Capture:** Mobile camera/gallery with compression (<1MB per photo)
- **Export:** HTML reports with embedded photos (print to PDF)
- **Two-Way Communication:** Factory responds to field issues (Phase 2)
- **37-Second Target:** Log complete issue in under 37 seconds

### **Tech Stack**

- **Frontend:** React 18 + Next.js + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Deployment:** Vercel
- **Version Control:** GitHub

### **Success Metrics**

- Joe Sievers can create daily report in 2 minutes
- Log module issue with 3 photos in <37 seconds
- Export report with all photos embedded
- Works flawlessly on iPhone Safari
- Closes 6-month field-factory visibility gap

---

## 🔧 PREREQUISITES

Before starting, verify you have:

```bash
# MODA repo cloned
git clone https://github.com/BoYeah501205/MODA.git
cd MODA

# Dependencies installed
npm install

# Supabase connected
# Check .env.local has:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Verify existing tables exist:
# - projects
# - employees  
# - unified_modules
# - profiles
```

**Tools Needed:**
- Windsurf IDE
- Claude AI access
- Supabase dashboard access
- iPhone/Android for testing

---

## 📁 FILE STRUCTURE

Create this exact structure in your MODA repo:

```
moda/
├── supabase/
│   └── migrations/
│       └── 20241227000000_create_onsite_tables.sql  ← CREATE THIS
│
├── src/
│   ├── types/
│   │   └── on-sites.ts  ← CREATE THIS
│   │
│   ├── lib/
│   │   ├── utils/
│   │   │   └── photo-compression.ts  ← CREATE THIS
│   │   │
│   │   └── supabase/
│   │       └── on-sites/
│   │           ├── reports.ts  ← CREATE THIS
│   │           ├── issues.ts  ← CREATE THIS
│   │           └── export.ts  ← CREATE THIS (later)
│   │
│   ├── components/
│   │   └── on-sites/
│   │       ├── PhotoCapture.tsx  ← CREATE THIS
│   │       ├── ReportForm.tsx  ← CREATE THIS (later)
│   │       ├── IssueLogger.tsx  ← CREATE THIS (later)
│   │       └── ModuleSelector.tsx  ← CREATE THIS (later)
│   │
│   └── app/
│       └── on-sites/
│           ├── page.tsx  ← CREATE THIS
│           ├── layout.tsx  ← CREATE THIS
│           ├── new/
│           │   └── page.tsx  ← CREATE THIS
│           └── [reportId]/
│               └── page.tsx  ← CREATE THIS
```

---

## 🗄️ DATABASE SETUP

### **Step 1: Create Migration File**

**File:** `supabase/migrations/20241227000000_create_onsite_tables.sql`

```sql
-- =====================================================
-- MODA ON-SITES MODULE - DATABASE SCHEMA
-- Migration: Create On-Sites tables and policies
-- Author: Trevor Fletcher
-- Date: December 27, 2024
-- =====================================================

-- ============================================
-- 1. DAILY SITE REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    superintendent_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Weather conditions
    temp_am INTEGER,
    temp_pm INTEGER,
    precipitation VARCHAR(50) DEFAULT 'none',
    wind VARCHAR(50) DEFAULT 'light',
    
    -- Progress tracking
    units_set_today INTEGER DEFAULT 0,
    units_set_total INTEGER DEFAULT 0,
    units_remaining INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_daily_report UNIQUE (date, project_id)
);

-- ============================================
-- 2. MODULE-SPECIFIC ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES onsite_reports(id) ON DELETE CASCADE,
    module_id UUID REFERENCES unified_modules(id) ON DELETE CASCADE,
    
    -- Issue details
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('quality', 'material', 'question', 'site', 'transit', 'other')),
    description TEXT NOT NULL,
    action_taken TEXT,
    
    -- Photos (stored as JSONB array)
    photos JSONB DEFAULT '[]'::jsonb,
    
    -- Two-way communication fields
    factory_response TEXT,
    root_cause TEXT,
    remedial_action TEXT,
    responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. GLOBAL ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_global_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES onsite_reports(id) ON DELETE CASCADE,
    
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('quality', 'material', 'question', 'site', 'transit', 'other')),
    description TEXT NOT NULL,
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. PERFORMANCE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_onsite_reports_date ON onsite_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_onsite_reports_project ON onsite_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_onsite_reports_superintendent ON onsite_reports(superintendent_id);
CREATE INDEX IF NOT EXISTS idx_onsite_issues_report ON onsite_issues(report_id);
CREATE INDEX IF NOT EXISTS idx_onsite_issues_module ON onsite_issues(module_id);
CREATE INDEX IF NOT EXISTS idx_onsite_issues_created ON onsite_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onsite_global_issues_report ON onsite_global_issues(report_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE onsite_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE onsite_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE onsite_global_issues ENABLE ROW LEVEL SECURITY;

-- REPORTS POLICIES
CREATE POLICY "Anyone authenticated can read reports" 
ON onsite_reports FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Field crew can create reports" 
ON onsite_reports FOR INSERT 
WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role IN ('employee', 'admin'))
);

CREATE POLICY "Users can update own reports" 
ON onsite_reports FOR UPDATE 
USING (
    created_by = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role = 'admin')
);

CREATE POLICY "Admins can delete reports" 
ON onsite_reports FOR DELETE 
USING (
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role = 'admin')
);

-- ISSUES POLICIES
CREATE POLICY "Anyone authenticated can read issues" 
ON onsite_issues FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Field crew can create issues" 
ON onsite_issues FOR INSERT 
WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role IN ('employee', 'admin'))
);

CREATE POLICY "Users can update issues" 
ON onsite_issues FOR UPDATE 
USING (
    created_by = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role = 'admin')
);

CREATE POLICY "Admins can delete issues" 
ON onsite_issues FOR DELETE 
USING (
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role = 'admin')
);

-- GLOBAL ISSUES POLICIES
CREATE POLICY "Anyone authenticated can read global issues" 
ON onsite_global_issues FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Field crew can create global issues" 
ON onsite_global_issues FOR INSERT 
WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role IN ('employee', 'admin'))
);

CREATE POLICY "Admins can delete global issues" 
ON onsite_global_issues FOR DELETE 
USING (
    auth.uid() IN (SELECT id FROM profiles WHERE dashboard_role = 'admin')
);

-- ============================================
-- 6. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onsite_reports_updated_at 
BEFORE UPDATE ON onsite_reports
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onsite_issues_updated_at 
BEFORE UPDATE ON onsite_issues
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE onsite_reports IS 'Daily site reports from field superintendents';
COMMENT ON TABLE onsite_issues IS 'Module-specific issues logged during installation';
COMMENT ON TABLE onsite_global_issues IS 'Site-wide issues affecting multiple modules';

COMMENT ON COLUMN onsite_issues.photos IS 'JSON array of base64-encoded photos or URLs';
COMMENT ON COLUMN onsite_issues.factory_response IS 'Factory response to field issue (two-way communication)';
```

### **Step 2: Run Migration**

```bash
# Option A: Using Supabase CLI (recommended)
supabase db push

# Option B: Manual in Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Click "New query"
# 3. Copy/paste SQL above
# 4. Click "Run"
```

### **Step 3: Verify Tables Created**

```bash
# Check in Supabase Dashboard → Table Editor
# You should see:
# - onsite_reports
# - onsite_issues
# - onsite_global_issues

# Verify RLS enabled (shield icon next to table names)
```

---

## 📝 CORE FILES IMPLEMENTATION

### **File 1: TypeScript Types**

**Location:** `src/types/on-sites.ts`

<details>
<summary>Click to expand complete file (220 lines)</summary>

```typescript
// =====================================================
// MODA ON-SITES MODULE - TYPESCRIPT TYPES
// All type definitions for the On-Sites reporting system
// =====================================================

export type IssueType = 'quality' | 'material' | 'question' | 'site' | 'transit' | 'other';
export type ExportFormat = 'html' | 'pdf' | 'text';

// ============================================
// DATABASE TYPES (match Supabase schema)
// ============================================

export interface OnsiteReport {
  id: string;
  date: string;
  project_id: string;
  superintendent_id: string;
  
  // Weather
  temp_am: number;
  temp_pm: number;
  precipitation: string;
  wind: string;
  
  // Progress
  units_set_today: number;
  units_set_total: number;
  units_remaining: number;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations (populated via joins)
  project?: {
    id: string;
    name: string;
  };
  superintendent?: {
    id: string;
    name: string;
  };
  issues?: OnsiteIssue[];
  global_issues?: OnsiteGlobalIssue[];
}

export interface OnsiteIssue {
  id: string;
  report_id: string;
  module_id: string;
  
  issue_type: IssueType;
  description: string;
  action_taken: string | null;
  photos: string[];
  
  // Factory response
  factory_response: string | null;
  root_cause: string | null;
  remedial_action: string | null;
  responded_by: string | null;
  responded_at: string | null;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  module?: {
    id: string;
    serial: string;
    hitch_blm: string;
    hitch_unit: string;
    rear_blm: string;
    rear_unit: string;
  };
  responded_by_user?: {
    id: string;
    name: string;
  };
}

export interface OnsiteGlobalIssue {
  id: string;
  report_id: string;
  issue_type: IssueType;
  description: string;
  created_by: string;
  created_at: string;
}

// ============================================
// FORM INPUT TYPES
// ============================================

export interface CreateReportInput {
  date: string;
  project_id: string;
  superintendent_id: string;
  temp_am: number;
  temp_pm: number;
  precipitation: string;
  wind: string;
  units_set_today: number;
  units_set_total: number;
  units_remaining: number;
}

export interface UpdateReportInput {
  temp_am?: number;
  temp_pm?: number;
  precipitation?: string;
  wind?: string;
  units_set_today?: number;
  units_set_total?: number;
  units_remaining?: number;
}

export interface CreateIssueInput {
  report_id: string;
  module_id: string;
  issue_type: IssueType;
  description: string;
  action_taken?: string;
  photos?: string[];
}

export interface UpdateIssueInput {
  issue_type?: IssueType;
  description?: string;
  action_taken?: string;
  photos?: string[];
}

export interface CreateGlobalIssueInput {
  report_id: string;
  issue_type: IssueType;
  description: string;
}

export interface FactoryResponseInput {
  factory_response: string;
  root_cause?: string;
  remedial_action?: string;
}

// ============================================
// UI TYPES
// ============================================

export interface IssueTypeOption {
  value: IssueType;
  label: string;
  color: string;
  icon: string;
}

export interface ExportOptions {
  format: ExportFormat;
  includePhotos: boolean;
  date: string;
  reportId: string;
}

// ============================================
// CONSTANTS
// ============================================

export const ISSUE_TYPES: IssueTypeOption[] = [
  { value: 'quality', label: 'Quality Defect', color: 'red', icon: '🔴' },
  { value: 'material', label: 'Material Shortage', color: 'yellow', icon: '📦' },
  { value: 'question', label: 'Question', color: 'blue', icon: '❓' },
  { value: 'site', label: 'Site Issue', color: 'orange', icon: '🏗️' },
  { value: 'transit', label: 'Transit Damage', color: 'purple', icon: '🚛' },
  { value: 'other', label: 'Other', color: 'gray', icon: '📝' },
];

export const PRECIPITATION_OPTIONS = [
  'none',
  'light rain',
  'heavy rain',
  'snow',
  'sleet',
  'fog',
];

export const WIND_OPTIONS = [
  'calm',
  'light',
  'moderate',
  'strong',
  'high winds',
];

// Helper function to get issue type metadata
export function getIssueTypeInfo(type: IssueType): IssueTypeOption {
  return ISSUE_TYPES.find(t => t.value === type) || ISSUE_TYPES[ISSUE_TYPES.length - 1];
}

// Helper function to format module display name
export function formatModuleDisplayName(module: {
  serial: string;
  hitch_unit: string;
  rear_unit?: string;
}): string {
  const unit = module.rear_unit || module.hitch_unit;
  return `${unit} - SN# ${module.serial}`;
}
```

</details>

**Windsurf Prompt:**
```
Create src/types/on-sites.ts file with all TypeScript type definitions for the On-Sites module. Include database types matching the Supabase schema, form input types, UI types, and constants for issue types, precipitation, and wind options.
```

---

### **File 2: Photo Compression Utility**

**Location:** `src/lib/utils/photo-compression.ts`

<details>
<summary>Click to expand complete file (200 lines)</summary>

```typescript
// =====================================================
// PHOTO COMPRESSION UTILITY
// Compresses images for optimal mobile performance
// Max size: 1200px, Quality: 70%, Format: JPEG
// =====================================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7,
  outputFormat: 'jpeg',
};

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const compressed = compressImageElement(img, opts);
          resolve(compressed);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<string[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}

function compressImageElement(
  img: HTMLImageElement,
  options: Required<CompressionOptions>
): string {
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  
  if (width > options.maxWidth || height > options.maxHeight) {
    const aspectRatio = width / height;
    
    if (width > height) {
      width = Math.min(width, options.maxWidth);
      height = width / aspectRatio;
    } else {
      height = Math.min(height, options.maxHeight);
      width = height * aspectRatio;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.drawImage(img, 0, 0, width, height);
  
  const mimeType = `image/${options.outputFormat}`;
  return canvas.toDataURL(mimeType, options.quality);
}

export function getBase64Size(base64: string): number {
  const base64Length = base64.length - (base64.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const sizeInBytes = (base64Length * 3) / 4 - padding;
  return sizeInBytes / 1024; // Convert to KB
}

export function validatePhotoSize(base64: string): boolean {
  const sizeKB = getBase64Size(base64);
  const maxSizeMB = 5;
  return sizeKB < maxSizeMB * 1024;
}

export async function compressToTargetSize(
  file: File,
  targetSizeKB: number = 500
): Promise<string> {
  let quality = 0.9;
  let compressed = await compressImage(file, { quality });
  
  while (getBase64Size(compressed) > targetSizeKB && quality > 0.1) {
    quality -= 0.1;
    compressed = await compressImage(file, { quality });
  }
  
  if (getBase64Size(compressed) > targetSizeKB) {
    throw new Error(`Unable to compress image to ${targetSizeKB}KB`);
  }
  
  return compressed;
}

export async function createThumbnail(file: File, size: number = 200): Promise<string> {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
  });
}
```

</details>

**Windsurf Prompt:**
```
Create src/lib/utils/photo-compression.ts with image compression functions. Support max 1200px dimensions, 70% JPEG quality. Include compressImage(), compressImages(), getBase64Size(), validatePhotoSize(), and compressToTargetSize() functions.
```

---

### **File 3: Reports API**

**Location:** `src/lib/supabase/on-sites/reports.ts`

<details>
<summary>Click to expand complete file (180 lines)</summary>

```typescript
// =====================================================
// SUPABASE API - REPORTS OPERATIONS
// All database operations for onsite_reports table
// =====================================================

import { createClient } from '@/lib/supabase/client';
import type { OnsiteReport, CreateReportInput, UpdateReportInput } from '@/types/on-sites';

export async function getReportsByDateRange(
  startDate: string,
  endDate: string
): Promise<OnsiteReport[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .select(`
      *,
      project:projects(id, name),
      superintendent:employees(id, name),
      issues:onsite_issues(
        *,
        module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit)
      ),
      global_issues:onsite_global_issues(*)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getReportById(reportId: string): Promise<OnsiteReport> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .select(`
      *,
      project:projects(id, name),
      superintendent:employees(id, name),
      issues:onsite_issues(
        *,
        module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit),
        responded_by_user:profiles!responded_by(id, name)
      ),
      global_issues:onsite_global_issues(*)
    `)
    .eq('id', reportId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getReportByProjectAndDate(
  projectId: string,
  date: string
): Promise<OnsiteReport | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .select(`
      *,
      project:projects(id, name),
      superintendent:employees(id, name)
    `)
    .eq('project_id', projectId)
    .eq('date', date)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function createReport(input: CreateReportInput): Promise<OnsiteReport> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select(`
      *,
      project:projects(id, name),
      superintendent:employees(id, name)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateReport(
  reportId: string,
  updates: UpdateReportInput
): Promise<OnsiteReport> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .update(updates)
    .eq('id', reportId)
    .select(`
      *,
      project:projects(id, name),
      superintendent:employees(id, name)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteReport(reportId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('onsite_reports')
    .delete()
    .eq('id', reportId);
  
  if (error) throw error;
}

export async function getRecentReports(limit: number = 10): Promise<OnsiteReport[]> {
  const supabase = createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .select(`
      *,
      project:projects(id, name),
      superintendent:employees(id, name)
    `)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function reportExists(projectId: string, date: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_reports')
    .select('id')
    .eq('project_id', projectId)
    .eq('date', date)
    .maybeSingle();
  
  if (error) throw error;
  return data !== null;
}
```

</details>

**Windsurf Prompt:**
```
Create src/lib/supabase/on-sites/reports.ts with Supabase API functions for reports. Include getReportsByDateRange(), getReportById(), createReport(), updateReport(), deleteReport(), and getRecentReports(). Use proper TypeScript types from @/types/on-sites and Supabase client from @/lib/supabase/client.
```

---

### **File 4: Issues API**

**Location:** `src/lib/supabase/on-sites/issues.ts`

<details>
<summary>Click to expand complete file (200 lines)</summary>

```typescript
// =====================================================
// SUPABASE API - ISSUES OPERATIONS
// All database operations for onsite_issues table
// =====================================================

import { createClient } from '@/lib/supabase/client';
import type { 
  OnsiteIssue, 
  OnsiteGlobalIssue,
  CreateIssueInput, 
  UpdateIssueInput,
  CreateGlobalIssueInput,
  FactoryResponseInput,
  IssueType 
} from '@/types/on-sites';

export async function getIssuesByReport(reportId: string): Promise<OnsiteIssue[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_issues')
    .select(`
      *,
      module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit),
      responded_by_user:profiles!responded_by(id, name)
    `)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getIssueById(issueId: string): Promise<OnsiteIssue> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_issues')
    .select(`
      *,
      module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit),
      responded_by_user:profiles!responded_by(id, name)
    `)
    .eq('id', issueId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createIssue(input: CreateIssueInput): Promise<OnsiteIssue> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('onsite_issues')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select(`
      *,
      module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateIssue(
  issueId: string,
  updates: UpdateIssueInput
): Promise<OnsiteIssue> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_issues')
    .update(updates)
    .eq('id', issueId)
    .select(`
      *,
      module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function addFactoryResponse(
  issueId: string,
  response: FactoryResponseInput
): Promise<OnsiteIssue> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('onsite_issues')
    .update({
      ...response,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq('id', issueId)
    .select(`
      *,
      module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit),
      responded_by_user:profiles!responded_by(id, name)
    `)
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteIssue(issueId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('onsite_issues')
    .delete()
    .eq('id', issueId);
  
  if (error) throw error;
}

export async function getUnresolvedIssues(): Promise<OnsiteIssue[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_issues')
    .select(`
      *,
      module:unified_modules(id, serial, hitch_blm, hitch_unit, rear_blm, rear_unit),
      report:onsite_reports(id, date, project:projects(id, name))
    `)
    .is('factory_response', null)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getGlobalIssuesByReport(reportId: string): Promise<OnsiteGlobalIssue[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('onsite_global_issues')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createGlobalIssue(input: CreateGlobalIssueInput): Promise<OnsiteGlobalIssue> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('onsite_global_issues')
    .insert({
      ...input,
      created_by: user.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteGlobalIssue(issueId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('onsite_global_issues')
    .delete()
    .eq('id', issueId);
  
  if (error) throw error;
}
```

</details>

**Windsurf Prompt:**
```
Create src/lib/supabase/on-sites/issues.ts with API functions for issues and global issues. Include getIssuesByReport(), createIssue(), updateIssue(), addFactoryResponse(), getUnresolvedIssues(), and global issue functions. Use types from @/types/on-sites.
```

---

### **File 5: PhotoCapture Component**

**Location:** `src/components/on-sites/PhotoCapture.tsx`

<details>
<summary>Click to expand complete file (180 lines)</summary>

```typescript
'use client';

import { useState, useRef } from 'react';
import { compressImage, getBase64Size } from '@/lib/utils/photo-compression';

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  maxSizeKB?: number;
  disabled?: boolean;
}

export function PhotoCapture({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 5,
  maxSizeKB = 1024,
  disabled = false
}: PhotoCaptureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newPhotos = [...photos];
    
    try {
      for (const file of files) {
        if (newPhotos.length >= maxPhotos) {
          alert(`Maximum ${maxPhotos} photos allowed`);
          break;
        }
        
        const compressed = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.7,
        });
        
        const sizeKB = getBase64Size(compressed);
        if (sizeKB > maxSizeKB) {
          alert(`Photo too large (${Math.round(sizeKB)}KB). Maximum ${maxSizeKB}KB.`);
          continue;
        }
        
        newPhotos.push(compressed);
      }
      
      onPhotosChange(newPhotos);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Error processing photos. Please try again.');
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const deletePhoto = (index: number) => {
    if (disabled) return;
    if (confirm('Delete this photo?')) {
      const updated = photos.filter((_, i) => i !== index);
      onPhotosChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <div 
              key={idx} 
              className="relative aspect-square group cursor-pointer"
              onClick={() => setPreviewPhoto(photo)}
            >
              <img
                src={photo}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
              />
              
              <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {idx + 1}
              </div>
              
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePhoto(idx);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center"
                >
                  ×
                </button>
              )}
              
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {Math.round(getBase64Size(photo))}KB
              </div>
            </div>
          ))}
        </div>
      )}

      {!disabled && photos.length < maxPhotos && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-outline"
            type="button"
          >
            {isUploading ? '⏳ Processing...' : '📷 Take Photo'}
          </button>
          
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-outline"
            type="button"
          >
            {isUploading ? '⏳ Processing...' : '🖼️ Add Photo'}
          </button>
        </div>
      )}

      <p className="text-sm text-gray-600 text-center">
        {photos.length} of {maxPhotos} photos
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handlePhotoUpload}
        disabled={disabled || isUploading}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoUpload}
        disabled={disabled || isUploading}
      />

      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center text-2xl"
          >
            ×
          </button>
          <img
            src={previewPhoto}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
```

</details>

**Windsurf Prompt:**
```
Create src/components/on-sites/PhotoCapture.tsx React component with camera/gallery photo capture. Support max 5 photos, compression to 1200px/70% quality, preview modal, delete function. Use compressImage and getBase64Size from photo-compression utility. Mobile-optimized with large touch targets.
```

---

## 📱 COMPONENT DEVELOPMENT

### **Next Components to Build**

Use these Windsurf prompts to build remaining components:

#### **1. ReportForm Component**

**Prompt:**
```
Create src/components/on-sites/ReportForm.tsx with form for creating daily site reports. Include:
- Date picker (default today)
- Project dropdown (from projects table via Supabase)
- Superintendent dropdown (from employees table)
- Weather fields: temp_am, temp_pm, precipitation (dropdown), wind (dropdown)
- Progress fields: units_set_today, units_set_total, units_remaining
- Validation: all fields required, temps -50 to 150°F, date not in future
- Save draft to localStorage
- Mobile-optimized layout

Use CreateReportInput type from @/types/on-sites and createReport API from @/lib/supabase/on-sites/reports.
```

#### **2. IssueLogger Component**

**Prompt:**
```
Create src/components/on-sites/IssueLogger.tsx as 3-step wizard:

Step 1 - Module Selection:
- Dropdown from unified_modules table
- Display format: "B1 L01 M01 - SN# 25-0200"
- Search/filter capability

Step 2 - Issue Details:
- Issue type selector (quality, material, question, site, transit, other)
- Description textarea (required, min 10 chars)
- Action taken textarea (optional)
- PhotoCapture component (max 5 photos)

Step 3 - Review & Submit:
- Show all data entered
- Photo thumbnails
- Edit buttons
- Submit button with loading state

Features:
- Progress indicator (1/3, 2/3, 3/3)
- Back/Next navigation
- Timer showing elapsed time (target <37 seconds)
- Save draft to localStorage
- Mobile-first design, min 44px touch targets

Use CreateIssueInput from @/types/on-sites, createIssue from @/lib/supabase/on-sites/issues, and PhotoCapture component.
```

#### **3. ModuleSelector Component**

**Prompt:**
```
Create src/components/on-sites/ModuleSelector.tsx dropdown component:
- Query unified_modules from Supabase
- Display format: "B1 L01 M01 - SN# 25-0200"
- Search functionality
- Mobile-optimized select
- Show serial number prominently
- Handle loading/error states

Props: value (string module_id), onChange (callback), disabled (boolean)
```

---

## 🌐 PAGE DEVELOPMENT

### **Page 1: Main On-Sites List**

**File:** `src/app/on-sites/page.tsx`

**Windsurf Prompt:**
```
Create src/app/on-sites/page.tsx main list page showing recent site reports.

Features:
- Display last 30 days of reports using getRecentReports()
- Report cards showing:
  * Date
  * Project name
  * Superintendent name
  * Number of issues (badge)
  * Number of global issues (badge)
- "Create New Report" button → /on-sites/new
- Date range filter (last 7/30/90 days)
- Search by project name
- Mobile-responsive grid layout
- Empty state if no reports
- Loading state

Style with Autovol branding:
- Primary blue: #0057B8
- Red accents: #C8102E
- Follow MODA Equipment/Transport module patterns

Use getRecentReports from @/lib/supabase/on-sites/reports and OnsiteReport type.
```

---

### **Page 2: Create New Report**

**File:** `src/app/on-sites/new/page.tsx`

**Windsurf Prompt:**
```
Create src/app/on-sites/new/page.tsx for creating new daily reports.

Features:
- Use ReportForm component
- Page title: "New Daily Report"
- Check if report exists for selected project/date (reportExists function)
- If exists, show warning: "Report already exists for this project/date. View existing?"
- On successful create:
  * Show success notification
  * Redirect to /on-sites/[reportId]
- Cancel button → /on-sites
- Breadcrumb: On-Sites > New Report
- Mobile-optimized

Use createReport and reportExists from @/lib/supabase/on-sites/reports.
Use useRouter from next/navigation for redirect.
```

---

### **Page 3: Report Detail**

**File:** `src/app/on-sites/[reportId]/page.tsx`

**Windsurf Prompt:**
```
Create src/app/on-sites/[reportId]/page.tsx detail view for single report.

Layout sections:
1. Header Card:
   - Project name (large, bold)
   - Date
   - Superintendent name
   - Edit button (if user created it)

2. Weather & Progress Stats:
   - Display in 2-column grid
   - Weather: Temp AM/PM, Precipitation, Wind
   - Progress: Units set today/total/remaining
   - Inline editing (click to edit, save/cancel buttons)

3. Module Issues Section:
   - List all issues from getIssuesByReport()
   - Group by module
   - Show: Type badge, description, action taken, photos (thumbnails)
   - Click photo to view full size
   - "Add Module Issue" button

4. Global Issues Section:
   - List all global issues
   - Show: Type badge, description
   - "Add Global Issue" button

5. Export Section:
   - "Export to HTML" button
   - "Print to PDF" button (calls window.print())

Features:
- Back button → /on-sites
- Breadcrumb: On-Sites > [Project Name] > [Date]
- Loading state while fetching
- Error handling if report not found
- Real-time updates (optional)

Use getReportById from @/lib/supabase/on-sites/reports.
Use params.reportId from Next.js dynamic route.
Mobile-optimized, Autovol styling.
```

---

## 🧪 TESTING GUIDE

### **Test 1: Database Connection**

```typescript
// Run in browser console or test file
import { getRecentReports } from '@/lib/supabase/on-sites/reports';

const reports = await getRecentReports(5);
console.log('Reports:', reports);
// Should return array (empty if no reports yet)
```

### **Test 2: Create Report Workflow**

1. Navigate to `/on-sites/new`
2. Fill out form:
   - Date: Today
   - Project: Select from dropdown
   - Superintendent: Select from dropdown
   - Temps: 45 / 62
   - Precipitation: none
   - Wind: light
   - Units: 3 / 8 / 54
3. Click "Create Report"
4. Should redirect to report detail page
5. Verify report shows in main list

### **Test 3: Photo Capture**

1. Open report detail page
2. Click "Add Module Issue"
3. Select module
4. Take 3 photos (or upload from gallery)
5. Verify:
   - Photos compress < 1MB each
   - Photos display as thumbnails
   - Can delete photos
   - Can view full-size preview

### **Test 4: Issue Logging Speed**

1. Start timer
2. Click "Add Module Issue"
3. Select module (5 sec)
4. Select issue type (3 sec)
5. Dictate/type description (15 sec)
6. Take 3 photos (10 sec)
7. Click submit (2 sec)
8. **Total should be < 37 seconds**

### **Test 5: Export to HTML**

1. Create report with 2-3 module issues
2. Add photos to each issue
3. Click "Export to HTML"
4. Download HTML file
5. Open in browser
6. Verify:
   - All photos embedded (base64)
   - Autovol branding visible
   - Professional formatting
   - Print to PDF works

### **Test 6: Mobile Testing**

1. Deploy to Vercel (or use ngrok locally)
2. Open on iPhone Safari
3. Test:
   - Camera access works
   - Photos compress properly
   - Touch targets large enough (44px min)
   - Forms easy to fill
   - No horizontal scrolling
   - Buttons accessible
   - Issue logging <37 sec achievable

---

## 🚀 DEPLOYMENT

### **Step 1: Commit Changes**

```bash
git add .
git commit -m "feat: Add On-Sites reporting module

- Database schema with reports, issues, global issues
- Photo capture with compression (<1MB per photo)
- Create/view/edit daily site reports
- Module issue logging with 37-second target
- Global issue tracking
- HTML export with embedded photos
- Mobile-optimized UI with Autovol branding
- RLS policies for data security

Closes #[issue-number]
"
```

### **Step 2: Push to GitHub**

```bash
git push origin main
```

### **Step 3: Verify Vercel Deployment**

1. Check Vercel dashboard
2. Wait for build to complete (~3-5 min)
3. Click "Visit" to test production site
4. Verify:
   - Database connected (env vars correct)
   - Auth working
   - Reports load
   - Photos upload/compress
   - Export works

### **Step 4: Production Checks**

```bash
# Test in production
1. Create test report
2. Add test issue with photos
3. Export to HTML
4. Verify on mobile device
5. Delete test data (if needed)
```

---

## 🐛 TROUBLESHOOTING

### **Problem: Migration Fails**

**Error:** `relation "projects" does not exist`

**Solution:**
```sql
-- Verify these tables exist first:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('projects', 'employees', 'unified_modules', 'profiles');

-- If missing, create them before running On-Sites migration
```

---

### **Problem: Photos Don't Upload**

**Error:** Photos not compressing or showing

**Solution:**
1. Check browser console for errors
2. Verify `photo-compression.ts` imported correctly
3. Test with smaller image (<1MB)
4. Check `maxPhotos` prop passed to PhotoCapture
5. Verify `onPhotosChange` callback working

---

### **Problem: Supabase Queries Fail**

**Error:** `401 Unauthorized` or `Row Level Security`

**Solution:**
```typescript
// Check user authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user); // Should show user object

// Temporarily disable RLS to test (DON'T DO IN PRODUCTION)
ALTER TABLE onsite_reports DISABLE ROW LEVEL SECURITY;

// Then re-enable after confirming query works
ALTER TABLE onsite_reports ENABLE ROW LEVEL SECURITY;
```

---

### **Problem: Types Not Importing**

**Error:** `Cannot find module '@/types/on-sites'`

**Solution:**
```json
// Check tsconfig.json has paths configured
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// Restart TypeScript server in Windsurf
// CMD+Shift+P → "TypeScript: Restart TS Server"
```

---

### **Problem: Report Not Found**

**Error:** Report detail page shows "Not found"

**Solution:**
```typescript
// Check report ID in URL is valid UUID
// Check user has permission to view (RLS policy)
// Check report exists in database:
SELECT * FROM onsite_reports WHERE id = 'your-uuid-here';

// Check getReportById function working:
const report = await getReportById('your-uuid-here');
console.log('Report:', report);
```

---

## ✅ SUCCESS CRITERIA

The On-Sites module is **COMPLETE** when:

### **Technical Criteria**

- [ ] All database tables created in Supabase
- [ ] RLS policies enabled and tested
- [ ] All TypeScript files compile without errors
- [ ] All API functions tested and working
- [ ] PhotoCapture component works on iOS/Android
- [ ] Reports list page loads and displays data
- [ ] Create report form validates and submits
- [ ] Report detail page shows all information
- [ ] HTML export includes embedded photos

### **User Experience Criteria**

- [ ] Joe Sievers can create daily report in < 2 minutes
- [ ] Can log module issue with photos in < 37 seconds
- [ ] Photos compress to < 1MB automatically
- [ ] Mobile UI is smooth and responsive
- [ ] No horizontal scrolling on any page
- [ ] All touch targets ≥ 44px
- [ ] Forms save drafts to localStorage
- [ ] Export works on first try

### **Production Criteria**

- [ ] Deployed to Vercel production
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] No console errors in production
- [ ] Works on iPhone Safari (tested)
- [ ] Works on Android Chrome (tested)
- [ ] Field crew trained (Joe Sievers)
- [ ] First real report submitted from job site

---

## 🎯 NEXT STEPS AFTER GO-LIVE

### **Week 1-2: Field Testing & Iteration**

- [ ] Joe uses tool daily on Central Sacramento project
- [ ] Collect feedback every evening
- [ ] Fix bugs within 24 hours
- [ ] Track: Average time to log issue (target <37 sec)
- [ ] Monitor: Photo sizes, compression quality
- [ ] Adjust: UI/UX based on field feedback

### **Week 3: Factory Response System**

- [ ] Build factory dashboard (`/on-sites/factory`)
- [ ] List all unresolved issues
- [ ] Add response form (root cause, remedial action)
- [ ] Email notification when factory responds
- [ ] Test two-way communication workflow

### **Week 4: Analytics & Reporting**

- [ ] Dashboard with KPIs:
  * Total issues by type
  * Average response time
  * Most common quality issues
  * Issues by module/project
- [ ] Export analytics to Excel
- [ ] Weekly summary email to leadership

### **Month 2: Advanced Features**

- [ ] Push notifications to field crew
- [ ] Offline mode with service worker
- [ ] Photo annotation (draw on photos)
- [ ] Voice-to-text for descriptions
- [ ] Integration with Equipment Module
- [ ] Timeline Impact Analysis

### **Month 3: Multi-Site Expansion**

- [ ] Test scalability (100+ reports)
- [ ] Performance optimization
- [ ] Prepare for Factory #2 deployment
- [ ] Train additional superintendents
- [ ] Create user documentation
- [ ] Record training videos

---

## 📊 KEY PERFORMANCE INDICATORS

Track these metrics weekly:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Issue Logging Speed | < 37 seconds | Timer in IssueLogger component |
| Digital Adoption | > 80% of reports | Reports created vs total jobs |
| Photo Quality | 3+ photos/issue | Average photos per issue |
| Factory Response Time | < 24 hours | responded_at - created_at |
| Issues Logged | 50+/week | Count from database |
| User Satisfaction | 4+/5 stars | Weekly survey to Joe |

---

## 🎉 YOU'RE READY TO BUILD!

**This README contains everything you need:**

✅ Complete database schema  
✅ All core files with full code  
✅ Windsurf prompts for each component  
✅ Step-by-step testing guide  
✅ Deployment instructions  
✅ Troubleshooting solutions  
✅ Success criteria checklist  

**Start with Step 1: Database Setup**

Use Windsurf + Claude with the exact prompts provided.

Build systematically, test as you go, deploy with confidence.

**Estimated timeline: 8-12 hours over 5 days**

**Questions? Just ask. Otherwise: LET'S BUILD! 🚀**

---

**End of README**

*Version 2.2 - December 27, 2024*  
*Trevor Fletcher - MODA Production Manager*  
*Autovol Volumetric Modular - Nampa, Idaho*
