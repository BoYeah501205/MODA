/**
 * Supabase Heat Map Data Access Layer
 * Handles CRUD operations for difficulty indicators, project heat maps, and module assignments
 */

(function() {
    'use strict';
    
    // Get supabase client from window global
    const getSupabase = () => window.MODA_SUPABASE?.client;

    // ============================================
    // DIFFICULTY INDICATORS
    // ============================================

    async function getDifficultyIndicators() {
        const supabase = getSupabase();
        console.log('[HeatMapAPI] getDifficultyIndicators called, supabase:', !!supabase);
        if (!supabase) {
            console.error('[HeatMapAPI] Supabase client not available');
            return [];
        }
        const { data, error } = await supabase
            .from('difficulty_indicators')
            .select('*')
            .order('display_order', { ascending: true });
        
        console.log('[HeatMapAPI] getDifficultyIndicators result:', { data, error });
        if (error) {
            console.error('[HeatMapAPI] Error fetching difficulty indicators:', error);
            return [];
        }
        return data || [];
    }

    // ============================================
    // PROJECT HEAT MAPS
    // ============================================

    async function getProjectHeatMap(projectId) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return [];
        }
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

    async function initializeProjectHeatMap(projectId) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return false;
        }
        const { error } = await supabase.rpc('initialize_project_heat_map', {
            p_project_id: projectId
        });
        
        if (error) {
            console.error('Error initializing project heat map:', error);
            return false;
        }
        return true;
    }

    async function updateHeatMapEntry(projectId, indicatorId, stationId, difficultyCategory, notes) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return false;
        }
        const { error } = await supabase
            .from('project_heat_maps')
            .upsert({
                project_id: projectId,
                difficulty_indicator_id: indicatorId,
                station_id: stationId,
                difficulty_category: difficultyCategory,
                notes: notes || null,
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

    async function bulkUpdateHeatMap(projectId, entries) {
        const supabase = getSupabase();
        console.log('[HeatMapAPI] bulkUpdateHeatMap called:', { projectId, entries });
        if (!supabase) {
            console.error('[HeatMapAPI] Supabase client not available');
            return false;
        }
        
        // Use upsert with ignoreDuplicates false to update existing or insert new
        const upsertData = entries.map(entry => ({
            project_id: projectId,
            difficulty_indicator_id: entry.indicatorId,
            station_id: entry.stationId,
            difficulty_category: entry.difficultyCategory,
            notes: entry.notes || null,
            updated_at: new Date().toISOString()
        }));
        
        console.log('[HeatMapAPI] Upserting data:', upsertData);
        
        // Try upsert first
        const { data, error } = await supabase
            .from('project_heat_maps')
            .upsert(upsertData, {
                onConflict: 'project_id,difficulty_indicator_id,station_id',
                ignoreDuplicates: false
            })
            .select();
        
        console.log('[HeatMapAPI] Upsert result:', { data, error });
        
        if (error) {
            console.error('[HeatMapAPI] Upsert error:', error);
            
            // If upsert fails, try individual updates
            console.log('[HeatMapAPI] Falling back to individual updates...');
            let allSuccess = true;
            
            for (const entry of entries) {
                const { error: updateError } = await supabase
                    .from('project_heat_maps')
                    .update({
                        difficulty_category: entry.difficultyCategory,
                        updated_at: new Date().toISOString()
                    })
                    .eq('project_id', projectId)
                    .eq('difficulty_indicator_id', entry.indicatorId)
                    .eq('station_id', entry.stationId);
                
                if (updateError) {
                    console.error('[HeatMapAPI] Individual update error:', updateError);
                    allSuccess = false;
                }
            }
            
            return allSuccess;
        }
        
        return true;
    }

    // ============================================
    // MODULE DIFFICULTY ASSIGNMENTS
    // ============================================

    async function getModuleDifficultyAssignments(projectId) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return [];
        }
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

    async function getModuleDifficulties(projectId, moduleId) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return [];
        }
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

    async function assignModuleDifficulty(projectId, moduleId, indicatorId) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return false;
        }
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

    async function removeModuleDifficulty(projectId, moduleId, indicatorId) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return false;
        }
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

    async function setModuleDifficulties(projectId, moduleId, indicatorIds) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('Supabase client not available');
            return false;
        }
        
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

    const DIFFICULTY_MULTIPLIERS = {
        easy: 0.8,
        average: 1.0,
        medium: 1.2,
        hard: 1.4,
        very_hard: 1.6
    };

    function calculateModuleStationDifficulty(moduleIndicators, heatMapEntries, stationId) {
        if (!moduleIndicators || moduleIndicators.length === 0) {
            return 1.0;
        }
        
        let maxMultiplier = 1.0;
        
        for (const indicator of moduleIndicators) {
            const indicatorId = indicator.difficulty_indicator_id || indicator.id;
            
            const entry = heatMapEntries.find(e => 
                e.difficulty_indicator_id === indicatorId && 
                e.station_id === stationId
            );
            
            if (entry) {
                const multiplier = DIFFICULTY_MULTIPLIERS[entry.difficulty_category] || 1.0;
                maxMultiplier = Math.max(maxMultiplier, multiplier);
            }
        }
        
        return maxMultiplier;
    }

    function getModuleDifficultySummary(moduleIndicators, heatMapEntries, stationIds) {
        const summary = {};
        
        for (const stationId of stationIds) {
            const multiplier = calculateModuleStationDifficulty(moduleIndicators, heatMapEntries, stationId);
            
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

    // ============================================
    // EXPORT TO WINDOW
    // ============================================
    
    window.HeatMapAPI = {
        getDifficultyIndicators,
        getProjectHeatMap,
        initializeProjectHeatMap,
        updateHeatMapEntry,
        bulkUpdateHeatMap,
        getModuleDifficultyAssignments,
        getModuleDifficulties,
        assignModuleDifficulty,
        removeModuleDifficulty,
        setModuleDifficulties,
        DIFFICULTY_MULTIPLIERS,
        calculateModuleStationDifficulty,
        getModuleDifficultySummary
    };
    
    console.log('HeatMapAPI loaded');

})();
