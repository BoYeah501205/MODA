/**
 * Supabase Drawing Links Data Layer for MODA
 * 
 * Handles CRUD operations for quick-access links to specific pages
 * within permit drawing packages.
 */

(function() {
    'use strict';

    // Check if Supabase client is available
    if (!window.MODA_SUPABASE) {
        console.warn('[Drawing Links] Supabase client not initialized');
        window.MODA_DRAWING_LINKS = {
            isAvailable: () => false
        };
        return;
    }

    const getClient = () => window.MODA_SUPABASE.client;
    const isAvailable = () => window.MODA_SUPABASE.isInitialized && getClient();

    // Default preset labels for new projects
    const PRESET_LABELS = [
        'Shear Schedule',
        'Window Schedule', 
        'Door Schedule',
        'Set Sequence'
    ];

    // ============================================================================
    // DRAWING LINKS API
    // ============================================================================

    const DrawingLinksAPI = {
        /**
         * Get all drawing links for a project
         * @param {string} projectId - Project UUID
         * @returns {Promise<Array>} Array of drawing link objects
         */
        async getByProject(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!projectId) throw new Error('Project ID is required');

            console.log('[Drawing Links] Fetching links for project:', projectId);

            const { data, error } = await getClient()
                .from('drawing_links')
                .select('*')
                .eq('project_id', projectId)
                .order('is_preset', { ascending: false })
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        },

        /**
         * Initialize preset links for a project (if not already present)
         * @param {string} projectId - Project UUID
         * @param {string} createdBy - User who created the links
         * @returns {Promise<Array>} Array of created/existing links
         */
        async initializePresets(projectId, createdBy = 'System') {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!projectId) throw new Error('Project ID is required');

            // Check if presets already exist
            const existing = await this.getByProject(projectId);
            const existingPresets = existing.filter(l => l.is_preset);
            
            if (existingPresets.length > 0) {
                console.log('[Drawing Links] Presets already exist for project');
                return existing;
            }

            console.log('[Drawing Links] Initializing preset links for project:', projectId);

            // Create preset links (without package_path - to be configured by user)
            const presets = PRESET_LABELS.map(label => ({
                project_id: projectId,
                package_path: '',
                page_number: 1,
                label: label,
                is_preset: true,
                created_by: createdBy
            }));

            const { data, error } = await getClient()
                .from('drawing_links')
                .insert(presets)
                .select();

            if (error) throw error;
            
            console.log('[Drawing Links] Created', data.length, 'preset links');
            return data || [];
        },

        /**
         * Create a new drawing link
         * @param {Object} linkData - Link data
         * @returns {Promise<Object>} Created link
         */
        async create(linkData) {
            if (!isAvailable()) throw new Error('Supabase not available');

            const { data, error } = await getClient()
                .from('drawing_links')
                .insert({
                    project_id: linkData.projectId,
                    package_path: linkData.packagePath || '',
                    sharepoint_file_id: linkData.sharepointFileId || null,
                    page_number: linkData.pageNumber || 1,
                    label: linkData.label,
                    description: linkData.description || null,
                    is_preset: linkData.isPreset || false,
                    region: linkData.region || null,
                    created_by: linkData.createdBy || 'Unknown'
                })
                .select()
                .single();

            if (error) throw error;
            console.log('[Drawing Links] Created link:', data.id, data.label);
            return data;
        },

        /**
         * Update an existing drawing link
         * @param {string} linkId - Link UUID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Updated link
         */
        async update(linkId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');

            const updateData = { updated_at: new Date().toISOString() };
            
            if (updates.packagePath !== undefined) updateData.package_path = updates.packagePath;
            if (updates.sharepointFileId !== undefined) updateData.sharepoint_file_id = updates.sharepointFileId;
            if (updates.pageNumber !== undefined) updateData.page_number = updates.pageNumber;
            if (updates.label !== undefined) updateData.label = updates.label;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.region !== undefined) updateData.region = updates.region;

            const { data, error } = await getClient()
                .from('drawing_links')
                .update(updateData)
                .eq('id', linkId)
                .select()
                .single();

            if (error) throw error;
            console.log('[Drawing Links] Updated link:', linkId);
            return data;
        },

        /**
         * Delete a drawing link
         * @param {string} linkId - Link UUID
         * @returns {Promise<boolean>} Success
         */
        async delete(linkId) {
            if (!isAvailable()) throw new Error('Supabase not available');

            const { error } = await getClient()
                .from('drawing_links')
                .delete()
                .eq('id', linkId);

            if (error) throw error;
            console.log('[Drawing Links] Deleted link:', linkId);
            return true;
        },

        /**
         * Get a single link by ID
         * @param {string} linkId - Link UUID
         * @returns {Promise<Object|null>} Link object or null
         */
        async getById(linkId) {
            if (!isAvailable()) throw new Error('Supabase not available');

            const { data, error } = await getClient()
                .from('drawing_links')
                .select('*')
                .eq('id', linkId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        }
    };

    // ============================================================================
    // PDF PAGE EXTRACTION
    // ============================================================================

    const PDFUtils = {
        /**
         * Parse page number string into array of page numbers
         * Supports: single (5), comma-separated (3,7,12), ranges (1-5), or mixed (1-3,7,10-12)
         * @param {string|number} pageInput - Page number input
         * @returns {number[]} Array of 1-indexed page numbers
         */
        parsePageNumbers(pageInput) {
            if (typeof pageInput === 'number') return [pageInput];
            if (!pageInput) return [1];
            
            const pageStr = String(pageInput).trim();
            const pages = [];
            
            // Split by comma
            const parts = pageStr.split(',').map(p => p.trim()).filter(p => p);
            
            for (const part of parts) {
                if (part.includes('-')) {
                    // Range: "1-5"
                    const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                            if (!pages.includes(i)) pages.push(i);
                        }
                    }
                } else {
                    // Single number
                    const num = parseInt(part, 10);
                    if (!isNaN(num) && !pages.includes(num)) {
                        pages.push(num);
                    }
                }
            }
            
            return pages.sort((a, b) => a - b);
        },

        /**
         * Extract pages from a PDF and open in a new tab
         * Uses pdf-lib for extraction
         * @param {string} pdfUrl - URL to the source PDF
         * @param {string|number} pageInput - Page number(s): single (5), multiple (3,7,12), or range (1-5)
         * @param {string} fileName - Optional filename for the extracted page
         */
        async extractAndOpenPage(pdfUrl, pageInput, fileName = 'extracted-page.pdf') {
            const pageNumbers = this.parsePageNumbers(pageInput);
            console.log('[Drawing Links] Extracting pages', pageNumbers, 'from:', pdfUrl);

            // Check if pdf-lib is available
            if (typeof PDFLib === 'undefined') {
                console.error('[Drawing Links] pdf-lib not loaded');
                // Fallback: open full PDF with page fragment (first page only)
                window.open(`${pdfUrl}#page=${pageNumbers[0]}`, '_blank');
                return;
            }

            try {
                // Fetch the PDF
                const response = await fetch(pdfUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch PDF: ${response.status}`);
                }
                const pdfBytes = await response.arrayBuffer();

                // Load the PDF
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
                const totalPages = pdfDoc.getPageCount();

                // Validate page numbers
                const validPages = pageNumbers.filter(p => p >= 1 && p <= totalPages);
                if (validPages.length === 0) {
                    throw new Error(`No valid pages in range 1-${totalPages}`);
                }

                // Create a new PDF with the requested pages
                const newPdfDoc = await PDFLib.PDFDocument.create();
                const pageIndices = validPages.map(p => p - 1); // Convert to 0-indexed
                const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach(page => newPdfDoc.addPage(page));

                // Save the new PDF
                const newPdfBytes = await newPdfDoc.save();

                // Create blob and open in new tab
                const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                
                // Open in new tab
                const newTab = window.open(blobUrl, '_blank');
                
                // Clean up blob URL after a delay (give browser time to load)
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                }, 60000); // 1 minute

                console.log('[Drawing Links] Extracted', validPages.length, 'page(s) opened in new tab');
                return true;
            } catch (error) {
                console.error('[Drawing Links] Page extraction failed:', error);
                // Fallback: open full PDF with page fragment
                window.open(`${pdfUrl}#page=${pageNumbers[0]}`, '_blank');
                return false;
            }
        },

        /**
         * Open a drawing link - extracts the page and opens in new tab
         * @param {Object} link - Drawing link object
         * @returns {Promise<boolean>} Success
         */
        async openLink(link) {
            if (!link.package_path && !link.sharepoint_file_id) {
                console.warn('[Drawing Links] Link not configured:', link.label);
                return false;
            }

            try {
                // Get the PDF URL from SharePoint
                let pdfUrl;
                
                if (link.sharepoint_file_id && window.MODA_SHAREPOINT?.isAvailable()) {
                    // Get preview URL from SharePoint (this is a direct download URL)
                    pdfUrl = await window.MODA_SHAREPOINT.getPreviewUrl(link.sharepoint_file_id);
                } else if (link.package_path) {
                    // Use package_path directly if it's a URL
                    pdfUrl = link.package_path;
                }

                if (!pdfUrl) {
                    throw new Error('Could not get PDF URL');
                }

                // Extract and open the specific page
                const fileName = `${link.label.replace(/[^a-zA-Z0-9]/g, '_')}_page${link.page_number}.pdf`;
                return await this.extractAndOpenPage(pdfUrl, link.page_number, fileName);
            } catch (error) {
                console.error('[Drawing Links] Error opening link:', error);
                alert('Error opening drawing link: ' + error.message);
                return false;
            }
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_DRAWING_LINKS = {
        isAvailable,
        PRESET_LABELS,
        ...DrawingLinksAPI,
        pdf: PDFUtils
    };

    console.log('[Drawing Links] Data layer loaded');

})();
