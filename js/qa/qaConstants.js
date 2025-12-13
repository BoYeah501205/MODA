// ============================================================================
// QA MODULE CONSTANTS - Based on Autovol QA Traveler (Version 240117)
// ============================================================================

// Production Stations (Automation through Station 40)
const PRODUCTION_STATIONS = [
    'Automation', 'Floor Mez', 'Ceiling Mez', 
    '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 
    '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', 
    '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', 
    '36', '37', '38', '39', '40'
];

// Conformance Status Options
const CONFORMANCE_STATUS = {
    PASS: { id: 'PASS', label: 'Pass', color: '#43A047', description: 'Meets specification requirements' },
    NC: { id: 'NC', label: 'NC', color: '#E53935', description: 'Non-Conformance - requires correction' },
    NA: { id: 'N/A', label: 'N/A', color: '#9E9E9E', description: 'Not applicable to this module' },
    PENDING: { id: 'PENDING', label: 'Pending', color: '#FB8C00', description: 'Awaiting inspection' }
};

// Critical Milestones from Traveler Coversheet
const MILESTONES = [
    { id: 'ready-to-insulate', name: 'Ready to Insulate/Drop', order: 1 },
    { id: 'ready-to-back-panel', name: 'Ready to Back Panel', order: 2 },
    { id: 'ready-to-deck', name: 'Ready to Deck', order: 3 },
    { id: 'buyback-complete', name: 'Buy Back Complete', order: 4, description: 'Final internal inspection' },
    { id: 'final-walk-complete', name: 'Final Walk Complete', order: 5, description: 'Client/architect walkthrough' }
];

