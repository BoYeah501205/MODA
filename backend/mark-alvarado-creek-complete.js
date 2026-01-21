// Run this in browser console on MODA to mark all Alvarado Creek modules as 100% complete
// Copy and paste this entire script into the browser console (F12 -> Console)

(async function markAlvaradoCreekComplete() {
    const ALL_STAGES = [
        'auto-c', 'auto-f', 'auto-walls', 'mezzanine', 'elec-ceiling',
        'wall-set', 'ceiling-set', 'soffits', 'mech-rough', 'elec-rough',
        'plumb-rough', 'exteriors', 'drywall-bp', 'drywall-ttp', 'roofing',
        'pre-finish', 'mech-trim', 'elec-trim', 'plumb-trim', 'final-finish',
        'sign-off', 'close-up'
    ];
    
    // Create 100% progress object
    const fullProgress = {};
    ALL_STAGES.forEach(stage => fullProgress[stage] = 100);
    
    console.log('Looking for Alvarado Creek project...');
    
    // Get Supabase client (stored in window.MODA_SUPABASE.client)
    const client = window.MODA_SUPABASE?.client;
    if (!client) {
        console.error('Supabase client not available. Check window.MODA_SUPABASE.client');
        return;
    }
    
    // Find Alvarado Creek project
    const { data: projects, error: fetchError } = await client
        .from('projects')
        .select('*')
        .ilike('name', '%Alvarado Creek%');
    
    if (fetchError) {
        console.error('Error fetching project:', fetchError);
        return;
    }
    
    if (!projects || projects.length === 0) {
        console.error('Alvarado Creek project not found');
        return;
    }
    
    const project = projects[0];
    console.log(`Found project: ${project.name} with ${project.modules?.length || 0} modules`);
    
    // Update all modules with 100% progress
    const updatedModules = (project.modules || []).map(module => ({
        ...module,
        stageProgress: fullProgress
    }));
    
    console.log(`Updating ${updatedModules.length} modules to 100% complete...`);
    
    // Save back to Supabase
    const { error: updateError } = await client
        .from('projects')
        .update({ modules: updatedModules })
        .eq('id', project.id);
    
    if (updateError) {
        console.error('Error updating project:', updateError);
        return;
    }
    
    console.log('✅ Successfully marked all Alvarado Creek modules as 100% complete!');
    console.log('Refresh the page to see the changes.');
})();
