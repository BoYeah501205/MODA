/**
 * Supabase Heat Map Data Access Layer
 * Handles CRUD operations for difficulty indicators, project heat maps, and module assignments
 */

import { supabase, supabaseFetch } from './supabase-client.js';

// ============================================
// DIFFICULTY INDICATORS
// ============================================

/**
 * Get all difficulty indicators
 * @returns {Promise<Array>} List of difficulty indicators
 */
export async function getDifficultyIndicators() {
    const { data, error } = await supabase
        .from('difficulty_indicators')
        .select('*')
        .order('display_order', { ascending: true });
    
    if (error) {
        console.error('Error fetching difficulty indicators:', error);
        return [];
    }
    return data || [];
}

// ============================================
// PROJECT HEAT MAPS
// ============================================

/**
 * Get heat map for a specific project
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} Heat map entries for the project
 */
export async function getProjectHeatMap(projectId) {
    const { data, error } = await supabase
        .from('project_heat_maps')
        .select(`
            *,
            difficulty_indicators (
                id,
                name,
                is_easier,
                affects_all_stations
            )
        `)
        .eq('project_id', projectId);
    
    if (error) {
        console.error('Error fetching project heat map:', error);
        return [];
    }
    return data || [];
}

/**
 * Initialize heat map for a project with default values
 * Calls the Supabase function that populates default mappings
 * @param {string} projectId - The project ID
 * @returns {Promise<boolean>} Success status
 */
export async function initializeProjectHeatMap(projectId) {
    const { error } = await supabase.rpc('initialize_project_heat_map', {
        p_project_id: projectId
    });
    
    if (error) {
        console.error('Error initializing project heat map:', error);
        return false;
    }
    return true;
}

/**
 * Update a single heat map entry
 * @param {string} projectId - The project ID
 * @param {string} indicatorId - The difficulty indicator ID
 * @param {string} stationId - The station ID
 * @param {string} difficultyCategory - One of: easy, average, medium, hard, very_hard
 * @param {string} notes - Optional notes
 * @returns {Promise<boolean>} Success status
 */
export async function updateHeatMapEntry(projectId, indicatorId, stationId, difficultyCategory, notes = null) {
    const { error } = await supabase
        .from('project_heat_maps')
        .upsert({
            project_id: projectId,
            difficulty_indicator_id: indicatorId,
            station_id: stationId,
            difficulty_category: difficultyCategory,
            notes: notes,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'project_id,difficulty_indicator_id,station_id'
        });
    
    if (error) {
        console.error('Error updating heat map entry:', error);
        return false;
    }
    return true;
}

/**
 * Bulk update heat map entries for a project
 * @param {string} projectId - The project ID
 * @param {Array} entries - Array of { indicatorId, stationId, difficultyCategory, notes }
 * @returns {Promise<boolean>} Success status
 */