// 13 Department Checklists from QA Traveler
const DEPARTMENTS = [
    {
        id: 'floor-framing',
        name: 'Floor Framing',
        number: 1,
        stations: ['Automation', 'Floor Mez', '2', '3', '4'],
        checklistItems: [
            { id: 'ff-1', description: 'Lumber - Moisture Check (less than 19%)', requiresValue: true, valueType: 'percentage', maxValue: 19 },
            { id: 'ff-2', description: 'Rim material and sizes match approved plans' },
            { id: 'ff-3', description: 'Joist/truss fastening to rims' },
            { id: 'ff-4', description: 'Kraft back insulation at exterior' },
            { id: 'ff-5', description: 'Joist spacing per plans' },
            { id: 'ff-6', description: 'Floor framing squareness check', requiresSquareTest: true },
            { id: 'ff-7', description: 'Floor sheathing securement' },
            { id: 'ff-8', description: 'Floor sheathing seams offset' },
            { id: 'ff-9', description: 'Seams, openings, penetrations sealed' },
            { id: 'ff-10', description: 'Floor covering installed' }
        ]
    },
    {
        id: 'plumbing-rough-floors',
        name: 'Plumbing Rough-In Floors',
        number: 2,
        stations: ['Floor Mez'],
        checklistItems: [
            { id: 'prf-1', description: 'Strapping & securement' },
            { id: 'prf-2', description: 'Acoustical isolators installed' },
            { id: 'prf-3', description: 'Hot & cold lines - correct supply routing' },
            { id: 'prf-4', description: 'Pipe insulation' },
            { id: 'prf-5', description: 'DWV size & slope per plans' },
            { id: 'prf-6', description: 'Penetrations fire caulked' },
            { id: 'prf-7', description: 'DWV test - 5 PSI 15 min', requiresTest: true, testType: 'DWV_PRESSURE', testParams: { pressure: 5, duration: 15, unit: 'PSI' } },
            { id: 'prf-8', description: 'Potable water test - 100 PSI 30 min', requiresTest: true, testType: 'WATER_PRESSURE', testParams: { pressure: 100, duration: 30, unit: 'PSI' } }
        ]
    },
    {
        id: 'roofs-ceilings',
        name: 'Roofs, Ceilings',
        number: 3,
        stations: ['Automation', 'Ceiling Mez', '3', '4', '5', '6', '7', '8', '9'],
        checklistItems: [
            { id: 'rc-1', description: 'Lumber - Moisture Check (less than 19%)', requiresValue: true, valueType: 'percentage', maxValue: 19 },
            { id: 'rc-2', description: 'Truss/rafter material and sizes match plans' },
            { id: 'rc-3', description: 'Truss/rafter fastening to top plates' },
            { id: 'rc-4', description: 'Blocking and bracing installed' },
            { id: 'rc-5', description: 'Ceiling framing squareness check', requiresSquareTest: true },
            { id: 'rc-6', description: 'Ceiling sheathing securement' },
            { id: 'rc-7', description: 'Ceiling sheathing seams offset' },
            { id: 'rc-8', description: 'Kraft back insulation at exterior' },
            { id: 'rc-9', description: 'Seams, openings, penetrations sealed' },
            { id: 'rc-10', description: 'Ceiling covering installed' },
            { id: 'rc-11', description: 'Roof assembly complete per plans' }
        ]
    },
    {
        id: 'walls',
        name: 'Walls',
        number: 4,
        stations: ['Automation', '4', '5', '6', '7'],
        checklistItems: [
            { id: 'w-1', description: 'Lumber - Moisture Check (less than 19%)', requiresValue: true, valueType: 'percentage', maxValue: 19 },
            { id: 'w-2', description: 'Structural fastened per schedule' },
            { id: 'w-3', description: 'Check critical dimensions per plans' },
            { id: 'w-4', description: 'Rough openings - doors/windows per plans' },
            { id: 'w-5', description: 'Wall framing squareness check' },
            { id: 'w-6', description: 'Wall backing installed' },
            { id: 'w-7', description: 'Strapping installed per print' },
            { id: 'w-8', description: 'Acoustical sealant applied' }
        ]
    },
    {
        id: 'electrical-rough',
        name: 'Electrical Rough-In',
        number: 5,
        stations: ['Automation', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        checklistItems: [
            { id: 'er-1', description: 'Wire securement & protection' },
            { id: 'er-2', description: 'Protection at wall plates' },
            { id: 'er-3', description: 'Penetrations fire caulked, puddy pads installed' },
            { id: 'er-4', description: 'Boxes flush with drywall' },
            { id: 'er-5', description: 'Main panels installed at correct height' },
            { id: 'er-6', description: 'Pull strings installed and operational' },
            { id: 'er-7', description: 'Crossover wiring labeled' },
            { id: 'er-8', description: 'Rough hi-pot test', requiresTest: true, testType: 'ELECTRICAL_HIPOT_ROUGH' }
        ]
    },
    {
        id: 'plumbing-rough-verts',
        name: 'Plumbing Rough-In - Verts/Chases',
        number: 6,
        stations: ['8', '9', '10', '11', '12'],
        checklistItems: [
            { id: 'prv-1', description: 'Vertical pipe routing per plans' },
            { id: 'prv-2', description: 'Chase framing complete' },
            { id: 'prv-3', description: 'Strapping & securement' },
            { id: 'prv-4', description: 'Connections secure' },
            { id: 'prv-5', description: 'Venting proper per code' },
            { id: 'prv-6', description: 'Pipe insulation installed' },
            { id: 'prv-7', description: 'Penetrations fire caulked' },
            { id: 'prv-8', description: 'DWV test - 5 PSI 15 min', requiresTest: true, testType: 'DWV_PRESSURE', testParams: { pressure: 5, duration: 15, unit: 'PSI' } },
            { id: 'prv-9', description: 'Access panels installed where required' }
        ]
    },
    {
        id: 'hvac-rough',
        name: 'HVAC Rough-In',
        number: 7,
        stations: ['8', '9', '10', '11', '12'],
        checklistItems: [
            { id: 'hvac-1', description: 'Strapping & securement' },
            { id: 'hvac-2', description: 'Duct grade/slope correct' },
            { id: 'hvac-3', description: 'Joints sealed' },
            { id: 'hvac-4', description: 'Penetrations fire caulked' }
        ],
        wallChecks: [
            { id: 'hvac-wc-h', description: 'End Wall Check "H"' },
            { id: 'hvac-wc-r-end', description: 'End Wall Check "R"' },
            { id: 'hvac-wc-r-side', description: 'Side Wall Check "R"' },
            { id: 'hvac-wc-c', description: 'Side Wall Check "C"' }
        ]
    },
    {
        id: 'exteriors',
        name: 'Exteriors',
        number: 8,
        stations: ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
        checklistItems: [
            { id: 'ext-1', description: 'Insulation installed per plans' },
            { id: 'ext-2', description: 'Draft stopping complete' },
            { id: 'ext-3', description: 'Densglass, OSB/Ply securement' },
            { id: 'ext-4', description: 'Rough openings - doors/windows' },
            { id: 'ext-5', description: 'Door/window weatherproofing' },
            { id: 'ext-6', description: 'Flashing installed per details' }
        ]
    },
    {
        id: 'roofs-ceilings-decking',
        name: 'Roofs, Ceilings - Decking',
        number: 9,
        stations: ['13', '14', '15', '16'],
        checklistItems: [
            { id: 'rcd-1', description: 'Roof decking securement' },
            { id: 'rcd-2', description: 'EPDM membrane installed' },
            { id: 'rcd-3', description: 'Roof vapor barrier (temp) installed' },
            { id: 'rcd-4', description: 'Cutouts marked per plans' },
            { id: 'rcd-5', description: 'Penetrations sealed' },
            { id: 'rcd-6', description: 'Drip edge installed' },
            { id: 'rcd-7', description: 'Roof complete per specifications' }
        ]
    },
    {
        id: 'pre-finish',
        name: 'Pre-Finish',
        number: 10,
        stations: ['18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'],
        checklistItems: [
            { id: 'pf-1', description: 'Cabinets installed and secured' },
            { id: 'pf-2', description: 'Base trim installed' },
            { id: 'pf-3', description: 'Interior hardware installed' },
            { id: 'pf-4', description: 'Paint & texture complete' },
            { id: 'pf-5', description: 'Door/window trim installed' },
            { id: 'pf-6', description: 'Transitions installed' },
            { id: 'pf-7', description: 'Door swing correct' },
            { id: 'pf-8', description: 'Door reveal uniform' }
        ]
    },
    {
        id: 'trim-departments',
        name: 'Trim Departments',
        number: 11,
        stations: ['20', '21', '22', '23', '24', '25'],
        subDepartments: [
            {
                id: 'plumbing-trim',
                name: 'Plumbing Trim',
                checklistItems: [
                    { id: 'pt-1', description: 'Fixtures installed' },
                    { id: 'pt-2', description: 'Final water supply leakage test - 100 PSI 30 min', requiresTest: true, testType: 'WATER_PRESSURE_FINAL', testParams: { pressure: 100, duration: 30, unit: 'PSI' } },
                    { id: 'pt-3', description: 'Fixture tightness test per QA Manual' }
                ]
            },
            {
                id: 'electrical-trim',
                name: 'Electrical Trim',
                checklistItems: [
                    { id: 'et-1', description: 'Dielectric hi-pot test', requiresTest: true, testType: 'ELECTRICAL_HIPOT_FINAL' },
                    { id: 'et-2', description: 'Low volt testing complete' },
                    { id: 'et-3', description: 'Receptacle test - correct wiring' },
                    { id: 'et-4', description: 'Single pole switch test' },
                    { id: 'et-5', description: 'Three way switch function' },
                    { id: 'et-6', description: 'Lights & fans function' },
                    { id: 'et-7', description: 'Smoke/CO detector function' }
                ]
            },
            {
                id: 'hvac-trim',
                name: 'HVAC Trim',
                checklistItems: [
                    { id: 'ht-1', description: 'Line set hitch connected' },
                    { id: 'ht-2', description: 'Line set rear connected' },
                    { id: 'ht-3', description: 'HVAC function test', requiresTest: true, testType: 'HVAC_FUNCTION' }
                ]
            }
        ]
    },
    {
        id: 'final-finish',
        name: 'Final Finish',
        number: 12,
        stations: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'],
        checklistItems: [
            { id: 'fnf-1', description: 'Caulking complete' },
            { id: 'fnf-2', description: 'Paint touch-up complete' },
            { id: 'fnf-3', description: 'Loose securement (toilet lids, globes, etc.)' },
            { id: 'fnf-4', description: 'Appliance securement; Serial ID#s recorded', requiresAppliances: true },
            { id: 'fnf-5', description: 'Door securement' },
            { id: 'fnf-6', description: 'Window protection installed' }
        ]
    },
    {
        id: 'ship-loose',
        name: 'Ship Loose',
        number: 13,
        stations: ['25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40'],
        checklistItems: [
            { id: 'sl-1', description: 'Inventory verification complete' },
            { id: 'sl-2', description: 'Items loaded & secured' },
            { id: 'sl-3', description: 'Pictures taken and documented' },
            { id: 'sl-4', description: 'Operation manuals included' }
        ]
    }
];

// Test Types
const TEST_TYPES = {
    DWV_PRESSURE: {
        id: 'DWV_PRESSURE',
        name: 'DWV Pressure Test',
        description: 'Drain/Waste/Vent pressure test',
        defaultParams: { pressure: 5, duration: 15, unit: 'PSI' },
        requiresWitness: true
    },
    WATER_PRESSURE: {
        id: 'WATER_PRESSURE',
        name: 'Potable Water Pressure Test',
        description: 'Water supply pressure test',
        defaultParams: { pressure: 100, duration: 30, unit: 'PSI' },
        requiresWitness: true
    },
    WATER_PRESSURE_FINAL: {
        id: 'WATER_PRESSURE_FINAL',
        name: 'Final Water Supply Leakage Test',
        description: 'Final water supply pressure test',
        defaultParams: { pressure: 100, duration: 30, unit: 'PSI' },
        requiresWitness: true
    },
    ELECTRICAL_HIPOT_ROUGH: {
        id: 'ELECTRICAL_HIPOT_ROUGH',
        name: 'Rough Hi-Pot Test',
        description: 'Electrical rough-in high potential test',
        requiresWitness: false
    },
    ELECTRICAL_HIPOT_FINAL: {
        id: 'ELECTRICAL_HIPOT_FINAL',
        name: 'Dielectric Hi-Pot Test',
        description: 'Final electrical high potential test',
        requiresWitness: true
    },
    HVAC_FUNCTION: {
        id: 'HVAC_FUNCTION',
        name: 'HVAC Function Test',
        description: 'HVAC system function verification',
        requiresWitness: false
    }
};

// Deviation Priorities
const DEVIATION_PRIORITIES = [
    { id: 'critical', name: 'Critical', color: '#D32F2F', description: 'Stops production - immediate action required' },
    { id: 'major', name: 'Major', color: '#FB8C00', description: 'Must fix before module advancement' },
    { id: 'minor', name: 'Minor', color: '#FDD835', description: 'Fix when possible' },
    { id: 'cosmetic', name: 'Cosmetic', color: '#4CAF50', description: 'Low priority - address during final finish' }
];

// Deviation Status
const DEVIATION_STATUS = {
    OPEN: { id: 'open', name: 'Open', color: '#E53935' },
    ASSIGNED: { id: 'assigned', name: 'Assigned to QC', color: '#FB8C00' },
    IN_PROGRESS: { id: 'in-progress', name: 'Correction In Progress', color: '#2196F3' },
    READY_FOR_REINSPECTION: { id: 'ready-reinspect', name: 'Ready for Re-Inspection', color: '#7B1FA2' },
    CLOSED: { id: 'closed', name: 'Closed', color: '#43A047' }
};

// Square Test Measurements
const SQUARE_TEST_FIELDS = {
    floor: {
        name: 'Floor Square Test',
        measurements: [
            { id: 'width1', label: 'Width 1', unit: 'ft' },
            { id: 'width2', label: 'Width 2', unit: 'ft' },
            { id: 'width3', label: 'Width 3', unit: 'ft' },
            { id: 'length1', label: 'Length 1', unit: 'ft' },
            { id: 'length2', label: 'Length 2', unit: 'ft' },
            { id: 'diag1', label: 'Diagonal 1', unit: 'ft' },
            { id: 'diag2', label: 'Diagonal 2', unit: 'ft' }
        ],
        toleranceCheck: (measurements) => {
            // Diagonals should be within 1/4" of each other
            const diagDiff = Math.abs((measurements.diag1 || 0) - (measurements.diag2 || 0));
            return diagDiff <= 0.021; // 1/4" in feet
        }
    },
    ceiling: {
        name: 'Ceiling/Roof Square Test',
        measurements: [
            { id: 'width1', label: 'Width 1', unit: 'ft' },
            { id: 'width2', label: 'Width 2', unit: 'ft' },
            { id: 'width3', label: 'Width 3', unit: 'ft' },
            { id: 'length1', label: 'Length 1', unit: 'ft' },
            { id: 'length2', label: 'Length 2', unit: 'ft' },
            { id: 'diag1', label: 'Diagonal 1', unit: 'ft' },
            { id: 'diag2', label: 'Diagonal 2', unit: 'ft' }
        ],
        toleranceCheck: (measurements) => {
            const diagDiff = Math.abs((measurements.diag1 || 0) - (measurements.diag2 || 0));
            return diagDiff <= 0.021;
        }
    }
};

// Export all for use in QA Module
window.QA_CONSTANTS = {
    PRODUCTION_STATIONS,
    CONFORMANCE_STATUS,
    MILESTONES,
    DEPARTMENTS,
    TEST_TYPES,
    DEVIATION_PRIORITIES,
    DEVIATION_STATUS,
    SQUARE_TEST_FIELDS
};
