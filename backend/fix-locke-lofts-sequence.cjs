/**
 * Fix Locke Lofts Build Sequence
 * 
 * Updates buildSequence for modules stored in projects.modules JSONB array.
 * Only modifies buildSequence - no other fields.
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// CSV data: Serial -> Build Sequence mapping
const buildSequenceMap = {
    '25-0953': 1,
    '25-0954': 2,
    '25-0955': 3,
    '25-0956': 4,
    '25-0962': 5,
    '25-0963': 6,
    '25-0964': 7,
    '25-0967': 8,
    '25-0968': 9,
    '25-0969': 10,
    '25-0970': 11,
    '25-0971': 12,
    '25-0972': 13,
    '25-0973': 14,
    '25-0974': 15,
    '25-0975': 16,
    '25-0976': 17,
    '25-0977': 18,
    '25-0978': 19,
    '25-0979': 20,
    '25-0980': 21,
    '26-0001': 22,
    '26-0002': 23,
    '26-0003': 24,
    '26-0004': 25,
    '26-0005': 26,
    '26-0006': 27,
    '26-0007': 28,
    '26-0008': 29,
    '26-0009': 30,
    '26-0010': 31,
    '26-0011': 32,
    '26-0012': 33,
    '26-0013': 34,
    '26-0014': 35,
    '25-0965': 36,
    '25-0966': 37,
    '26-0015': 38,
    '26-0016': 39,
    '26-0017': 40,
    '26-0018': 41,
    '26-0019': 42,
    '26-0020': 43,
    '26-0021': 44,
    '26-0022': 45,
    '26-0023': 46,
    '26-0024': 47,
    '26-0025': 48,
    '26-0026': 49,
    '26-0027': 50,
    '26-0028': 51,
    '26-0029': 52,
    '26-0030': 53,
    '26-0031': 54,
    '26-0032': 55,
    '26-0033': 56,
    '26-0034': 57,
    '26-0035': 58,
    '26-0036': 59,
    '26-0037': 60,
    '26-0038': 61,
    '26-0039': 62,
    '26-0040': 63,
    '26-0041': 64,
    '26-0042': 65,
    '26-0043': 66,
    '26-0044': 67,
    '26-0045': 68,
    '26-0046': 69,
    '26-0047': 70,
    '26-0048': 71,
    '26-0049': 72,
    '26-0050': 73,
    '26-0051': 74,
    '26-0052': 75,
    '26-0053': 76,
    '26-0054': 77,
    '26-0055': 78,
    '26-0056': 79,
    '26-0057': 80,
    '26-0058': 81,
    '26-0059': 82,
    '26-0060': 83,
    '26-0061': 84,
    '26-0062': 85,
    '26-0063': 86,
    '26-0064': 87,
    '26-0065': 88,
    '26-0066': 89,
    '26-0067': 90,
    '26-0068': 91,
    '26-0069': 92,
    '26-0070': 93,
    '26-0071': 94,
    '26-0072': 95,
    '26-0073': 96,
    '26-0074': 97,
    '26-0075': 98,
    '26-0076': 99,
    '26-0077': 100,
    '26-0078': 101,
    '26-0079': 102,
    '26-0080': 103,
    '26-0081': 104,
    '26-0082': 105,
    '26-0083': 106,
    '26-0084': 107,
    '26-0085': 108,
    '26-0086': 109,
    '26-0087': 110,
    '26-0088': 111,
    '26-0089': 112,
    '26-0090': 113,
    '26-0091': 114,
    '26-0092': 115,
    '26-0093': 116,
    '26-0094': 117,
    '26-0095': 118,
    '26-0096': 119,
    '26-0097': 120,
    '26-0098': 121,
    '26-0099': 122,
    '26-0100': 123
};

async function fixBuildSequences() {
    console.log('Starting Locke Lofts build sequence fix...\n');
    
    // Step 1: Find Locke Lofts project with modules
    console.log('Step 1: Finding Locke Lofts project...');
    const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id, name, modules')
        .ilike('name', '%Locke Lofts%');
    
    if (projectError) {
        console.error('Error finding project:', projectError);
        return;
    }
    
    if (!projects || projects.length === 0) {
        console.error('Locke Lofts project not found!');
        return;
    }
    
    const project = projects[0];
    const modules = project.modules || [];
    console.log(`Found project: "${project.name}" (ID: ${project.id})`);
    console.log(`Modules in JSONB array: ${modules.length}\n`);
    
    // Step 2: Update build sequences in the modules array
    console.log('Step 2: Updating build sequences...');
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    
    const updatedModules = modules.map(module => {
        const serial = module.serialNumber;
        const newSequence = buildSequenceMap[serial];
        
        if (newSequence === undefined) {
            console.log(`  [SKIP] Serial ${serial} not in CSV mapping`);
            notFound++;
            return module; // Return unchanged
        }
        
        if (module.buildSequence === newSequence) {
            console.log(`  [OK] Serial ${serial} already has correct sequence ${newSequence}`);
            skipped++;
            return module; // Return unchanged
        }
        
        console.log(`  [UPDATE] Serial ${serial}: ${module.buildSequence || 'null'} -> ${newSequence}`);
        updated++;
        
        // Return module with only buildSequence changed
        return {
            ...module,
            buildSequence: newSequence
        };
    });
    
    // Step 3: Save updated modules back to project
    if (updated > 0) {
        console.log('\nStep 3: Saving updated modules to database...');
        const { error: updateError } = await supabase
            .from('projects')
            .update({ 
                modules: updatedModules,
                updated_at: new Date().toISOString()
            })
            .eq('id', project.id);
        
        if (updateError) {
            console.error('Error saving updates:', updateError);
            return;
        }
        console.log('Successfully saved to database!');
    } else {
        console.log('\nNo updates needed - all sequences already correct.');
    }
    
    // Summary
    console.log('\n========== SUMMARY ==========');
    console.log(`Total modules: ${modules.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Already correct: ${skipped}`);
    console.log(`Not in CSV: ${notFound}`);
    
    console.log('\nDone!');
}

// Run the fix
fixBuildSequences().catch(console.error);
