/**
 * MODA - Permit Sheet Versioning Module
 * 
 * Data access layer for permit drawing packages with sheet-level version tracking.
 * Supports uploading update packages, OCR extraction, and compiled current views.
 * 
 * Features:
 * - Upload full or update packages
 * - OCR extraction of sheet numbers from title blocks
 * - Automatic version chain management
 * - Get current (compiled) sheet set
 * - View sheet version history
 * - Download individual sheets or compiled packages
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
    const EDGE_FUNCTION_URL = 'https://syreuphexagezawjyjgt.supabase.co/functions/v1/process-permit-sheets';

    // Discipline code mappings
    const DISCIPLINE_CODES = {
        'S': 'Structural',
        'A': 'Architectural',
        'M': 'Mechanical',
        'P': 'Plumbing',
        'E': 'Electrical',
        'F': 'Fire Protection',
        'XS': 'Structural',
        'XA': 'Architectural',
        'XM': 'Mechanical',
        'XP': 'Plumbing',
        'XE': 'Electrical',
        'XF': 'Fire Protection',
        'FA': 'Fire Alarm',
        'FS': 'Fire Sprinkler',
        'T': 'Title 24',
        'C': 'Civil'
    };

    // ============================================================================
    // PACKAGE OPERATIONS
    // ============================================================================

    /**
     * Create a new permit package record
     * @param {Object} packageData - Package metadata
     * @returns {Promise<Object>} Created package
     */
    async function createPackage(packageData) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('permit_packages')
            .insert({
                project_id: packageData.projectId,
                drawing_file_id: packageData.drawingFileId || null,
                discipline: packageData.discipline,
                package_name: packageData.packageName,
                package_version: packageData.packageVersion,
                package_type: packageData.packageType || 'full',
                job_number: packageData.jobNumber || null,
                package_date: packageData.packageDate || null,
                storage_path: packageData.storagePath || null,
                file_size: packageData.fileSize || null,
                total_sheets: packageData.totalSheets || null,
                uploaded_by: packageData.uploadedBy || null
            })
            .select()
            .single();

        if (error) throw error;
        console.log(`[PermitSheets] Created package: ${data.id}`);
        return data;
    }

    /**
     * Get all packages for a project/discipline
     * @param {string} projectId - Project UUID
     * @param {string} discipline - Optional discipline filter
     * @returns {Promise<Array>} Array of packages
     */
    async function getPackages(projectId, discipline = null) {
        if (!isAvailable()) throw new Error('Supabase not available');

        let query = getClient()
            .from('permit_packages')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (discipline) {
            query = query.eq('discipline', discipline);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Get a single package with its sheets
     * @param {string} packageId - Package UUID
     * @returns {Promise<Object>} Package with sheets array
     */
    async function getPackageWithSheets(packageId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data: pkg, error: pkgError } = await getClient()
            .from('permit_packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (pkgError) throw pkgError;

        const { data: sheets, error: sheetsError } = await getClient()
            .from('permit_sheet_versions')
            .select('*')
            .eq('package_id', packageId)
            .order('page_number', { ascending: true });

        if (sheetsError) throw sheetsError;

        return { ...pkg, sheets: sheets || [] };
    }

    /**
     * Update package metadata
     * @param {string} packageId - Package UUID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated package
     */
    async function updatePackage(packageId, updates) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('permit_packages')
            .update(updates)
            .eq('id', packageId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Soft delete a package
     * @param {string} packageId - Package UUID
     * @param {string} deletedBy - User who deleted
     * @returns {Promise<void>}
     */
    async function deletePackage(packageId, deletedBy = null) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { error } = await getClient()
            .from('permit_packages')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: deletedBy
            })
            .eq('id', packageId);

        if (error) throw error;
        console.log(`[PermitSheets] Deleted package: ${packageId}`);
    }

    // ============================================================================
    // SHEET OPERATIONS
    // ============================================================================

    /**
     * Create a sheet version record
     * @param {Object} sheetData - Sheet metadata
     * @returns {Promise<Object>} Created sheet
     */
    async function createSheet(sheetData) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('permit_sheet_versions')
            .insert({
                package_id: sheetData.packageId,
                project_id: sheetData.projectId,
                sheet_number: sheetData.sheetNumber,
                sheet_title: sheetData.sheetTitle || null,
                revision: sheetData.revision || null,
                revision_date: sheetData.revisionDate || null,
                drawn_by: sheetData.drawnBy || null,
                checked_by: sheetData.checkedBy || null,
                designed_by: sheetData.designedBy || null,
                discipline_code: sheetData.disciplineCode || null,
                discipline_name: sheetData.disciplineName || null,
                page_number: sheetData.pageNumber,
                storage_path: sheetData.storagePath,
                file_size: sheetData.fileSize || null,
                ocr_confidence: sheetData.ocrConfidence || null,
                ocr_raw_text: sheetData.ocrRawText || null,
                ocr_metadata: sheetData.ocrMetadata || {}
            })
            .select()
            .single();

        if (error) throw error;

        // Process version chain (mark previous versions as superseded)
        await getClient().rpc('process_sheet_update', { p_new_sheet_id: data.id });

        console.log(`[PermitSheets] Created sheet: ${data.sheet_number} (${data.id})`);
        return data;
    }

    /**
     * Get current (latest) sheets for a project/discipline
     * This is the "compiled package" view
     * @param {string} projectId - Project UUID
     * @param {string} discipline - Optional discipline filter
     * @returns {Promise<Array>} Array of current sheets
     */
    async function getCurrentSheets(projectId, discipline = null) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .rpc('get_current_sheets', {
                p_project_id: projectId,
                p_discipline: discipline
            });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get version history for a specific sheet
     * @param {string} projectId - Project UUID
     * @param {string} sheetNumber - Sheet number (e.g., "S0.01M")
     * @returns {Promise<Array>} Array of sheet versions (newest first)
     */
    async function getSheetHistory(projectId, sheetNumber) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .rpc('get_sheet_history', {
                p_project_id: projectId,
                p_sheet_number: sheetNumber
            });

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
            .from('permit_sheet_versions')
            .select(`
                *,
                permit_packages(id, package_name, package_version, discipline)
            `)
            .eq('id', sheetId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update sheet metadata
     * @param {string} sheetId - Sheet UUID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated sheet
     */
    async function updateSheet(sheetId, updates) {
        if (!isAvailable()) throw new Error('Supabase not available');

        const { data, error } = await getClient()
            .from('permit_sheet_versions')
            .update(updates)
            .eq('id', sheetId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ============================================================================
    // OCR PROCESSING
    // ============================================================================

    /**
     * Process a permit package - split PDF and OCR each sheet
     * @param {string} packageId - Package UUID
     * @returns {Promise<Object>} Processing result
     */
    async function processPackage(packageId) {
        if (!isAvailable()) throw new Error('Supabase not available');

        console.log(`[PermitSheets] Processing package: ${packageId}`);

        // Update status to processing
        await updatePackage(packageId, { ocr_status: 'processing' });

        try {
            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getClient().supabaseKey}`
                },
                body: JSON.stringify({
                    packageId,
                    action: 'process'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process package');
            }

            const result = await response.json();
            console.log(`[PermitSheets] Processed ${result.sheets_processed} sheets`);
            return result;
        } catch (error) {
            // Update status to failed
            await updatePackage(packageId, {
                ocr_status: 'failed',
                ocr_error: error.message
            });
            throw error;
        }
    }

    /**
     * Parse discipline from sheet number prefix
     * @param {string} sheetNumber - Sheet number (e.g., "S0.01M")
     * @returns {Object} { code, name }
     */
    function parseDiscipline(sheetNumber) {
        if (!sheetNumber) return { code: null, name: null };

        // Extract prefix (letters before first number or dash)
        const match = sheetNumber.match(/^([A-Za-z]+)/);
        if (!match) return { code: null, name: null };

        const code = match[1].toUpperCase();
        const name = DISCIPLINE_CODES[code] || 'General';

        return { code, name };
    }

    /**
     * Normalize sheet number for matching
     * @param {string} sheetNumber - Raw sheet number
     * @returns {string} Normalized sheet number
     */
    function normalizeSheetNumber(sheetNumber) {
        if (!sheetNumber) return '';
        return sheetNumber.toUpperCase().replace(/\s+/g, '').trim();
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
        if (!isAvailable() || !storagePath) return null;

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

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sheet.sheet_number || `Sheet_${sheet.page_number}`}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Download all current sheets as individual files
     * @param {string} projectId - Project UUID
     * @param {string} discipline - Discipline filter
     * @returns {Promise<void>}
     */
    async function downloadCurrentSheets(projectId, discipline) {
        const sheets = await getCurrentSheets(projectId, discipline);
        
        console.log(`[PermitSheets] Downloading ${sheets.length} current sheets`);
        
        for (const sheet of sheets) {
            await downloadSheet(sheet);
            // Small delay to avoid overwhelming browser
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    /**
     * Get statistics for a project's permit sheets
     * @param {string} projectId - Project UUID
     * @param {string} discipline - Optional discipline filter
     * @returns {Promise<Object>} Statistics
     */
    async function getStats(projectId, discipline = null) {
        if (!isAvailable()) throw new Error('Supabase not available');

        // Get packages
        const packages = await getPackages(projectId, discipline);
        
        // Get current sheets
        const currentSheets = await getCurrentSheets(projectId, discipline);

        // Get all sheets for version counts
        let query = getClient()
            .from('permit_sheet_versions')
            .select('sheet_number_normalized, is_current')
            .eq('project_id', projectId);

        if (discipline) {
            query = query.in('package_id', packages.map(p => p.id));
        }

        const { data: allSheets, error } = await query;
        if (error) throw error;

        // Count sheets with multiple versions
        const sheetVersionCounts = {};
        (allSheets || []).forEach(s => {
            const key = s.sheet_number_normalized;
            sheetVersionCounts[key] = (sheetVersionCounts[key] || 0) + 1;
        });

        const sheetsWithUpdates = Object.values(sheetVersionCounts).filter(c => c > 1).length;

        return {
            totalPackages: packages.length,
            fullPackages: packages.filter(p => p.package_type === 'full').length,
            updatePackages: packages.filter(p => p.package_type === 'update').length,
            currentSheets: currentSheets.length,
            uniqueSheets: Object.keys(sheetVersionCounts).length,
            sheetsWithUpdates,
            latestPackage: packages[0] || null
        };
    }

    // ============================================================================
    // NEXT VERSION HELPER
    // ============================================================================

    /**
     * Calculate next version number for a discipline
     * @param {string} projectId - Project UUID
     * @param {string} discipline - Discipline
     * @returns {Promise<string>} Next version (e.g., "v1.2")
     */
    async function getNextVersion(projectId, discipline) {
        const packages = await getPackages(projectId, discipline);
        
        if (packages.length === 0) {
            return 'v1.0';
        }

        // Parse existing versions and find max
        let maxMajor = 1;
        let maxMinor = 0;

        packages.forEach(pkg => {
            const match = pkg.package_version.match(/v?(\d+)\.(\d+)/);
            if (match) {
                const major = parseInt(match[1], 10);
                const minor = parseInt(match[2], 10);
                if (major > maxMajor || (major === maxMajor && minor > maxMinor)) {
                    maxMajor = major;
                    maxMinor = minor;
                }
            }
        });

        // Increment minor version
        return `v${maxMajor}.${maxMinor + 1}`;
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_PERMIT_SHEETS = {
        // Availability
        isAvailable,

        // Package operations
        createPackage,
        getPackages,
        getPackageWithSheets,
        updatePackage,
        deletePackage,

        // Sheet operations
        createSheet,
        getCurrentSheets,
        getSheetHistory,
        getSheet,
        updateSheet,

        // OCR processing
        processPackage,
        parseDiscipline,
        normalizeSheetNumber,

        // Storage
        getSheetUrl,
        downloadSheet,
        downloadCurrentSheets,

        // Statistics
        getStats,
        getNextVersion,

        // Constants
        DISCIPLINE_CODES,
        STORAGE_BUCKET
    };

    if (window.MODA_DEBUG) console.log('[PermitSheets] Module loaded');

})();
