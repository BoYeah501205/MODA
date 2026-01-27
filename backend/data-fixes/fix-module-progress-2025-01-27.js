/**
 * Data Fix Script: Reset Module Progress for Modules After 26-0037
 * 
 * Date: 2025-01-27
 * Issue: Modules 26-0038, 26-0039, 26-0040+ were incorrectly marked as complete
 *        at stations MECH-T, ELEC-T, PLMB-T, FINAL, SIGN-OFF, CLOSE
 * 
 * Run this in the browser console while logged into MODA.
 * 
 * Usage:
 *   1. Open MODA in browser and log in
 *   2. Open browser console (F12 -> Console)
 *   3. Copy and paste this entire script
 *   4. Press Enter to run
 */

(async function fixModuleProgress() {
    console.log('=== Module Progress Fix Script ===');
    console.log('Resetting progress for modules after 26-0037 at trim/final stations...');
    
    // Station IDs to reset
    const stationsToReset = [
        'mech-trim',    // MECH-T
        'elec-trim',    // ELEC-T
        'plumb-trim',   // PLMB-T
        'final-finish', // FINAL
        'sign-off',     // SIGN-OFF
        'close-up'      // CLOSE
    ];
    
    // Module serial number threshold (reset modules AFTER this one)
    const thresholdSerial = '26-0037';
    
    // Check Supabase availability
    if (!window.MODA_SUPABASE_DATA?.isAvailable?.() || !window.MODA_SUPABASE_DATA?.projects) {
        console.error('ERROR: Supabase not available. Make sure you are logged in.');
        return;
    }
    
    const supabase = window.MODA_SUPABASE_DATA;
    
    try {
        // Fetch all projects
        console.log('Fetching projects...');
        const projects = await supabase.projects.getAll();
        console.log(`Found ${projects.length} projects`);
        
        let totalModulesFixed = 0;
        let projectsUpdated = 0;
        
        for (const project of projects) {
            const modules = project.modules || [];
            let projectNeedsUpdate = false;
            
            const updatedModules = modules.map(module => {
                const serial = module.serialNumber || '';
                
                // Check if this module is after the threshold
                // Serial format: XX-XXXX (e.g., 26-0037)
                if (!serial.startsWith('26-')) return module;
                
                const serialNum = parseInt(serial.split('-')[1], 10);
                const thresholdNum = parseInt(thresholdSerial.split('-')[1], 10);
                
                if (serialNum <= thresholdNum) return module;
                
                // This module needs to be reset
                const stageProgress = { ...module.stageProgress };
                let moduleModified = false;
                
                stationsToReset.forEach(stationId => {
                    if (stageProgress[stationId] !== undefined && stageProgress[stationId] > 0) {
                        console.log(`  Resetting ${serial} at ${stationId}: ${stageProgress[stationId]}% -> 0%`);
                        stageProgress[stationId] = 0;
                        moduleModified = true;
                    }
                });
                
                if (moduleModified) {
                    totalModulesFixed++;
                    projectNeedsUpdate = true;
                    
                    // Also clear stationCompletedAt for these stations
                    const stationCompletedAt = { ...module.stationCompletedAt };
                    stationsToReset.forEach(stationId => {
                        delete stationCompletedAt[stationId];
                    });
                    
                    return { ...module, stageProgress, stationCompletedAt };
                }
                
                return module;
            });
            
            if (projectNeedsUpdate) {
                console.log(`Updating project: ${project.name}...`);
                await supabase.projects.update(project.id, { modules: updatedModules });
                projectsUpdated++;
            }
        }
        
        console.log('');
        console.log('=== Fix Complete ===');
        console.log(`Projects updated: ${projectsUpdated}`);
        console.log(`Modules fixed: ${totalModulesFixed}`);
        console.log('');
        console.log('Please refresh the page to see the changes.');
        
    } catch (err) {
        console.error('ERROR:', err);
    }
})();
