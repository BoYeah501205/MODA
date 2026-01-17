# In-App PDF Viewer with Markup & Issue Reporting

## Overview
This document outlines the concept for an integrated PDF viewer within MODA that allows users to view drawings, add markup annotations, and report issues directly from the drawing interface.

## Current State
- PDFs open in a new browser tab using SharePoint's pre-authenticated download URL
- No in-app viewing capability
- No markup or annotation tools
- Issue reporting is separate from drawing context

## Proposed Features

### 1. In-App PDF Viewer
**Core Functionality:**
- Embedded PDF viewer within MODA (modal or full-screen)
- Zoom, pan, rotate controls
- Page navigation for multi-page documents
- Thumbnail sidebar for quick page navigation
- Full-screen mode toggle

**Technology Options:**
| Library | Pros | Cons |
|---------|------|------|
| **PDF.js** (Mozilla) | Free, open-source, widely used, good rendering | Large bundle size (~500KB), requires worker setup |
| **react-pdf** | React wrapper for PDF.js, easy integration | Same PDF.js limitations |
| **PSPDFKit** | Professional, excellent markup tools, mobile support | Commercial license required ($$$) |
| **PDF-LIB** | Lightweight, can modify PDFs | Limited viewing features |
| **Google Docs Viewer** | No library needed, just iframe | Requires public URL, limited control |

**Recommendation:** Start with **PDF.js/react-pdf** for viewing, add custom markup layer on top.

### 2. Markup & Annotation Tools

**Annotation Types:**
- **Shapes:** Rectangle, circle, arrow, line
- **Text:** Text boxes, callouts with leader lines
- **Freehand:** Drawing/sketching tool
- **Stamps:** Predefined stamps (Approved, Rejected, Revision Required, etc.)
- **Highlights:** Area highlighting with transparency
- **Measurements:** Distance and area measurement tools

**Markup Data Storage:**
```javascript
// Annotation schema
{
  id: "uuid",
  drawing_id: "uuid",
  version_id: "uuid",
  page_number: 1,
  type: "rectangle|circle|arrow|text|freehand|stamp|highlight",
  coordinates: { x: 100, y: 200, width: 50, height: 30 },
  style: { color: "#FF0000", strokeWidth: 2, fill: "transparent" },
  content: "Optional text content",
  created_by: "user_id",
  created_at: "timestamp",
  updated_at: "timestamp"
}
```

**Storage Options:**
1. **Supabase table** - Store annotations as JSON, link to drawing/version
2. **Embedded in PDF** - Use PDF-LIB to embed annotations (permanent)
3. **Hybrid** - Store in DB, option to "flatten" into PDF for export

### 3. Issue Reporting Integration

**Workflow:**
1. User views drawing in PDF viewer
2. User clicks "Report Issue" button
3. User draws/marks the problem area on the drawing
4. Issue form appears with:
   - Auto-captured screenshot of marked area
   - Drawing name, version, page number pre-filled
   - Module link (if Module Packages)
   - Issue type dropdown (Design Error, Missing Info, Conflict, etc.)
   - Priority selector
   - Description field
   - Assignee selector
5. Issue saved with visual reference

**Issue Schema:**
```javascript
{
  id: "uuid",
  drawing_id: "uuid",
  version_id: "uuid",
  page_number: 1,
  markup_snapshot: "base64_image", // Screenshot of marked area
  markup_coordinates: { x, y, width, height },
  issue_type: "design_error|missing_info|conflict|dimension_error|other",
  priority: "low|medium|high|critical",
  title: "Issue title",
  description: "Detailed description",
  status: "open|in_progress|resolved|closed",
  assigned_to: "user_id",
  module_id: "optional_module_link",
  created_by: "user_id",
  created_at: "timestamp",
  resolved_at: "timestamp",
  resolution_notes: "How it was resolved"
}
```

### 4. Mobile Considerations

**Challenges:**
- Touch-based markup is harder than mouse
- Screen real estate is limited
- PDF rendering performance on mobile

**Solutions:**
- Simplified markup tools on mobile (basic shapes only)
- Pinch-to-zoom with smooth rendering
- "Quick Issue" mode - tap to mark, minimal form
- Option to "Continue on Desktop" for complex markup

### 5. Implementation Phases

**Phase 1: Basic Viewer (2-3 weeks)**
- Integrate PDF.js/react-pdf
- Basic viewing controls (zoom, pan, page nav)
- Full-screen modal
- Works on desktop and mobile

**Phase 2: Markup Tools (3-4 weeks)**
- Canvas overlay for annotations
- Basic shapes (rectangle, circle, arrow)
- Text annotations
- Color picker
- Save/load annotations from Supabase

**Phase 3: Issue Reporting (2-3 weeks)**
- Issue creation from markup
- Screenshot capture
- Issue list view per drawing
- Status tracking
- Notifications

**Phase 4: Advanced Features (4+ weeks)**
- Freehand drawing
- Measurement tools
- Stamp library
- Compare versions side-by-side
- Export annotated PDF
- Offline support

## Database Schema Additions

```sql
-- Annotations table
CREATE TABLE drawing_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
  version_id UUID REFERENCES drawing_versions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  annotation_type TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  style JSONB,
  content TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing issues table
CREATE TABLE drawing_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
  version_id UUID REFERENCES drawing_versions(id),
  page_number INTEGER,
  markup_snapshot TEXT, -- Base64 image
  markup_coordinates JSONB,
  issue_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id),
  module_id TEXT, -- Link to module if applicable
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Indexes
CREATE INDEX idx_annotations_drawing ON drawing_annotations(drawing_id);
CREATE INDEX idx_annotations_version ON drawing_annotations(version_id);
CREATE INDEX idx_issues_drawing ON drawing_issues(drawing_id);
CREATE INDEX idx_issues_status ON drawing_issues(status);
CREATE INDEX idx_issues_assigned ON drawing_issues(assigned_to);
```

## UI Mockup Concept

```
+------------------------------------------------------------------+
|  [<] B1L4M26 - Shops.pdf                    [Markup] [Issue] [X] |
+------------------------------------------------------------------+
|  [Thumbnails]  |                                                  |
|  +----------+  |     +----------------------------------+         |
|  | Page 1   |  |     |                                  |         |
|  +----------+  |     |                                  |         |
|  +----------+  |     |         PDF CONTENT              |         |
|  | Page 2   |  |     |                                  |         |
|  +----------+  |     |    [User markup overlay]         |         |
|  +----------+  |     |                                  |         |
|  | Page 3   |  |     +----------------------------------+         |
|  +----------+  |                                                  |
|                |  [-] [+] [100%] [Fit] [Rotate] [Fullscreen]     |
+------------------------------------------------------------------+
|  Markup Tools: [Rectangle] [Circle] [Arrow] [Text] [Color: Red]  |
+------------------------------------------------------------------+
```

## Security Considerations

- Annotations stored per-user or shared based on permissions
- Issue visibility based on project access
- Audit trail for all changes
- No direct PDF modification (annotations are overlay)

## Performance Considerations

- Lazy load PDF pages (render visible + adjacent)
- Cache rendered pages
- Compress annotation data
- Limit markup complexity on mobile
- Consider WebGL rendering for large PDFs

## Next Steps (When Ready to Implement)

1. Evaluate PDF.js bundle size impact
2. Create proof-of-concept with basic viewer
3. Test on target mobile devices
4. Design annotation data structure
5. Build canvas overlay system
6. Integrate with existing drawings module
