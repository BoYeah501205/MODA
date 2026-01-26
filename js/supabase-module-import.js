/**
 * Module Import Utilities for MODA
 * Handles CSV parsing and Supabase edge function calls for module imports
 */
(function() {
    'use strict';

    // Get Supabase client
    const getClient = () => window.MODA_SUPABASE?.client;

    async function analyzeModuleImport(projectId, modules) {
        const client = getClient();
        if (!client) {
            throw new Error('Supabase client not available');
        }
        
        const { data, error } = await client.functions.invoke('import-modules', {
            body: {
                action: 'analyze',
                project_id: projectId,
                modules: modules
            }
        });

        if (error) {
            throw new Error(`Import analysis failed: ${error.message}`);
        }

        return data;
    }

    async function executeModuleImport(projectId, modules, forceOverwrite = false, sequenceOnlyMode = false) {
        const client = getClient();
        if (!client) {
            throw new Error('Supabase client not available');
        }
        
        const { data, error } = await client.functions.invoke('import-modules', {
            body: {
                action: 'execute',
                project_id: projectId,
                modules: modules,
                force_overwrite: forceOverwrite,
                sequence_only: sequenceOnlyMode
            }
        });

        if (error) {
            throw new Error(`Import execution failed: ${error.message}`);
        }

        return data;
    }

    function parseModuleCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        const headers = parseCSVLine(lines[0]);
        const modules = [];
        const errors = [];

        const headerMap = {
            'serial number': 'serial_number',
            'serial_number': 'serial_number',
            'serial': 'serial_number',
            'build sequence': 'build_sequence',
            'build_sequence': 'build_sequence',
            'sequence': 'build_sequence',
            'blm id': 'blm_id',
            'blm_id': 'blm_id',
            'blm': 'blm_id',
            'unit type': 'unit_type',
            'unit_type': 'unit_type',
            'type': 'unit_type',
            'hitch blm id': 'blm_id',
            'hitch unit': 'hitch_unit',
            'hitch_unit': 'hitch_unit',
            'rear unit': 'rear_unit',
            'rear_unit': 'rear_unit',
            'hitch room': 'hitch_room',
            'hitch_room': 'hitch_room',
            'rear room': 'rear_room',
            'rear_room': 'rear_room',
            'hitch room type': 'hitch_room_type',
            'hitch_room_type': 'hitch_room_type',
            'rear room type': 'rear_room_type',
            'rear_room_type': 'rear_room_type'
        };

        const normalizedHeaders = headers.map(h => {
            const normalized = h.toLowerCase().trim();
            return headerMap[normalized] || normalized;
        });

        const serialIndex = normalizedHeaders.findIndex(h => h === 'serial_number');
        if (serialIndex === -1) {
            throw new Error('CSV must contain a "Serial Number" column');
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                const values = parseCSVLine(line);
                const module = {};

                normalizedHeaders.forEach((header, index) => {
                    const value = values[index]?.trim();
                    if (value && value !== '') {
                        if (header === 'build_sequence') {
                            module[header] = parseInt(value) || 0;
                        } else {
                            module[header] = value;
                        }
                    }
                });

                if (module.serial_number) {
                    modules.push(module);
                } else {
                    errors.push({
                        row: i + 1,
                        error: 'Missing serial number'
                    });
                }
            } catch (err) {
                errors.push({
                    row: i + 1,
                    error: err.message
                });
            }
        }

        return { modules, errors };
    }

    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values.map(v => v.trim());
    }

    // Export to window
    window.MODA_MODULE_IMPORT = {
        analyzeModuleImport,
        executeModuleImport,
        parseModuleCSV
    };

    if (window.MODA_DEBUG) console.log('[ModuleImport] Module import utilities initialized');
})();
