# MODA Architecture Analysis Prompts (Corrected)

> **Purpose:** Comprehensive analysis prompts for improving MODA architecture, performance, and multi-user readiness.
> **Created:** January 2025
> **Target:** Multi-site deployment preparation

---

## 1. Overall Architecture Analysis

Analyze the entire MODA codebase and provide:

1. **Component hierarchy map** showing parent-child relationships
2. **Data flow patterns** (props drilling, MODA_STATE pub/sub usage, useState patterns)
3. **Potential circular dependencies** or tight coupling issues
4. **Recommendations for architectural improvements** before multi-site expansion

**Context:**
- Main app component: `js/components/App.jsx` (~4,600 lines)
- State manager: `js/stateManager.js` (custom pub/sub pattern)
- Data layer: `js/dataLayer.js` (unified module management)
- Supabase integration: `js/supabase-data.js`

Focus on areas that would impact performance with planned multi-site user growth.

---

## 2. Performance Bottleneck Identification

Review all React components and identify:

1. **Components rendering unnecessarily** (missing React.memo, useMemo, useCallback)
2. **Large list rendering without virtualization** (22-stage production line, weekly module boards)
3. **Heavy computations in render cycles**
4. **localStorage operations that could cause UI blocking** (MODA_STORAGE patterns)
5. **Components exceeding 300 lines that should be split**

**Known large components:**
- `App.jsx` (~4,600 lines)
- `WeeklyBoard.jsx` (~4,500 lines)
- `DrawingsModule.jsx` (~2,000 lines)
- `EquipmentModule.jsx` (~1,800 lines)
- `PeopleModule.jsx` (~1,500 lines)

Prioritize fixes by user experience impact.

---

## 3. Data Management Efficiency

Audit current data architecture and suggest optimizations:

1. **localStorage usage patterns** and size limits for offline capability
   - Current: `MODA_STORAGE` with batched writes (`STORAGE_BATCH_DELAY: 500ms`)
   - Keys defined in `MODA_CONSTANTS.STORAGE_KEYS`

2. **Data normalization opportunities** (duplicate Module data across departments)
   - Unified modules in `autovol_unified_modules`
   - Project-embedded modules in `autovol_projects`

3. **Supabase query efficiency** (N+1 queries, missing indexes)
   - Current API: `js/supabase-data.js`

4. **Caching strategies** for frequently accessed data (BLM identifiers, unit types)

5. **Migration path** from localStorage to Supabase without breaking offline mode
   - Current fallback pattern in `supabase-data.js`

**Consider:** Excel import/export, dual BLM tracking (hitchBLM/rearBLM).

---

## 4. Mobile-First Optimization

Analyze mobile performance for factory floor workers:

1. **Bundle size analysis** and code-splitting opportunities
2. **Touch target sizes** (minimum 44x44px for factory gloves)
   - Current: `css/mobile.css` with touch-friendly styles
3. **Lazy loading implementation** for modules not immediately needed
4. **Network request optimization** for Wi-Fi dead zones
5. **PWA capabilities** for offline-first experience
   - Current: `public/manifest.json`

**Existing mobile infrastructure:**
- `js/hooks/useMobile.js` - Mobile detection hooks
- `js/components/MobileNavigation.jsx` - Hamburger menu, slide-out drawer
- `css/mobile.css` - Responsive styles, safe area insets

Target: Sub-3-second load time on factory floor devices.

---

## 5. State Management Review

Evaluate current state management approach:

1. **Map all useState, MODA_STATE, and prop drilling patterns**
   - Current: Custom pub/sub in `js/stateManager.js`
   - Subscribers pattern with `subscribe()` / `unsubscribe()`

2. **Identify shared state** that could benefit from global context or enhanced MODA_STATE

3. **Recommend approach for multi-site architecture:**
   - Enhance existing MODA_STATE pub/sub
   - Migrate to React Context
   - Adopt Zustand (lightweight, similar pattern)

4. **Analyze re-render frequency** in critical components (Module cards, Weekly Board)

5. **Suggest state cleanup strategies** for completed modules

Focus on: People module, Project Directory lifecycle, Department status rollup.

---

## 6. Component Reusability Analysis

Identify code duplication and reusability opportunities:

1. **Similar UI patterns across modules:**
   - Module cards (used in WeeklyBoard, TrackerModule, TransportModule)
   - Status indicators (progress bars, completion badges)
   - Difficulty badges (PROTO, STAIR, 3HR, SW, SHORT, DBL, SAWBOX)

2. **Shared logic that could be custom hooks:**
   - Supabase data fetching patterns
   - localStorage sync patterns
   - Module filtering/sorting

3. **Common patterns that should be design system components:**
   - Modal dialogs (multiple implementations)
   - Form inputs with validation
   - Data tables with sorting/filtering

