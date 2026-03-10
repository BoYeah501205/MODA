/**
 * Sequence Builder Constants
 * Shared constants for the Production Sequence Builder feature
 */

// Difficulty indicator tags with display names and colors
// Auto-calculated tags: dbl-studio (both Hitch & Rear Room Type contain "Studio"), sawbox (Hitch BLM ≠ Rear BLM)
export const DIFFICULTY_TAGS = [
  { id: 'ext-sidewall', name: 'Ext Sidewall', color: '#ef4444', bgColor: '#fef2f2', autoCalc: false },
  { id: 'stair', name: 'Stair', color: '#f97316', bgColor: '#fff7ed', autoCalc: false },
  { id: 'three-hr', name: '3HR-Wall', color: '#eab308', bgColor: '#fefce8', autoCalc: false },
  { id: 'two-hr', name: '2HR-Wall', color: '#a3e635', bgColor: '#f7fee7', autoCalc: false },
  { id: 'short', name: 'Short', color: '#22c55e', bgColor: '#f0fdf4', autoCalc: false },
  { id: 'dbl-studio', name: 'Dbl Studio', color: '#3b82f6', bgColor: '#eff6ff', autoCalc: true },
  { id: 'common', name: 'Common Area', color: '#06b6d4', bgColor: '#ecfeff', autoCalc: false },
  { id: 'tile', name: 'Tile', color: '#ec4899', bgColor: '#fdf2f8', autoCalc: false },
  { id: 'sawbox', name: 'Sawbox', color: '#8b5cf6', bgColor: '#f5f3ff', autoCalc: true },
];

// Map tag IDs to their full objects for quick lookup
export const DIFFICULTY_TAG_MAP = DIFFICULTY_TAGS.reduce((acc, tag) => {
  acc[tag.id] = tag;
  return acc;
}, {});

// Default columns for the module grid
export const DEFAULT_COLUMNS = [
  { id: 'checkbox', label: '', width: 40, sortable: false },
  { id: 'build_sequence', label: 'Seq #', width: 70, sortable: true },
  { id: 'set_sequence', label: 'Set #', width: 70, sortable: true },
  { id: 'serial_number', label: 'Serial #', width: 120, sortable: true },
  { id: 'blm_id', label: 'BLM', width: 100, sortable: true },
  { id: 'unit_type', label: 'Unit Type', width: 120, sortable: true },
  { id: 'building', label: 'Building', width: 80, sortable: true },
  { id: 'level', label: 'Level', width: 70, sortable: true },
  { id: 'difficulty_tags', label: 'Difficulty Tags', width: 200, sortable: false },
  { id: 'notes', label: 'Notes', width: 150, sortable: false },
  { id: 'actions', label: '', width: 80, sortable: false },
];

// Building configuration presets
export const BUILDING_PRESETS = {
  single: { buildings: 1, label: 'Single Building' },
  dual: { buildings: 2, label: 'Two Buildings' },
  multi: { buildings: 3, label: 'Three+ Buildings' },
};

// Level configuration (typical for modular construction)
export const LEVEL_OPTIONS = [
  { value: 1, label: 'Level 1' },
  { value: 2, label: 'Level 2' },
  { value: 3, label: 'Level 3' },
  { value: 4, label: 'Level 4' },
  { value: 5, label: 'Level 5' },
  { value: 6, label: 'Level 6' },
];

// Unit type categories
export const UNIT_TYPE_CATEGORIES = [
  'Studio',
  '1BR',
  '1BR+Den',
  '2BR',
  '2BR+Den',
  '3BR',
  'Corridor',
  'Stair',
  'Elevator',
  'Mechanical',
  'Common',
  'Other',
];

// Sort directions
export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
  NONE: null,
};

// Filter operators for advanced filtering
export const FILTER_OPERATORS = {
  EQUALS: 'equals',
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
  BETWEEN: 'between',
  IN: 'in',
  NOT_IN: 'notIn',
};

