/**
 * Supabase Sequence Builder Data Access Layer
 * Handles all database operations for the Production Sequence Builder feature
 */

// Get Supabase client from global scope (uses MODA's standard pattern)
const getSupabase = () => {
  if (typeof window !== 'undefined' && window.MODA_SUPABASE && window.MODA_SUPABASE.client) {
    return window.MODA_SUPABASE.client;
  }
  throw new Error('Supabase client not initialized - MODA_SUPABASE.client not available');
};

const isSupabaseAvailable = () => {
  return window.MODA_SUPABASE && window.MODA_SUPABASE.isInitialized && window.MODA_SUPABASE.client;
};

/**
 * Fetch all modules for a project with their sequence data
 * @param {string} projectId - The project UUID
 * @returns {Promise<Array>} Array of module objects
 */
async function fetchProjectModules(projectId) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('project_id', projectId)
    .order('build_sequence', { ascending: true, nullsFirst: false });
  
  if (error) {
    console.error('Error fetching project modules:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Fetch a single module by ID
 * @param {string} moduleId - The module UUID
 * @returns {Promise<Object|null>} Module object or null
 */
async function fetchModuleById(moduleId) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', moduleId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching module:', error);
    throw error;
  }
  
  return data;
}

/**
 * Create a new module
 * @param {Object} moduleData - Module data to insert
 * @returns {Promise<Object>} Created module
 */