4. **Form patterns** used across editing functionality

5. **Utility functions** duplicated across files

Goal: Build component library before multi-site development starts.

---

## 7. Security & Permissions Architecture

Review security implementation for multi-user deployment:

1. **Current role-based permission enforcement:**
   - `js/dashboardRoles.js` - Role definitions
   - `auth.canEditTab()` pattern in components
   - Admin/User level distinctions

2. **Supabase RLS policy recommendations** for department isolation

3. **Data exposure risks in localStorage:**
   - Sensitive BLM/unit data stored client-side
   - Session data in `sessionStorage`

4. **API endpoint security** for mobile apps

5. **Audit trail implementation** for production changes
   - Current: `ActivityLog` in some components
   - Stagger change log in `useProductionWeeks`

Consider: Department-level access control, supervisor validation requirements, IP ownership protection.

---

## 8. Database Schema Optimization

Analyze Supabase schema for production readiness:

1. **Table relationships** and foreign key usage

2. **Index recommendations** for common queries:
   - Module lookup by BLM
   - Stage filtering
   - Project-based queries

3. **Data denormalization opportunities** for read performance

4. **Timestamp tracking** for version control and audit trails

5. **Migration strategy** from current localStorage structure

**Schema must support:**
- 22 production stages (defined in `MODA_CONSTANTS.PRODUCTION_STAGES`)
- Dual BLM corridors (hitchBLM, rearBLM)
- Sawbox tracking
- Module lifecycle phases (PRODUCTION → YARD → TRANSPORT → ONSITE → COMPLETE)

---

## 9. Build & Deployment Efficiency

Review build pipeline and deployment process:

1. **Vite configuration optimization:**
   - Current: `vite.config.ts`
   - Tree-shaking, minification settings

2. **Environment variable management:**
   - Production/development strategy
   - Supabase keys handling

3. **GitHub Actions opportunities** for CI/CD automation
   - Current: `.github/workflows/` for Firebase hosting

4. **Vercel deployment optimization:**
   - Current: `vercel.json`
   - Preview deployments workflow

5. **Asset optimization:**
   - Images, fonts (IBM Plex Sans, JetBrains Mono per AV Style)
   - Current logo: `public/autovol-logo.png`

---

## 10. Testing Infrastructure Assessment

Identify testing gaps:

1. **Components missing unit tests** (especially editing functionality)
   - Current: `jest.config.js` exists but limited test coverage

2. **Integration test opportunities** for module lifecycle tracking

3. **E2E test scenarios** for critical workflows:
   - Excel import
   - Department rollup
   - Module progression through stages

4. **Performance regression testing** setup

5. **Mock data generation** coverage analysis

---

## 11. Code Quality & Maintainability

Run comprehensive code quality analysis:

1. **JavaScript type safety gaps:**
   - JSDoc annotation coverage
   - Runtime type validation
   - Potential TypeScript migration path

2. **ESLint/Prettier inconsistencies** across the codebase

3. **Dead code and unused imports**

4. **Console.log statements** and debug code in production

5. **Documentation coverage:**
   - Inline comments
   - README accuracy
   - `docs/` folder completeness

Prepare for: Multi-developer environment in future expansion.

---

## 12. Module-Specific Deep Dives

### Weekly Board Analysis
Analyze `js/components/WeeklyBoard.jsx`:

1. Performance profiling of this specific module
2. Integration points with other modules (data dependencies)
3. Offline capability implementation quality
4. Mobile UX friction points for factory workers
5. Scalability concerns for multi-site deployment

### Drawing Management Analysis
Analyze `js/components/DrawingsModule.jsx`:

1. OCR integration patterns
2. File storage and retrieval efficiency
3. Search functionality performance
4. Sheet browser navigation UX

### QA Traveler Analysis
Analyze `js/components/qa/TravelersPanel.jsx`:

1. Traveler lifecycle tracking
2. Checkpoint validation patterns
3. Photo attachment handling
4. Integration with production stages

Provide refactoring recommendations with effort estimates.

---

## Implementation Priority

| Priority | Analysis | Rationale |
|----------|----------|-----------|
| 1 | Architecture Analysis | Foundation for all other work |
| 2 | Performance Bottlenecks | Quick wins for user experience |
| 3 | Component Reusability | Reduces future development effort |
| 4 | State Management | Critical for multi-user functionality |
| 5 | Security & Permissions | Required before multi-site deployment |
| 6 | Database Schema | Supabase optimization for scale |
| 7 | Mobile Optimization | Factory floor worker experience |
| 8 | Data Management | localStorage → Supabase migration |
| 9 | Build & Deployment | CI/CD automation |
| 10 | Testing Infrastructure | Regression prevention |
| 11 | Code Quality | Long-term maintainability |
| 12 | Module Deep Dives | Component-specific optimization |