export async function bulkUpdateHeatMap(projectId, entries) {
    const upsertData = entries.map(entry => ({
        project_id: projectId,
        difficulty_indicator_id: entry.indicatorId,
        station_id: entry.stationId,
        difficulty_category: entry.difficultyCategory,
        notes: entry.notes || null,
        updated_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
        .from('project_heat_maps')
        .upsert(upsertData, {
            onConflict: 'project_id,difficulty_indicator_id,station_id'
        });
    
    if (error) {
        console.error('Error bulk updating heat map:', error);
        return false;
    }
    return true;
}

// ============================================
// MODULE DIFFICULTY ASSIGNMENTS
// ============================================

/**
 * Get difficulty assignments for all modules in a project
 * @param {string} projectId - The project ID
 * @returns {Promise<Array>} Module difficulty assignments
 */
export async function getModuleDifficultyAssignments(projectId) {
    const { data, error } = await supabase
        .from('module_difficulty_assignments')
        .select(`
            *,
            difficulty_indicators (
                id,
                name,
                is_easier,
                affects_all_stations
            )
        `)
        .eq('project_id', projectId);
    
    if (error) {
        console.error('Error fetching module difficulty assignments:', error);
        return [];
    }
    return data || [];
}

/**
 * Get difficulty assignments for a specific module
 * @param {string} projectId - The project ID
 * @param {string} moduleId - The module ID
 * @returns {Promise<Array>} Difficulty indicators assigned to this module
 */
export async function getModuleDifficulties(projectId, moduleId) {
    const { data, error } = await supabase
        .from('module_difficulty_assignments')
        .select(`
            *,
            difficulty_indicators (
                id,
                name,
                is_easier,
                affects_all_stations
            )
        `)
        .eq('project_id', projectId)
        .eq('module_id', moduleId);
    
    if (error) {
        console.error('Error fetching module difficulties:', error);
        return [];
    }
    return data || [];
}

/**
 * Assign a difficulty indicator to a module
 * @param {string} projectId - The project ID
 * @param {string} moduleId - The module ID
 * @param {string} indicatorId - The difficulty indicator ID
 * @returns {Promise<boolean>} Success status
 */
export async function assignModuleDifficulty(projectId, moduleId, indicatorId) {
    const { error } = await supabase
        .from('module_difficulty_assignments')
        .upsert({
            project_id: projectId,
            module_id: moduleId,
            difficulty_indicator_id: indicatorId
        }, {
            onConflict: 'module_id,project_id,difficulty_indicator_id'
        });
    
    if (error) {
        console.error('Error assigning module difficulty:', error);
        return false;
    }
    return true;
}

/**
 * Remove a difficulty indicator from a module
 * @param {string} projectId - The project ID
 * @param {string} moduleId - The module ID
 * @param {string} indicatorId - The difficulty indicator ID
 * @returns {Promise<boolean>} Success status
 */
export async function removeModuleDifficulty(projectId, moduleId, indicatorId) {
    const { error } = await supabase
        .from('module_difficulty_assignments')
        .delete()
        .eq('project_id', projectId)
        .eq('module_id', moduleId)
        .eq('difficulty_indicator_id', indicatorId);
    
    if (error) {
        console.error('Error removing module difficulty:', error);
        return false;
    }
    return true;
}

/**
 * Set all difficulty indicators for a module (replaces existing)
 * @param {string} projectId - The project ID
 * @param {string} moduleId - The module ID
 * @param {Array<string>} indicatorIds - Array of difficulty indicator IDs
 * @returns {Promise<boolean>} Success status
 */
export async function setModuleDifficulties(projectId, moduleId, indicatorIds) {
    // First, delete existing assignments
    const { error: deleteError } = await supabase
        .from('module_difficulty_assignments')
        .delete()
        .eq('project_id', projectId)
        .eq('module_id', moduleId);
    
    if (deleteError) {
        console.error('Error clearing module difficulties:', deleteError);
        return false;
    }
    
    // If no new indicators, we're done
    if (!indicatorIds || indicatorIds.length === 0) {
        return true;
    }
    
    // Insert new assignments
    const insertData = indicatorIds.map(indicatorId => ({
        project_id: projectId,
        module_id: moduleId,
        difficulty_indicator_id: indicatorId
    }));
    
    const { error: insertError } = await supabase
        .from('module_difficulty_assignments')
        .insert(insertData);
    
    if (insertError) {
        console.error('Error setting module difficulties:', insertError);
        return false;
    }
    return true;
}

// ============================================
// LABOR CALCULATION HELPERS
// ============================================

/**
 * Difficulty category multipliers for labor calculations
 * These convert categories to numeric multipliers
 */
export const DIFFICULTY_MULTIPLIERS = {
    easy: 0.8,
    average: 1.0,
    medium: 1.2,
    hard: 1.4,
    very_hard: 1.6
};

/**
 * Calculate effective difficulty multiplier for a module at a station
 * Takes into account all assigned difficulty indicators
 * @param {Array} moduleIndicators - Difficulty indicators assigned to the module
 * @param {Array} heatMapEntries - Heat map entries for the project
 * @param {string} stationId - The station ID
 * @returns {number} Combined difficulty multiplier
 */
export function calculateModuleStationDifficulty(moduleIndicators, heatMapEntries, stationId) {
    if (!moduleIndicators || moduleIndicators.length === 0) {
        return 1.0; // No indicators = average difficulty
    }
    
    let maxMultiplier = 1.0;
    
    for (const indicator of moduleIndicators) {
        const indicatorId = indicator.difficulty_indicator_id || indicator.id;
        
        // Find the heat map entry for this indicator/station combo
        const entry = heatMapEntries.find(e => 
            e.difficulty_indicator_id === indicatorId && 
            e.station_id === stationId
        );
        
        if (entry) {
            const multiplier = DIFFICULTY_MULTIPLIERS[entry.difficulty_category] || 1.0;
            // Use the highest multiplier (most difficult indicator wins)
            maxMultiplier = Math.max(maxMultiplier, multiplier);
        }
    }
    
    return maxMultiplier;
}

/**
 * Get a summary of difficulty for a module across all stations
 * @param {Array} moduleIndicators - Difficulty indicators assigned to the module
 * @param {Array} heatMapEntries - Heat map entries for the project
 * @param {Array} stationIds - Array of station IDs to check
 * @returns {Object} Map of stationId -> { category, multiplier }
 */
export function getModuleDifficultySummary(moduleIndicators, heatMapEntries, stationIds) {
    const summary = {};
    
    for (const stationId of stationIds) {
        const multiplier = calculateModuleStationDifficulty(moduleIndicators, heatMapEntries, stationId);
        
        // Convert multiplier back to category for display
        let category = 'average';
        if (multiplier <= 0.8) category = 'easy';
        else if (multiplier <= 1.0) category = 'average';
        else if (multiplier <= 1.2) category = 'medium';
        else if (multiplier <= 1.4) category = 'hard';
        else category = 'very_hard';
        
        summary[stationId] = { category, multiplier };
    }
    
    return summary;
}
