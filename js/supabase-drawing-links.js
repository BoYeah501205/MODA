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
         * Delete a drawing link (archives extracted file first if exists)
         * @param {string} linkId - Link UUID
         * @param {string} archivedBy - User performing deletion
         * @returns {Promise<boolean>} Success
         */
        async delete(linkId, archivedBy = 'System') {
            if (!isAvailable()) throw new Error('Supabase not available');

            // Get the link first to archive extracted file
            const link = await this.getById(linkId);
            if (link && link.extracted_file_id) {
                await this.archiveExtractedFile(link, 'deleted', archivedBy);
            }

            const { error } = await getClient()
                .from('drawing_links')
                .delete()
                .eq('id', linkId);

            if (error) throw error;
            console.log('[Drawing Links] Deleted link:', linkId);
            return true;
        },
        
        /**
         * Archive an extracted file before update/delete
         * @param {Object} link - The link being modified
         * @param {string} reason - 'updated', 'deleted', 'source_changed'
         * @param {string} archivedBy - User performing the action
         */
        async archiveExtractedFile(link, reason, archivedBy = 'System') {
            if (!link.extracted_file_id) return;
            
            try {
                // Insert archive record
                const { error } = await getClient()
                    .from('drawing_links_archive')
                    .insert({
                        original_link_id: link.id,
                        project_id: link.project_id,
                        label: link.label,
                        page_number: link.page_number,
                        extracted_file_id: link.extracted_file_id,
                        archive_reason: reason,
                        archived_by: archivedBy,
                        original_created_at: link.created_at,
                        original_extracted_at: link.extracted_at
                    });
                
                if (error) {
                    console.warn('[Drawing Links] Failed to archive:', error);
                } else {
                    console.log('[Drawing Links] Archived extracted file for:', link.label);
                }
                
                // TODO: Move file in SharePoint to _Archive folder
                // This would require SharePoint move/rename API
            } catch (e) {
                console.warn('[Drawing Links] Archive error:', e);
            }
        },
        
        /**
         * Update extraction status for a link
         * @param {string} linkId - Link UUID
         * @param {string} status - 'pending', 'extracting', 'ready', 'failed', 'stale'
         * @param {Object} extractionData - Optional extraction result data
         */
        async updateExtractionStatus(linkId, status, extractionData = {}) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const updateData = {
                extraction_status: status,
                updated_at: new Date().toISOString()
            };
            
            if (extractionData.extractedFileId) {
                updateData.extracted_file_id = extractionData.extractedFileId;
                updateData.extracted_at = new Date().toISOString();
            }
            if (extractionData.sourceVersionId) {
                updateData.source_version_id = extractionData.sourceVersionId;
            }
            
            const { data, error } = await getClient()
                .from('drawing_links')
                .update(updateData)
                .eq('id', linkId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
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
    // PDF PAGE EXTRACTION & PRE-EXTRACTION
    // ============================================================================

    const PDFUtils = {
        /**
         * Pre-extract pages from a PDF and upload to SharePoint _Linked Details folder
         * Called when a link is created or updated
         * @param {Object} link - The drawing link object
         * @param {string} projectName - Project name for folder path
         * @param {function} onProgress - Optional progress callback
         * @returns {Promise<Object>} { extractedFileId, extractedAt }
         */
        async preExtractAndUpload(link, projectName, onProgress = null) {
            if (!link.sharepoint_file_id) {
                throw new Error('No source file ID for extraction');
            }
            
            console.log('[Drawing Links] Pre-extracting pages for:', link.label);
            if (onProgress) onProgress({ status: 'starting', percent: 5 });
            
            // Get download URL for source PDF
            const pdfUrl = await window.MODA_SHAREPOINT.getDownloadUrl(link.sharepoint_file_id);
            if (!pdfUrl) throw new Error('Could not get source PDF URL');
            
            if (onProgress) onProgress({ status: 'downloading', percent: 15 });
            
            // Fetch the PDF
            const response = await fetch(pdfUrl);
            if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
            const pdfBytes = await response.arrayBuffer();
            
            if (onProgress) onProgress({ status: 'extracting', percent: 40 });
            
            // Load and extract pages
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const totalPages = pdfDoc.getPageCount();
            const pageNumbers = this.parsePageNumbers(link.page_number);
            const validPages = pageNumbers.filter(p => p >= 1 && p <= totalPages);
            
            if (validPages.length === 0) {
                throw new Error(`No valid pages in range 1-${totalPages}`);
            }
            
            // Create new PDF with extracted pages
            const newPdfDoc = await PDFLib.PDFDocument.create();
            const pageIndices = validPages.map(p => p - 1);
            const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdfDoc.addPage(page));
            
            if (onProgress) onProgress({ status: 'saving', percent: 60 });
            
            const newPdfBytes = await newPdfDoc.save();
            
            // Create file for upload
            const sanitizedLabel = link.label.replace(/[^a-zA-Z0-9]/g, '_');
            const pageStr = validPages.length === 1 ? `p${validPages[0]}` : `p${validPages.join('-')}`;
            const fileName = `${sanitizedLabel}_${pageStr}.pdf`;
            const file = new File([newPdfBytes], fileName, { type: 'application/pdf' });
            
            if (onProgress) onProgress({ status: 'uploading', percent: 70 });
            
            // Upload to SharePoint using existing uploadFile API
            // Uses _Linked Details as a "discipline" subfolder under Permit Drawings
            const uploadResult = await window.MODA_SHAREPOINT.uploadFile(
                file,
                projectName,
                'Permit Drawings',
                '_Linked Details',
                (progress) => {
                    if (onProgress) {
                        const uploadPercent = 70 + (progress.percent * 0.25);
                        onProgress({ status: 'uploading', percent: uploadPercent });
                    }
                }
            );
            
            if (onProgress) onProgress({ status: 'complete', percent: 100 });
            
            // uploadFile returns { id, name, size, webUrl, downloadUrl }
            console.log('[Drawing Links] Pre-extracted and uploaded:', fileName, 'FileId:', uploadResult.id);
            
            return {
                extractedFileId: uploadResult.id,
                extractedAt: new Date().toISOString(),
                fileName: fileName
            };
        },
        
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
         * @param {Window} preOpenedWindow - Optional pre-opened window to avoid popup blocker
         */
        async extractAndOpenPage(pdfUrl, pageInput, fileName = 'extracted-page.pdf', preOpenedWindow = null) {
            const pageNumbers = this.parsePageNumbers(pageInput);
            console.log('[Drawing Links] Extracting pages', pageNumbers, 'from:', pdfUrl);

            // Check if pdf-lib is available
            if (typeof PDFLib === 'undefined') {
                console.error('[Drawing Links] pdf-lib not loaded');
                // Fallback: open full PDF with page fragment (first page only)
                if (preOpenedWindow) {
                    preOpenedWindow.location.href = `${pdfUrl}#page=${pageNumbers[0]}`;
                } else {
                    window.open(`${pdfUrl}#page=${pageNumbers[0]}`, '_blank');
                }
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
                
                // Navigate the pre-opened window or open new one
                if (preOpenedWindow) {
                    preOpenedWindow.location.href = blobUrl;
                } else {
                    window.open(blobUrl, '_blank');
                }
                
                // Clean up blob URL after a delay (give browser time to load)
                setTimeout(() => {
                    URL.revokeObjectURL(blobUrl);
                }, 60000); // 1 minute

                console.log('[Drawing Links] Extracted', validPages.length, 'page(s) opened in new tab');
                return true;
            } catch (error) {
                console.error('[Drawing Links] Page extraction failed:', error);
                // Fallback: open full PDF with page fragment
                if (preOpenedWindow) {
                    preOpenedWindow.location.href = `${pdfUrl}#page=${pageNumbers[0]}`;
                } else {
                    window.open(`${pdfUrl}#page=${pageNumbers[0]}`, '_blank');
                }
                return false;
            }
        },

        /**
         * Detect if running on mobile/iPad
         */
        isMobile() {
            const ua = navigator.userAgent || '';
            return /iPhone|iPad|iPod|Android/i.test(ua) ||
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        },

        /**
         * Open a drawing link - uses pre-extracted file if available, otherwise extracts on-demand
         * Opens window immediately to avoid popup blocker, shows loading state
         * On mobile/iPad: Opens PDF directly with page fragment (avoids memory issues)
         * @param {Object} link - Drawing link object
         * @returns {Promise<boolean>} Success
         */
        async openLink(link) {
            if (!link.package_path && !link.sharepoint_file_id && !link.extracted_file_id) {
                console.warn('[Drawing Links] Link not configured:', link.label);
                return false;
            }

            const isMobile = this.isMobile();
            const pageNum = this.parsePageNumbers(link.page_number)[0] || 1;
            
            // FAST PATH: If pre-extracted file exists, open it directly (instant!)
            if (link.extracted_file_id && link.extraction_status === 'ready') {
                console.log('[Drawing Links] Opening pre-extracted file:', link.extracted_file_id);
                try {
                    const previewUrl = await window.MODA_SHAREPOINT.getPreviewUrl(link.extracted_file_id);
                    if (previewUrl) {
                        window.open(previewUrl, '_blank');
                        return true;
                    }
                } catch (e) {
                    console.warn('[Drawing Links] Pre-extracted file open failed, falling back:', e);
                }
            }
            
            // On mobile: Skip page extraction (causes memory issues on iPad)
            // Instead, open PDF directly with page fragment - Safari handles this well
            if (isMobile) {
                console.log('[Drawing Links] Mobile detected - opening PDF directly');
                
                try {
                    let pdfUrl;
                    
                    // If pre-extracted exists but failed above, try download URL
                    if (link.extracted_file_id) {
                        pdfUrl = await window.MODA_SHAREPOINT.getDownloadUrl(link.extracted_file_id);
                    }
                    
                    // Otherwise use source file
                    if (!pdfUrl) {
                        if (link.sharepoint_file_id && window.MODA_SHAREPOINT?.getPreviewUrl) {
                            pdfUrl = await window.MODA_SHAREPOINT.getPreviewUrl(link.sharepoint_file_id);
                        } else if (link.sharepoint_file_id && window.MODA_SHAREPOINT?.getDownloadUrl) {
                            pdfUrl = await window.MODA_SHAREPOINT.getDownloadUrl(link.sharepoint_file_id);
                        } else if (link.package_path) {
                            pdfUrl = link.package_path;
                        }
                    }
                    
                    if (pdfUrl) {
                        // Open with page fragment - Safari's native PDF viewer supports this
                        window.open(`${pdfUrl}#page=${pageNum}`, '_blank');
                        return true;
                    }
                } catch (error) {
                    console.error('[Drawing Links] Mobile open failed:', error);
                }
                
                alert('Could not open drawing. Please try again.');
                return false;
            }

            // Desktop: Use page extraction for better UX
            // Open window immediately to avoid popup blocker
            // Show a loading page while we fetch and extract
            const newWindow = window.open('about:blank', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                    <head><title>Loading ${link.label}...</title></head>
                    <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6;">
                        <div style="text-align: center;">
                            <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                            <p style="color: #374151; font-size: 16px; margin: 0;">Extracting page ${link.page_number}...</p>
                            <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">This may take a moment for large drawings</p>
                        </div>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                    </body>
                    </html>
                `);
            }

            try {
                // Get the PDF URL from SharePoint
                let pdfUrl;
                
                if (link.sharepoint_file_id && window.MODA_SHAREPOINT?.isAvailable()) {
                    // Get download URL from SharePoint (need actual file bytes for pdf-lib)
                    console.log('[Drawing Links] Getting download URL for:', link.sharepoint_file_id);
                    pdfUrl = await window.MODA_SHAREPOINT.getDownloadUrl(link.sharepoint_file_id);
                    console.log('[Drawing Links] Download URL:', pdfUrl);
                } else if (link.package_path) {
                    // Use package_path directly if it's a URL
                    pdfUrl = link.package_path;
                }

                if (!pdfUrl) {
                    // Fallback: try to open via SharePoint preview with page number
                    if (link.sharepoint_file_id && window.MODA_SHAREPOINT?.getPreviewUrl) {
                        const previewUrl = await window.MODA_SHAREPOINT.getPreviewUrl(link.sharepoint_file_id);
                        if (previewUrl) {
                            // Navigate the pre-opened window
                            if (newWindow) {
                                newWindow.location.href = `${previewUrl}#page=${pageNum}`;
                            } else {
                                window.open(`${previewUrl}#page=${pageNum}`, '_blank');
                            }
                            return true;
                        }
                    }
                    throw new Error('Could not get PDF URL');
                }

                // Extract and open the specific page
                const fileName = `${link.label.replace(/[^a-zA-Z0-9]/g, '_')}_page${link.page_number}.pdf`;
                return await this.extractAndOpenPage(pdfUrl, link.page_number, fileName, newWindow);
            } catch (error) {
                console.error('[Drawing Links] Error opening link:', error);
                // Final fallback: open SharePoint preview
                if (link.sharepoint_file_id && window.MODA_SHAREPOINT?.getPreviewUrl) {
                    try {
                        const previewUrl = await window.MODA_SHAREPOINT.getPreviewUrl(link.sharepoint_file_id);
                        if (previewUrl) {
                            if (newWindow) {
                                newWindow.location.href = `${previewUrl}#page=${pageNum}`;
                            } else {
                                window.open(`${previewUrl}#page=${pageNum}`, '_blank');
                            }
                            return true;
                        }
                    } catch (e) {
                        console.error('[Drawing Links] Fallback also failed:', e);
                    }
                }
                // Close the loading window and show error
                if (newWindow) newWindow.close();
                alert('Error opening drawing link: ' + error.message);
                return false;
            }
        },
        
        /**
         * Create or update a link with pre-extraction
         * This is the main entry point for link configuration
         * @param {Object} linkData - Link data from modal
         * @param {string} projectName - Project name for folder path
         * @param {function} onProgress - Progress callback
         * @returns {Promise<Object>} Updated link with extraction info
         */
        async createLinkWithExtraction(linkData, projectName, onProgress = null) {
            // First create/update the link in database
            let link;
            if (linkData.id) {
                // Update existing link
                const existingLink = await DrawingLinksAPI.getById(linkData.id);
                if (existingLink && existingLink.extracted_file_id) {
                    // Archive old extraction before updating
                    await DrawingLinksAPI.archiveExtractedFile(existingLink, 'updated', linkData.createdBy);
                }
                link = await DrawingLinksAPI.update(linkData.id, linkData);
            } else {
                link = await DrawingLinksAPI.create(linkData);
            }
            
            // Set status to extracting
            await DrawingLinksAPI.updateExtractionStatus(link.id, 'extracting');
            
            try {
                // Pre-extract and upload
                const extractionResult = await this.preExtractAndUpload(
                    { ...link, ...linkData },
                    projectName,
                    onProgress
                );
                
                // Update link with extraction info
                const updatedLink = await DrawingLinksAPI.updateExtractionStatus(link.id, 'ready', {
                    extractedFileId: extractionResult.extractedFileId,
                    sourceVersionId: linkData.sharepointFileId
                });
                
                return updatedLink;
            } catch (error) {
                console.error('[Drawing Links] Pre-extraction failed:', error);
                // Mark as failed but keep the link (will use on-demand extraction)
                await DrawingLinksAPI.updateExtractionStatus(link.id, 'failed');
                throw error;
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

    if (window.MODA_DEBUG) console.log('[Drawing Links] Data layer loaded');

})();