async function createModule(moduleData) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('modules')
    .insert([{
      ...moduleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating module:', error);
    throw error;
  }
  
  return data;
}

/**
 * Create multiple modules in batch
 * @param {Array} modulesData - Array of module data objects
 * @returns {Promise<Array>} Created modules
 */
async function createModulesBatch(modulesData) {
  const supabase = getSupabase();
  
  const timestamp = new Date().toISOString();
  const modulesWithTimestamps = modulesData.map(m => ({
    ...m,
    created_at: timestamp,
    updated_at: timestamp,
  }));
  
  const { data, error } = await supabase
    .from('modules')
    .insert(modulesWithTimestamps)
    .select();
  
  if (error) {
    console.error('Error creating modules batch:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Update a single module
 * @param {string} moduleId - The module UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated module
 */
async function updateModule(moduleId, updates) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('modules')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', moduleId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating module:', error);
    throw error;
  }
  
  return data;
}

/**
 * Update multiple modules in batch
 * @param {Array<{id: string, updates: Object}>} moduleUpdates - Array of {id, updates} objects
 * @returns {Promise<Array>} Updated modules
 */
async function updateModulesBatch(moduleUpdates) {
  const supabase = getSupabase();
  const timestamp = new Date().toISOString();
  
  // Supabase doesn't support batch updates natively, so we use upsert
  // First, fetch existing modules to merge data
  const moduleIds = moduleUpdates.map(m => m.id);
  
  const { data: existingModules, error: fetchError } = await supabase
    .from('modules')
    .select('*')
    .in('id', moduleIds);
  
  if (fetchError) {
    console.error('Error fetching modules for batch update:', fetchError);
    throw fetchError;
  }
  
  // Merge updates with existing data
  const existingMap = new Map(existingModules.map(m => [m.id, m]));
  const mergedModules = moduleUpdates.map(({ id, updates }) => ({
    ...existingMap.get(id),
    ...updates,
    id,
    updated_at: timestamp,
  }));
  
  const { data, error } = await supabase
    .from('modules')
    .upsert(mergedModules)
    .select();
  
  if (error) {
    console.error('Error batch updating modules:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Delete a single module
 * @param {string} moduleId - The module UUID
 * @returns {Promise<void>}
 */
async function deleteModule(moduleId) {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', moduleId);
  
  if (error) {
    console.error('Error deleting module:', error);
    throw error;
  }
}

/**
 * Delete multiple modules in batch
 * @param {Array<string>} moduleIds - Array of module UUIDs
 * @returns {Promise<void>}
 */
async function deleteModulesBatch(moduleIds) {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('modules')
    .delete()
    .in('id', moduleIds);
  
  if (error) {
    console.error('Error batch deleting modules:', error);
    throw error;
  }
}

/**
 * Update build sequence for multiple modules
 * @param {Array<{id: string, build_sequence: number}>} sequenceUpdates - Array of {id, build_sequence}
 * @returns {Promise<Array>} Updated modules
 */
async function updateBuildSequences(sequenceUpdates) {
  return updateModulesBatch(
    sequenceUpdates.map(({ id, build_sequence }) => ({
      id,
      updates: { build_sequence: Math.round(build_sequence) }, // Ensure integer
    }))
  );
}

/**
 * Update set sequence for multiple modules
 * @param {Array<{id: string, set_sequence: number}>} sequenceUpdates - Array of {id, set_sequence}
 * @returns {Promise<Array>} Updated modules
 */
async function updateSetSequences(sequenceUpdates) {
  return updateModulesBatch(
    sequenceUpdates.map(({ id, set_sequence }) => ({
      id,
      updates: { set_sequence: Math.round(set_sequence) }, // Ensure integer
    }))
  );
}

/**
 * Update difficulty tags for a module
 * @param {string} moduleId - The module UUID
 * @param {Array<string>} tags - Array of tag IDs
 * @returns {Promise<Object>} Updated module
 */
async function updateModuleTags(moduleId, tags) {
  return updateModule(moduleId, { difficulty_tags: tags });
}

/**
 * Bulk update difficulty tags for multiple modules
 * @param {Array<string>} moduleIds - Array of module UUIDs
 * @param {Array<string>} tags - Array of tag IDs to set
 * @param {string} mode - 'replace', 'add', or 'remove'
 * @returns {Promise<Array>} Updated modules
 */
async function bulkUpdateModuleTags(moduleIds, tags, mode = 'replace') {
  const supabase = getSupabase();
  
  // Fetch current modules to get existing tags
  const { data: existingModules, error: fetchError } = await supabase
    .from('modules')
    .select('id, difficulty_tags')
    .in('id', moduleIds);
  
  if (fetchError) {
    console.error('Error fetching modules for tag update:', fetchError);
    throw fetchError;
  }
  
  // Calculate new tags based on mode
  const updates = existingModules.map(module => {
    let newTags;
    const currentTags = module.difficulty_tags || [];
    
    switch (mode) {
      case 'add':
        newTags = [...new Set([...currentTags, ...tags])];
        break;
      case 'remove':
        newTags = currentTags.filter(t => !tags.includes(t));
        break;
      case 'replace':
      default:
        newTags = tags;
        break;
    }
    
    return { id: module.id, updates: { difficulty_tags: newTags } };
  });
  
  return updateModulesBatch(updates);
}

/**
 * Reorder modules by inserting a module at a new position
 * @param {string} projectId - The project UUID
 * @param {string} moduleId - The module to move
 * @param {number} newPosition - The new position (1-indexed)
 * @returns {Promise<Array>} Updated modules with new sequences
 */
async function reorderModule(projectId, moduleId, newPosition) {
  const modules = await fetchProjectModules(projectId);
  
  // Find the module to move
  const moduleIndex = modules.findIndex(m => m.id === moduleId);
  if (moduleIndex === -1) {
    throw new Error('Module not found');
  }
  
  // Remove from current position
  const [movedModule] = modules.splice(moduleIndex, 1);
  
  // Insert at new position (convert to 0-indexed)
  const insertIndex = Math.max(0, Math.min(newPosition - 1, modules.length));
  modules.splice(insertIndex, 0, movedModule);
  
  // Update all build sequences
  const sequenceUpdates = modules.map((m, index) => ({
    id: m.id,
    build_sequence: index + 1,
  }));
  
  return updateBuildSequences(sequenceUpdates);
}

/**
 * Auto-generate build sequence numbers for all modules in a project
 * @param {string} projectId - The project UUID
 * @param {string} sortBy - Field to sort by before assigning sequences
 * @param {string} sortOrder - 'asc' or 'desc'
 * @returns {Promise<Array>} Updated modules
 */
async function autoGenerateSequences(projectId, sortBy = 'blm_id', sortOrder = 'asc') {
  const modules = await fetchProjectModules(projectId);
  
  // Sort modules
  const sorted = [...modules].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  // Assign sequential build numbers
  const sequenceUpdates = sorted.map((m, index) => ({
    id: m.id,
    build_sequence: index + 1,
  }));
  
  return updateBuildSequences(sequenceUpdates);
}

/**
 * Generate modules from a configuration
 * New format: config.modules contains pre-generated module objects from SetupDialog
 * @param {string} projectId - The project UUID
 * @param {Object} config - Generation configuration
 * @param {Array} config.modules - Pre-generated module objects
 * @param {Array} config.buildings - Building configuration (for reference)
 * @returns {Promise<Array>} Created modules
 */
async function generateModulesFromConfig(projectId, config) {
  // New format: modules are pre-generated by SetupDialog
  if (config.modules && Array.isArray(config.modules)) {
    // Strip client-side IDs and ensure project_id is set
    const modulesToCreate = config.modules.map(m => ({
      project_id: projectId,
      serial_number: m.serial_number || '',
      blm_id: m.blm_id,
      hitch_blm: m.hitch_blm || m.blm_id,
      rear_blm: m.rear_blm || m.blm_id,
      building: m.building,
      level: m.level,
      unit_type: m.unit_type || '',
      build_sequence: m.build_sequence,
      set_sequence: m.set_sequence || null,
      difficulty_tags: m.difficulty_tags || [],
      notes: m.notes || '',
    }));
    
    return createModulesBatch(modulesToCreate);
  }
  
  // Legacy format support (buildingConfigs)
  if (config.buildingConfigs) {
    const modules = [];
    let serialCounter = config.startingSerial || 1;
    let buildSequence = 1;
    
    for (const buildingConfig of config.buildingConfigs) {
      const { building, levels, modulesPerLevel } = buildingConfig;
      
      for (let level = 1; level <= levels; level++) {
        for (let moduleNum = 1; moduleNum <= modulesPerLevel; moduleNum++) {
          const serialNumber = config.serialPrefix 
            ? `${config.serialPrefix}-${String(serialCounter).padStart(3, '0')}`
            : String(serialCounter).padStart(3, '0');
          
          const blmId = `B${building}L${level}M${String(moduleNum).padStart(2, '0')}`;
          
          modules.push({
            project_id: projectId,
            serial_number: serialNumber,
            blm_id: blmId,
            hitch_blm: blmId,
            rear_blm: blmId,
            building: building,
            level: level,
            unit_type: '',
            build_sequence: buildSequence,
            set_sequence: null,
            difficulty_tags: [],
            notes: '',
          });
          
          serialCounter++;
          buildSequence++;
        }
      }
    }
    
    return createModulesBatch(modules);
  }
  
  throw new Error('Invalid configuration: must provide modules or buildingConfigs');
}

/**
 * Import modules from CSV/Excel data
 * @param {string} projectId - The project UUID
 * @param {Array<Object>} importData - Array of module data from import
 * @param {Object} options - Import options
 * @param {boolean} options.overwrite - Whether to overwrite existing modules
 * @returns {Promise<{created: number, updated: number, errors: Array}>}
 */
async function importModules(projectId, importData, options = {}) {
  const supabase = getSupabase();
  const results = { created: 0, updated: 0, errors: [] };
  
  // Fetch existing modules to check for duplicates
  const existingModules = await fetchProjectModules(projectId);
  const existingBySerial = new Map(existingModules.map(m => [m.serial_number, m]));
  
  const toCreate = [];
  const toUpdate = [];
  
  for (const row of importData) {
    try {
      const moduleData = {
        project_id: projectId,
        serial_number: row.serial_number || row.serialNumber || row['Serial #'],
        blm_id: row.blm_id || row.blmId || row.BLM || row['BLM'],
        unit_type: row.unit_type || row.unitType || row['Unit Type'] || '',
        building: parseInt(row.building || row.Building || 1, 10),
        level: parseInt(row.level || row.Level || 1, 10),
        build_sequence: row.build_sequence ? Math.round(parseFloat(row.build_sequence)) : null,
        set_sequence: row.set_sequence ? Math.round(parseFloat(row.set_sequence)) : null,
        difficulty_tags: row.difficulty_tags || [],
        notes: row.notes || row.Notes || '',
      };
      
      const existing = existingBySerial.get(moduleData.serial_number);
      
      if (existing) {
        if (options.overwrite) {
          toUpdate.push({ id: existing.id, updates: moduleData });
        }
      } else {
        toCreate.push(moduleData);
      }
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }
  
  // Create new modules
  if (toCreate.length > 0) {
    await createModulesBatch(toCreate);
    results.created = toCreate.length;
  }
  
  // Update existing modules
  if (toUpdate.length > 0) {
    await updateModulesBatch(toUpdate);
    results.updated = toUpdate.length;
  }
  
  return results;
}

/**
 * Export modules to a format suitable for download
 * @param {string} projectId - The project UUID
 * @param {string} format - 'csv', 'json', or 'xlsx'
 * @returns {Promise<{data: any, filename: string, mimeType: string}>}
 */
async function exportModules(projectId, format = 'csv') {
  const modules = await fetchProjectModules(projectId);
  
  // Get project name for filename
  const supabase = getSupabase();
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();
  
  const projectName = project?.name || 'modules';
  const timestamp = new Date().toISOString().split('T')[0];
  
  if (format === 'json') {
    return {
      data: JSON.stringify(modules, null, 2),
      filename: `${projectName}_modules_${timestamp}.json`,
      mimeType: 'application/json',
    };
  }
  
  // CSV format
  const headers = [
    'Serial #',
    'BLM',
    'Unit Type',
    'Building',
    'Level',
    'Build Seq',
    'Set Seq',
    'Difficulty Tags',
    'Notes',
  ];
  
  const rows = modules.map(m => [
    m.serial_number || '',
    m.blm_id || '',
    m.unit_type || '',
    m.building || '',
    m.level || '',
    m.build_sequence || '',
    m.set_sequence || '',
    (m.difficulty_tags || []).join(';'),
    m.notes || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return {
    data: csvContent,
    filename: `${projectName}_modules_${timestamp}.csv`,
    mimeType: 'text/csv',
  };
}

/**
 * Get module statistics for a project
 * @param {string} projectId - The project UUID
 * @returns {Promise<Object>} Statistics object
 */
async function getModuleStats(projectId) {
  const modules = await fetchProjectModules(projectId);
  
  const stats = {
    total: modules.length,
    withBuildSequence: modules.filter(m => m.build_sequence != null).length,
    withSetSequence: modules.filter(m => m.set_sequence != null).length,
    withTags: modules.filter(m => m.difficulty_tags?.length > 0).length,
    byBuilding: {},
    byLevel: {},
    byUnitType: {},
    tagCounts: {},
  };
  
  for (const module of modules) {
    // Count by building
    const building = module.building || 'Unknown';
    stats.byBuilding[building] = (stats.byBuilding[building] || 0) + 1;
    
    // Count by level
    const level = module.level || 'Unknown';
    stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;
    
    // Count by unit type
    const unitType = module.unit_type || 'Unassigned';
    stats.byUnitType[unitType] = (stats.byUnitType[unitType] || 0) + 1;
    
    // Count tags
    for (const tag of (module.difficulty_tags || [])) {
      stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
    }
  }
  
  return stats;
}

/**
 * Validate modules before saving
 * @param {Array} modules - Array of module objects
 * @returns {{valid: boolean, errors: Array<{moduleId: string, field: string, message: string}>}}
 */
function validateModules(modules) {
  const errors = [];
  const serialNumbers = new Set();
  const blmIds = new Set();
  
  for (const module of modules) {
    // Check for duplicate serial numbers
    if (module.serial_number) {
      if (serialNumbers.has(module.serial_number)) {
        errors.push({
          moduleId: module.id,
          field: 'serial_number',
          message: `Duplicate serial number: ${module.serial_number}`,
        });
      }
      serialNumbers.add(module.serial_number);
    }
    
    // Check for duplicate BLM IDs
    if (module.blm_id) {
      if (blmIds.has(module.blm_id)) {
        errors.push({
          moduleId: module.id,
          field: 'blm_id',
          message: `Duplicate BLM ID: ${module.blm_id}`,
        });
      }
      blmIds.add(module.blm_id);
      
      // Validate BLM format
      if (!/^B\d+L\d+M\d+$/i.test(module.blm_id)) {
        errors.push({
          moduleId: module.id,
          field: 'blm_id',
          message: `Invalid BLM format: ${module.blm_id}. Expected: B1L2M01`,
        });
      }
    }
    
    // Validate build sequence is integer
    if (module.build_sequence != null && !Number.isInteger(module.build_sequence)) {
      errors.push({
        moduleId: module.id,
        field: 'build_sequence',
        message: `Build sequence must be an integer: ${module.build_sequence}`,
      });
    }
    
    // Validate set sequence is integer
    if (module.set_sequence != null && !Number.isInteger(module.set_sequence)) {
      errors.push({
        moduleId: module.id,
        field: 'set_sequence',
        message: `Set sequence must be an integer: ${module.set_sequence}`,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Fix decimal build_sequence values in a project
 * Rounds all decimal sequences to integers
 * @param {string} projectId - The project UUID
 * @returns {Promise<{fixed: number, modules: Array}>}
 */
async function fixDecimalSequences(projectId) {
  const modules = await fetchProjectModules(projectId);
  
  const toFix = modules.filter(m => 
    (m.build_sequence != null && !Number.isInteger(m.build_sequence)) ||
    (m.set_sequence != null && !Number.isInteger(m.set_sequence))
  );
  
  if (toFix.length === 0) {
    return { fixed: 0, modules: [] };
  }
  
  const updates = toFix.map(m => ({
    id: m.id,
    updates: {
      build_sequence: m.build_sequence != null ? Math.round(m.build_sequence) : null,
      set_sequence: m.set_sequence != null ? Math.round(m.set_sequence) : null,
    },
  }));
  
  const updated = await updateModulesBatch(updates);
  
  return { fixed: toFix.length, modules: updated };
}

// Export all functions for use in components
window.SequenceBuilderAPI = {
  // Read operations
  fetchProjectModules,
  fetchModuleById,
  getModuleStats,
  exportModules,
  
  // Create operations
  createModule,
  createModulesBatch,
  generateModulesFromConfig,
  importModules,
  
  // Update operations
  updateModule,
  updateModulesBatch,
  updateBuildSequences,
  updateSetSequences,
  updateModuleTags,
  bulkUpdateModuleTags,
  reorderModule,
  autoGenerateSequences,
  
  // Delete operations
  deleteModule,
  deleteModulesBatch,
  
  // Validation & fixes
  validateModules,
  fixDecimalSequences,
};
