// ============================================================================
// PROJECT DATA INITIALIZATION
// Sets up initial project data in localStorage
// ============================================================================

(function() {
    console.log('🏗️ Initializing project data...');
    
    // Check if projects already exist
    const existingProjects = localStorage.getItem('autovol_projects');
    if (existingProjects) {
        const projects = JSON.parse(existingProjects);
        console.log(`✅ Found ${projects.length} existing projects`);
        return; // Don't overwrite existing data
    }
    
    // Initial project data - Alvarado Creek
    const alvaradoCreek = {
        id: 'alvarado-creek-2024',
        name: 'Alvarado Creek',
        client: 'Alvarado Creek Development',
        location: 'California',
        status: 'Active',
        createdAt: '2024-01-15',
        updatedAt: '2024-11-29',
        description: 'Multi-family residential development with 25 modular units',
        modules: [
            {
                id: 'ac-001',
                serialNumber: '25-0001',
                buildSequence: 1,
                blmHitch: 'B1L1M01',
                blmRear: 'B1L1M01R',
                unit: '1A',
                width: '12',
                length: '60',
                sqft: '720',
                difficulties: {
                    sidewall: false,
                    stair: false,
                    hr3Wall: false,
                    short: false,
                    doubleStudio: false,
                    sawbox: false
                },
                stageProgress: {
                    'auto-fc': 100,
                    'auto-walls': 100,
                    'mezzanine': 85,
                    'elec-ceiling': 70,
                    'wall-set': 60,
                    'ceiling-set': 45,
                    'soffits': 30,
                    'mech-rough': 25,
                    'elec-rough': 20,
                    'plumb-rough': 15,
                    'exteriors': 10,
                    'drywall-bp': 5,
                    'drywall-ttp': 0,
                    'roofing': 0,
                    'pre-finish': 0,
                    'mech-trim': 0,
                    'elec-trim': 0,
                    'plumb-trim': 0,
                    'final-finish': 0,
                    'sign-off': 0,
                    'close-up': 0
                },
                status: 'in-progress',
                createdAt: '2024-01-15',
                updatedAt: '2024-11-29'
            },
            {
                id: 'ac-002',
                serialNumber: '25-0002',
                buildSequence: 2,
                blmHitch: 'B1L1M02',
                blmRear: 'B1L1M02R',
                unit: '1B',
                width: '12',
                length: '60',
                sqft: '720',
                difficulties: {
                    sidewall: true,
                    stair: false,
                    hr3Wall: false,
                    short: false,
                    doubleStudio: false,
                    sawbox: false
                },
                stageProgress: {
                    'auto-fc': 100,
                    'auto-walls': 100,
                    'mezzanine': 100,
                    'elec-ceiling': 100,
                    'wall-set': 90,
                    'ceiling-set': 80,
                    'soffits': 70,
                    'mech-rough': 60,
                    'elec-rough': 55,
                    'plumb-rough': 50,
                    'exteriors': 40,
                    'drywall-bp': 30,
                    'drywall-ttp': 20,
                    'roofing': 15,
                    'pre-finish': 10,
                    'mech-trim': 5,
                    'elec-trim': 0,
                    'plumb-trim': 0,
                    'final-finish': 0,
                    'sign-off': 0,
                    'close-up': 0
                },
                status: 'in-progress',
                createdAt: '2024-01-15',
                updatedAt: '2024-11-29'
            },
            {
                id: 'ac-003',
                serialNumber: '25-0003',
                buildSequence: 3,
                blmHitch: 'B1L2M01',
                blmRear: 'B1L2M01R',
                unit: '2A',
                width: '14',
                length: '60',
                sqft: '840',
                difficulties: {
                    sidewall: false,
                    stair: true,
                    hr3Wall: false,
                    short: false,
                    doubleStudio: false,
                    sawbox: false
                },
                stageProgress: {
                    'auto-fc': 100,
                    'auto-walls': 100,
                    'mezzanine': 100,
                    'elec-ceiling': 100,
                    'wall-set': 100,
                    'ceiling-set': 100,
                    'soffits': 100,
                    'mech-rough': 100,
                    'elec-rough': 100,
                    'plumb-rough': 100,
                    'exteriors': 100,
                    'drywall-bp': 100,
                    'drywall-ttp': 100,
                    'roofing': 100,
                    'pre-finish': 100,
                    'mech-trim': 100,
                    'elec-trim': 100,
                    'plumb-trim': 100,
                    'final-finish': 100,
                    'sign-off': 100,
                    'close-up': 100
                },
                status: 'completed',
                createdAt: '2024-01-15',
                updatedAt: '2024-11-29'
            }
        ]
    };
    
    // Add more sample modules to make it realistic
    for (let i = 4; i <= 25; i++) {
        const buildingNum = Math.ceil(i / 4);
        const unitLetter = String.fromCharCode(65 + ((i - 1) % 4)); // A, B, C, D
        
        // Random progress for variety
        const baseProgress = Math.max(0, Math.min(100, (25 - i) * 4 + Math.random() * 20));
        
        const module = {
            id: `ac-${i.toString().padStart(3, '0')}`,
            serialNumber: `25-${i.toString().padStart(4, '0')}`,
            buildSequence: i,
            blmHitch: `B${buildingNum}L${Math.ceil((i-1)/2) % 2 + 1}M${((i-1) % 2) + 1}`,
            blmRear: `B${buildingNum}L${Math.ceil((i-1)/2) % 2 + 1}M${((i-1) % 2) + 1}R`,
            unit: `${buildingNum}${unitLetter}`,
            width: i % 3 === 0 ? '14' : '12',
            length: '60',
            sqft: i % 3 === 0 ? '840' : '720',
            difficulties: {
                sidewall: Math.random() > 0.7,
                stair: Math.random() > 0.8,
                hr3Wall: Math.random() > 0.9,
                short: Math.random() > 0.85,
                doubleStudio: Math.random() > 0.9,
                sawbox: Math.random() > 0.95
            },
            stageProgress: {
                'auto-fc': Math.min(100, baseProgress + 20),
                'auto-walls': Math.min(100, baseProgress + 15),
                'mezzanine': Math.min(100, baseProgress + 10),
                'elec-ceiling': Math.min(100, baseProgress + 5),
                'wall-set': Math.min(100, baseProgress),
                'ceiling-set': Math.max(0, baseProgress - 5),
                'soffits': Math.max(0, baseProgress - 10),
                'mech-rough': Math.max(0, baseProgress - 15),
                'elec-rough': Math.max(0, baseProgress - 20),
                'plumb-rough': Math.max(0, baseProgress - 25),
                'exteriors': Math.max(0, baseProgress - 30),
                'drywall-bp': Math.max(0, baseProgress - 35),
                'drywall-ttp': Math.max(0, baseProgress - 40),
                'roofing': Math.max(0, baseProgress - 45),
                'pre-finish': Math.max(0, baseProgress - 50),
                'mech-trim': Math.max(0, baseProgress - 55),
                'elec-trim': Math.max(0, baseProgress - 60),
                'plumb-trim': Math.max(0, baseProgress - 65),
                'final-finish': Math.max(0, baseProgress - 70),
                'sign-off': Math.max(0, baseProgress - 75),
                'close-up': Math.max(0, baseProgress - 80)
            },
            status: baseProgress >= 80 ? 'completed' : baseProgress >= 20 ? 'in-progress' : 'on-hold',
            createdAt: '2024-01-15',
            updatedAt: '2024-11-29'
        };
        
        alvaradoCreek.modules.push(module);
    }
    
    // Save to localStorage using optimized storage if available
    try {
        const projects = [alvaradoCreek];
        
        if (typeof MODA_STORAGE !== 'undefined') {
            MODA_STORAGE.set('autovol_projects', projects);
            console.log('✅ Project data saved using optimized storage');
        } else {
            localStorage.setItem('autovol_projects', JSON.stringify(projects));
            console.log('✅ Project data saved using localStorage');
        }
        
        console.log(`✅ Initialized Alvarado Creek project with ${alvaradoCreek.modules.length} modules`);
        
    } catch (error) {
        console.error('❌ Failed to save project data:', error);
    }
})();
