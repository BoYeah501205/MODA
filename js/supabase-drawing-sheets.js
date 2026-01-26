/**
 * MODA - Drawing Sheets Module
 * 
 * Data access layer for individual drawing sheets extracted from multi-page PDFs.
 * Supports OCR metadata, advanced filtering, and module linking.
 * 
 * Features:
 * - Split multi-page PDFs into individual sheets
 * - Extract title block metadata via OCR
 * - Filter sheets by module, unit type, discipline, BLM type
 * - Auto-link sheets to modules
 * - Download/view individual sheets
 */

(function() {
    'use strict';

    // ============================================================================
    // DEPENDENCIES
    // ============================================================================
    const getClient = () => window.MODA_SUPABASE?.client;
    const isAvailable = () => !!getClient();

    // ============================================================================
    // CONSTANTS
    // ============================================================================
    const STORAGE_BUCKET = 'drawings';
    const EDGE_FUNCTION_URL = 'https://syreuphexagezawjyjgt.supabase.co/functions/v1/process-drawing-sheets';

    // Discipline mapping
    const DISCIPLINES = {
        MECHANICAL: 'Mechanical',
        ELECTRICAL: 'Electrical',
        PLUMBING: 'Plumbing',
        STRUCTURAL: 'Structural',
        ARCHITECTURAL: 'Architectural',
        FIRE_PROTECTION: 'Fire Protection'
    };

    // ============================================================================
    // SHEET EXTRACTION & OCR
    // ============================================================================

    /**
     * Process a drawing file to extract individual sheets and perform OCR
     * @param {string} drawingFileId - Drawing file UUID
     * @returns {Promise<Object>} Job result with sheets array
     */
    async function processDrawingSheets(drawingFileId) {
        if (!isAvailable()) throw new Error('Supabase not available');
        if (!drawingFileId) throw new Error('drawingFileId is required');

        console.log(`[DrawingSheets] Processing drawing file: ${drawingFileId}`);

        try {
            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getClient().supabaseKey}`,
                },
                body: JSON.stringify({
                    drawingFileId,
                    action: 'split_and_ocr'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process drawing sheets');
            }

            const result = await response.json();
            console.log(`[DrawingSheets] Processed ${result.processed_sheets} sheets`);
            return result;
        } catch (error) {
            console.error('[DrawingSheets] Error processing sheets:', error);
            throw error;
        }
    }

    /**
     * Get extraction job status
     * @param {string} jobId - Job UUID
     * @returns {Promise<Object>} Job status
     */
    async function getExtractionJobStatus(jobId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('sheet_extraction_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get all extraction jobs for a drawing file
     * @param {string} drawingFileId - Drawing file UUID
     * @returns {Promise<Array>} Array of jobs
     */
    async function getExtractionJobs(drawingFileId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('sheet_extraction_jobs')
            .select('*')
            .eq('drawing_file_id', drawingFileId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // ============================================================================
    // SHEET QUERIES
    // ============================================================================

    /**
     * Get all sheets for a drawing file
     * @param {string} drawingFileId - Drawing file UUID
     * @returns {Promise<Array>} Array of sheets
     */
    async function getSheetsByDrawingFile(drawingFileId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('drawing_sheets')
            .select(`
                *,
                drawing_files(id, name, category, discipline),
                modules(id, module_id, unit_type)
            `)
            .eq('drawing_file_id', drawingFileId)
            .order('sheet_number', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get a single sheet by ID
     * @param {string} sheetId - Sheet UUID
     * @returns {Promise<Object>} Sheet data
     */
    async function getSheet(sheetId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('drawing_sheets')
            .select(`
                *,
                drawing_files(id, name, category, discipline),
                modules(id, module_id, unit_type)
            `)
            .eq('id', sheetId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Advanced sheet search with multiple filters
     * @param {Object} filters - Search filters
     * @param {string} filters.projectId - Project UUID (required)
     * @param {string} [filters.moduleId] - Module UUID
     * @param {string} [filters.unitType] - Unit type code (e.g., 'C1', 'B2')
     * @param {string} [filters.discipline] - Discipline name
     * @param {string} [filters.blmType] - BLM type code
     * @param {string} [filters.searchText] - Text search in title/name
     * @param {number} [filters.limit=100] - Result limit
     * @returns {Promise<Array>} Array of matching sheets
     */
    async function searchSheets(filters) {
        if (!isAvailable()) throw new Error('Supabase not available');
        if (!filters.projectId) throw new Error('projectId is required');

        console.log('[DrawingSheets] Searching sheets with filters:', filters);

        const { data, error } = await getClient()
            .rpc('search_drawing_sheets', {
                p_project_id: filters.projectId,
                p_module_id: filters.moduleId || null,
                p_unit_type: filters.unitType || null,
                p_discipline: filters.discipline || null,
                p_blm_type: filters.blmType || null,
                p_search_text: filters.searchText || null,
                p_limit: filters.limit || 100
            });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get sheets by unit type and discipline
     * Example: Get all C1 Mechanical sheets
     * @param {string} projectId - Project UUID
     * @param {string} unitType - Unit type code (e.g., 'C1')
     * @param {string} discipline - Discipline name (e.g., 'Mechanical')
     * @returns {Promise<Array>} Array of matching sheets
     */
    async function getSheetsByUnitTypeAndDiscipline(projectId, unitType, discipline) {
        if (!isAvailable()) throw new Error('Supabase not available');
        if (!projectId || !unitType || !discipline) {
            throw new Error('projectId, unitType, and discipline are required');
        }

        console.log(`[DrawingSheets] Getting ${unitType} ${discipline} sheets for project ${projectId}`);

        const { data, error } = await getClient()
            .rpc('get_sheets_by_unit_type_and_discipline', {
                p_project_id: projectId,
                p_unit_type: unitType,
                p_discipline: discipline
            });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get all sheets for a specific module
     * @param {string} moduleId - Module UUID
     * @returns {Promise<Array>} Array of sheets
     */
    async function getSheetsByModule(moduleId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('drawing_sheets')
            .select(`
                *,
                drawing_files(id, name, category, discipline)
            `)
            .eq('linked_module_id', moduleId)
            .order('sheet_number', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // ============================================================================
    // SHEET OPERATIONS
    // ============================================================================

    /**
     * Update sheet metadata
     * @param {string} sheetId - Sheet UUID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated sheet
     */
    async function updateSheet(sheetId, updates) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('drawing_sheets')
            .update(updates)
            .eq('id', sheetId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Link a sheet to a module
     * @param {string} sheetId - Sheet UUID
     * @param {string} moduleId - Module UUID
     * @returns {Promise<Object>} Updated sheet
     */
    async function linkSheetToModule(sheetId, moduleId) {
        return updateSheet(sheetId, { linked_module_id: moduleId });
    }

    /**
     * Delete a sheet
     * @param {string} sheetId - Sheet UUID
     * @returns {Promise<void>}
     */
    async function deleteSheet(sheetId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        // Get sheet to find storage path
        const sheet = await getSheet(sheetId);
        
        // Delete from storage
        if (sheet.storage_path) {
            const { error: storageError } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .remove([sheet.storage_path]);
            
            if (storageError) {
                console.warn('[DrawingSheets] Failed to delete sheet file from storage:', storageError);
            }
        }

        // Delete from database
        const { error } = await getClient()
            .from('drawing_sheets')
            .delete()
            .eq('id', sheetId);

        if (error) throw error;
    }

    /**
     * Delete all sheets for a drawing file
     * @param {string} drawingFileId - Drawing file UUID
     * @returns {Promise<number>} Number of sheets deleted
     */
    async function deleteSheetsByDrawingFile(drawingFileId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const sheets = await getSheetsByDrawingFile(drawingFileId);
        
        // Delete each sheet (includes storage cleanup)
        for (const sheet of sheets) {
            await deleteSheet(sheet.id);
        }

        return sheets.length;
    }

    // ============================================================================
    // STORAGE OPERATIONS
    // ============================================================================

    /**
     * Get public URL for a sheet
     * @param {string} storagePath - Storage path
     * @returns {string} Public URL
     */
    function getSheetUrl(storagePath) {
        if (!isAvailable()) return null;

        const { data } = getClient()
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

        return data?.publicUrl || null;
    }

    /**
     * Download a sheet
     * @param {Object} sheet - Sheet object with storage_path
     * @returns {Promise<void>}
     */
    async function downloadSheet(sheet) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .storage
            .from(STORAGE_BUCKET)
            .download(sheet.storage_path);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sheet.sheet_name || `Sheet_${sheet.sheet_number}`}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Download multiple sheets as a ZIP
     * @param {Array} sheets - Array of sheet objects
     * @param {string} zipFileName - Name for the ZIP file
     * @returns {Promise<void>}
     */
    async function downloadSheetsAsZip(sheets, zipFileName = 'sheets.zip') {
        if (!isAvailable()) throw new Error('Supabase not available');
        if (!sheets || sheets.length === 0) throw new Error('No sheets to download');

        // This would require a ZIP library like JSZip
        // For now, download individually
        console.log(`[DrawingSheets] Downloading ${sheets.length} sheets individually (ZIP not yet implemented)`);
        
        for (const sheet of sheets) {
            await downloadSheet(sheet);
            // Add small delay to avoid overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // ============================================================================
    // UNIT TYPES
    // ============================================================================

    /**
     * Get all module unit types
     * @returns {Promise<Array>} Array of unit types
     */
    async function getUnitTypes() {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('module_unit_types')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get unit type by code
     * @param {string} code - Unit type code (e.g., 'C1')
     * @returns {Promise<Object>} Unit type
     */
    async function getUnitType(code) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('module_unit_types')
            .select('*')
            .eq('code', code)
            .single();

        if (error) throw error;
        return data;
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    /**
     * Get sheet statistics for a project
     * @param {string} projectId - Project UUID
     * @returns {Promise<Object>} Statistics
     */
    async function getProjectSheetStats(projectId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data: sheets, error } = await getClient()
            .from('drawing_sheets')
            .select('discipline, blm_type, linked_module_id')
            .eq('project_id', projectId);

        if (error) throw error;

        const stats = {
            total_sheets: sheets.length,
            by_discipline: {},
            by_blm_type: {},
            linked_modules: 0,
            unlinked_sheets: 0
        };

        sheets.forEach(sheet => {
            // Count by discipline
            if (sheet.discipline) {
                stats.by_discipline[sheet.discipline] = (stats.by_discipline[sheet.discipline] || 0) + 1;
            }

            // Count by BLM type
            if (sheet.blm_type) {
                stats.by_blm_type[sheet.blm_type] = (stats.by_blm_type[sheet.blm_type] || 0) + 1;
            }

            // Count linked vs unlinked
            if (sheet.linked_module_id) {
                stats.linked_modules++;
            } else {
                stats.unlinked_sheets++;
            }
        });

        return stats;
    }

    // ============================================================================
    // UTILITIES
    // ============================================================================

    /**
     * Format OCR confidence as percentage
     * @param {number} confidence - Confidence score (0-100)
     * @returns {string} Formatted percentage
     */
    function formatConfidence(confidence) {
        if (!confidence) return 'N/A';
        return `${Math.round(confidence)}%`;
    }

    /**
     * Get confidence color class
     * @param {number} confidence - Confidence score (0-100)
     * @returns {string} Tailwind color class
     */
    function getConfidenceColor(confidence) {
        if (!confidence) return 'text-gray-400';
        if (confidence >= 80) return 'text-green-600';
        if (confidence >= 60) return 'text-yellow-600';
        return 'text-red-600';
    }

    /**
     * Save sheets extracted by Tesseract OCR to database
     * @param {string} drawingFileId - Drawing file UUID
     * @param {string} projectId - Project UUID
     * @param {Array} sheets - Array of sheet data from Tesseract
     * @returns {Promise<Object>} Result with saved sheet count
     */
    async function saveSheets(drawingFileId, projectId, sheets) {
        if (!isAvailable()) throw new Error('Supabase not available');
        
        console.log(`[DrawingSheets] Saving ${sheets.length} sheets for drawing ${drawingFileId}`);
        
        const savedSheets = [];
        
        for (const sheet of sheets) {
            try {
                // Insert sheet record
                const { data: insertedSheet, error: insertError } = await getClient()
                    .from('drawing_sheets')
                    .insert({
                        drawing_file_id: drawingFileId,
                        project_id: projectId,
                        sheet_name: sheet.sheet_number || `Sheet ${sheet.page_number}`,
                        sheet_title: sheet.sheet_title,
                        drawing_date: sheet.date,
                        page_number: sheet.page_number,
                        ocr_confidence: sheet.ocr_confidence,
                        ocr_metadata: {
                            raw_text: sheet.raw_text,
                            blm_id: sheet.blm_id,
                            extracted_at: new Date().toISOString(),
                            ocr_engine: 'tesseract'
                        }
                    })
                    .select()
                    .single();
                
                if (insertError) {
                    console.error(`[DrawingSheets] Error inserting sheet ${sheet.page_number}:`, insertError);
                    continue;
                }
                
                // Auto-link to module if BLM ID found
                if (sheet.blm_id && insertedSheet) {
                    try {
                        await getClient().rpc('auto_link_sheet_to_module', {
                            p_sheet_id: insertedSheet.id,
                            p_sheet_number: sheet.sheet_number || sheet.blm_id
                        });
                    } catch (linkError) {
                        console.warn(`[DrawingSheets] Auto-link failed for sheet ${sheet.page_number}:`, linkError);
                    }
                }
                
                savedSheets.push(insertedSheet);
            } catch (error) {
                console.error(`[DrawingSheets] Error processing sheet ${sheet.page_number}:`, error);
            }
        }
        
        console.log(`[DrawingSheets] Saved ${savedSheets.length}/${sheets.length} sheets`);
        
        return {
            total: sheets.length,
            saved: savedSheets.length,
            sheets: savedSheets
        };
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_DRAWING_SHEETS = {
        // Processing
        processDrawingSheets,
        saveSheets,
        getExtractionJobStatus,
        getExtractionJobs,

        // Queries
        getSheetsByDrawingFile,
        getSheet,
        searchSheets,
        getSheetsByUnitTypeAndDiscipline,
        getSheetsByModule,

        // Operations
        updateSheet,
        linkSheetToModule,
        deleteSheet,
        deleteSheetsByDrawingFile,

        // Storage
        getSheetUrl,
        downloadSheet,
        downloadSheetsAsZip,

        // Unit Types
        getUnitTypes,
        getUnitType,

        // Statistics
        getProjectSheetStats,

        // Utilities
        formatConfidence,
        getConfidenceColor,

        // Constants
        DISCIPLINES,
        STORAGE_BUCKET
    };

    if (window.MODA_DEBUG) console.log('[DrawingSheets] Module loaded');

})();