// Bulk edit field options
export const BULK_EDIT_FIELDS = [
  { id: 'building', label: 'Building', type: 'select' },
  { id: 'level', label: 'Level', type: 'select' },
  { id: 'unit_type', label: 'Unit Type', type: 'select' },
  { id: 'difficulty_tags', label: 'Difficulty Tags', type: 'tags' },
  { id: 'notes', label: 'Notes', type: 'text' },
];

// Serial number generation patterns
export const SERIAL_PATTERNS = {
  SEQUENTIAL: 'sequential',      // 001, 002, 003...
  BLM_BASED: 'blm_based',        // B1L2M01, B1L2M02...
  CUSTOM: 'custom',              // User-defined pattern
};

// Undo/Redo stack limits
export const HISTORY_LIMIT = 50;

// Auto-save debounce delay (ms)
export const AUTO_SAVE_DELAY = 2000;

// Pagination options
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
export const DEFAULT_PAGE_SIZE = 50;

// Export formats
export const EXPORT_FORMATS = {
  CSV: 'csv',
  EXCEL: 'xlsx',
  JSON: 'json',
};

// Status indicators for sequence builder workflow
export const WORKFLOW_STEPS = [
  { id: 'setup', label: 'Project Setup', description: 'Configure buildings and levels' },
  { id: 'generate', label: 'Generate Modules', description: 'Create module entries' },
  { id: 'sequence', label: 'Set Sequence', description: 'Assign build order' },
  { id: 'tags', label: 'Add Tags', description: 'Apply difficulty indicators' },
  { id: 'review', label: 'Review & Save', description: 'Finalize and save to project' },
];

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  UNDO: { key: 'z', ctrl: true, description: 'Undo last action' },
  REDO: { key: 'y', ctrl: true, description: 'Redo last action' },
  SAVE: { key: 's', ctrl: true, description: 'Save changes' },
  SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all modules' },
  DELETE: { key: 'Delete', ctrl: false, description: 'Delete selected modules' },
  ESCAPE: { key: 'Escape', ctrl: false, description: 'Clear selection / Close modal' },
  BULK_EDIT: { key: 'e', ctrl: true, description: 'Open bulk edit' },
  FILTER: { key: 'f', ctrl: true, description: 'Focus filter' },
};

// Validation rules
export const VALIDATION_RULES = {
  SERIAL_NUMBER: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[A-Za-z0-9-_]+$/,
    message: 'Serial number must be alphanumeric with dashes or underscores',
  },
  BLM_ID: {
    pattern: /^B\d+L\d+M\d+$/i,
    message: 'BLM must follow format: B1L2M01 (Building, Level, Module)',
  },
  BUILD_SEQUENCE: {
    min: 1,
    max: 9999,
    message: 'Build sequence must be between 1 and 9999',
  },
  SET_SEQUENCE: {
    min: 1,
    max: 9999,
    message: 'Set sequence must be between 1 and 9999',
  },
};

// Default module template
export const DEFAULT_MODULE = {
  id: null,
  serial_number: '',
  blm_id: '',
  unit_type: '',
  building: 1,
  level: 1,
  build_sequence: null,
  set_sequence: null,
  difficulty_tags: [],
  notes: '',
  created_at: null,
  updated_at: null,
};

// Helper function to parse BLM ID into components
export function parseBLM(blmId) {
  if (!blmId) return null;
  const match = blmId.match(/^B(\d+)L(\d+)M(\d+)$/i);
  if (!match) return null;
  return {
    building: parseInt(match[1], 10),
    level: parseInt(match[2], 10),
    module: parseInt(match[3], 10),
  };
}

// Helper function to generate BLM ID from components
export function generateBLM(building, level, module) {
  const b = String(building).padStart(1, '0');
  const l = String(level).padStart(1, '0');
  const m = String(module).padStart(2, '0');
  return `B${b}L${l}M${m}`;
}

// Helper function to get tag by ID
export function getTagById(tagId) {
  return DIFFICULTY_TAG_MAP[tagId] || null;
}

// Helper function to get multiple tags by IDs
export function getTagsByIds(tagIds) {
  if (!Array.isArray(tagIds)) return [];
  return tagIds.map(id => DIFFICULTY_TAG_MAP[id]).filter(Boolean);
}
