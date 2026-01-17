/**
 * Supabase Drawings Data Layer for MODA
 * 
 * Handles PostgreSQL operations for project drawings with version control.
 * Includes file storage integration with Supabase Storage.
 */

(function() {
    'use strict';

    // Check if Supabase client is available
    if (!window.MODA_SUPABASE) {
        console.warn('[Supabase Drawings] Supabase client not initialized');
        window.MODA_SUPABASE_DRAWINGS = {
            isAvailable: () => false
        };
        return;
    }

    const getClient = () => window.MODA_SUPABASE.client;
    const isAvailable = () => window.MODA_SUPABASE.isInitialized && getClient();

    // Storage bucket name
    const STORAGE_BUCKET = 'drawings';

    // ============================================================================
    // DISCIPLINES API
    // ============================================================================

    const DisciplinesAPI = {
        // Get all disciplines
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_disciplines')
                .select('*')
                .order('display_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
        }
    };

    // ============================================================================
    // DRAWINGS API
    // ============================================================================

    const DrawingsAPI = {
        // Get all drawings for a project (excludes soft-deleted)
        async getByProject(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawings')
                .select(`
                    *,
                    versions:drawing_versions(*)
                `)
                .eq('project_id', projectId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Get drawings for a specific project and discipline (excludes soft-deleted)
        async getByProjectAndDiscipline(projectId, discipline) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawings')
                .select(`
                    *,
                    versions:drawing_versions(*)
                `)
                .eq('project_id', projectId)
                .eq('discipline', discipline)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Get drawing counts by discipline for a project
        async getCountsByProject(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .rpc('get_drawing_counts', { p_project_id: projectId });
            
            if (error) {
                // Fallback if function doesn't exist
                console.warn('[Drawings] RPC not available, using manual count');
                const { data: drawings, error: drawingsError } = await getClient()
                    .from('drawings')
                    .select('discipline')
                    .eq('project_id', projectId)
                    .is('deleted_at', null);
                
                if (drawingsError) throw drawingsError;
                
                const counts = {};
                (drawings || []).forEach(d => {
                    counts[d.discipline] = (counts[d.discipline] || 0) + 1;
                });
                return Object.entries(counts).map(([discipline, count]) => ({ discipline, count }));
            }
            
            return data || [];
        },

        // Create a new drawing
        async create(drawingData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawings')
                .insert({
                    project_id: drawingData.projectId,
                    discipline: drawingData.discipline,
                    name: drawingData.name,
                    description: drawingData.description || '',
                    created_by: drawingData.createdBy || 'Unknown'
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Drawings] Created drawing:', data.id);
            return data;
        },

        // Update a drawing
        async update(drawingId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const updateData = { updated_at: new Date().toISOString() };
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.linked_module_id !== undefined) updateData.linked_module_id = updates.linked_module_id;
            
            const { data, error } = await getClient()
                .from('drawings')
                .update(updateData)
                .eq('id', drawingId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        // Soft delete a drawing (marks as deleted, keeps in SharePoint for recovery)
        async delete(drawingId, hardDelete = false) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (hardDelete) {
                // Hard delete - remove from SharePoint and database
                const { data: versions } = await getClient()
                    .from('drawing_versions')
                    .select('storage_path, storage_type, sharepoint_file_id')
                    .eq('drawing_id', drawingId);
                
                // Delete files from storage
                if (versions && versions.length > 0) {
                    for (const v of versions) {
                        if (v.storage_type === 'sharepoint' && v.sharepoint_file_id) {
                            try {
                                await window.MODA_SHAREPOINT?.deleteFile(v.sharepoint_file_id);
                            } catch (e) {
                                console.warn('[Drawings] SharePoint delete failed:', e.message);
                            }
                        } else if (v.storage_path && !v.storage_path.startsWith('sharepoint:')) {
                            await getClient().storage.from(STORAGE_BUCKET).remove([v.storage_path]);
                        }
                    }
                }
                
                // Hard delete from database
                const { error } = await getClient()
                    .from('drawings')
                    .delete()
                    .eq('id', drawingId);
                
                if (error) throw error;
                console.log('[Drawings] Hard deleted drawing:', drawingId);
            } else {
                // Soft delete - mark as deleted but keep files
                const { error } = await getClient()
                    .from('drawings')
                    .update({ 
                        deleted_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', drawingId);
                
                if (error) throw error;
                console.log('[Drawings] Soft deleted drawing:', drawingId);
            }
            return true;
        },
        
        // Restore a soft-deleted drawing
        async restore(drawingId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('drawings')
                .update({ 
                    deleted_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', drawingId);
            
            if (error) throw error;
            console.log('[Drawings] Restored drawing:', drawingId);
            return true;
        },
        
        // Get deleted drawings for a project (for recovery UI)
        async getDeleted(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawings')
                .select(`*, versions:drawing_versions(*)`)
                .eq('project_id', projectId)
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        }
    };

    // ============================================================================
    // VERSIONS API
    // ============================================================================

    const VersionsAPI = {
        // Get all versions for a drawing
        async getByDrawing(drawingId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_versions')
                .select('*')
                .eq('drawing_id', drawingId)
                .order('uploaded_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Get latest version for a drawing
        async getLatest(drawingId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_versions')
                .select('*')
                .eq('drawing_id', drawingId)
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        // Create a new version (with file upload to SharePoint - NO Supabase fallback)
        async create(drawingId, file, versionData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let fileUrl = '';
            let storagePath = '';
            let sharePointFileId = null;
            let storageType = 'sharepoint';
            
            // SharePoint is required - no fallback
            if (!window.MODA_SHAREPOINT?.isAvailable()) {
                throw new Error('SharePoint is not available. Please check your connection and try again.');
            }
            
            console.log('[Drawings] Uploading to SharePoint...');
            
            // Get project, category, discipline info for folder path
            const projectName = versionData.projectName || 'Unknown Project';
            const categoryName = versionData.categoryName || 'Shop Drawings';
            const disciplineName = versionData.disciplineName || 'General';
            
            // For Module Packages, create subfolder per module and use versioned filename
            let uploadOptions = {};
            const isModulePackages = disciplineName === 'Module Packages' || 
                                     versionData.disciplineId === 'shop-module-packages';
            
            if (isModulePackages) {
                // Parse module ID from filename for folder name
                const parsedModule = Utils.parseModuleFromFilename(file.name);
                if (parsedModule) {
                    // Create folder name from original filename (without extension)
                    const baseName = file.name.replace(/\.[^/.]+$/, '');
                    uploadOptions.moduleFolderName = baseName;
                    
                    // Create versioned filename: originalname_v1.0.pdf
                    const ext = file.name.split('.').pop();
                    const version = versionData.version || '1.0';
                    uploadOptions.versionedFileName = `${baseName}_v${version}.${ext}`;
                    
                    console.log('[Drawings] Module Packages: Creating folder', uploadOptions.moduleFolderName, 
                                'with file', uploadOptions.versionedFileName);
                }
            }
            
            // Upload to SharePoint (using chunked upload for large files)
            const spResult = await window.MODA_SHAREPOINT.uploadFile(
                file,
                projectName,
                categoryName,
                disciplineName,
                versionData.onProgress,
                uploadOptions
            );
            
            fileUrl = spResult.webUrl || '';
            storagePath = `sharepoint:${spResult.id}`;
            sharePointFileId = spResult.id;
            
            console.log('[Drawings] SharePoint upload successful:', spResult.name);
            
            // Create version record in database
            const { data, error } = await getClient()
                .from('drawing_versions')
                .insert({
                    drawing_id: drawingId,
                    version: versionData.version || '1.0',
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    file_url: fileUrl,
                    storage_path: storagePath,
                    storage_type: storageType,
                    sharepoint_file_id: sharePointFileId,
                    notes: versionData.notes || '',
                    uploaded_by: versionData.uploadedBy || 'Unknown'
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Drawings] Created version:', data.id, 'Storage:', storageType);
            return data;
        },

        // Get download URL for a version (forces download)
        async getDownloadUrl(storagePath, sharePointFileId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Check if stored in SharePoint
            if (storagePath?.startsWith('sharepoint:') || sharePointFileId) {
                const fileId = sharePointFileId || storagePath.replace('sharepoint:', '');
                if (window.MODA_SHAREPOINT?.isAvailable()) {
                    try {
                        return await window.MODA_SHAREPOINT.getDownloadUrl(fileId);
                    } catch (e) {
                        console.error('[Drawings] SharePoint download URL error:', e);
                        throw e;
                    }
                }
                throw new Error('SharePoint not available');
            }
            
            // Supabase Storage
            const { data, error } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry
            
            if (error) throw error;
            return data?.signedUrl;
        },

        // Get view URL for a version (opens in browser for viewing - requires MS login)
        async getViewUrl(storagePath, sharePointFileId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Check if stored in SharePoint
            if (storagePath?.startsWith('sharepoint:') || sharePointFileId) {
                const fileId = sharePointFileId || storagePath.replace('sharepoint:', '');
                if (window.MODA_SHAREPOINT?.isAvailable()) {
                    try {
                        return await window.MODA_SHAREPOINT.getViewUrl(fileId);
                    } catch (e) {
                        console.error('[Drawings] SharePoint view URL error:', e);
                        throw e;
                    }
                }
                throw new Error('SharePoint not available');
            }
            
            // Supabase Storage - use signed URL (will open in browser)
            const { data, error } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(storagePath, 60 * 60);
            
            if (error) throw error;
            return data?.signedUrl;
        },
        
        // Get preview URL for a version (opens in browser without auth - for PDFs)
        // Uses pre-authenticated download URL that browsers display inline
        async getPreviewUrl(storagePath, sharePointFileId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Check if stored in SharePoint
            if (storagePath?.startsWith('sharepoint:') || sharePointFileId) {
                const fileId = sharePointFileId || storagePath.replace('sharepoint:', '');
                if (window.MODA_SHAREPOINT?.isAvailable()) {
                    try {
                        return await window.MODA_SHAREPOINT.getPreviewUrl(fileId);
                    } catch (e) {
                        console.error('[Drawings] SharePoint preview URL error:', e);
                        throw e;
                    }
                }
                throw new Error('SharePoint not available');
            }
            
            // Supabase Storage - use signed URL
            const { data, error } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(storagePath, 60 * 60);
            
            if (error) throw error;
            return data?.signedUrl;
        },

        // Delete a specific version
        async delete(versionId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Get the version to find storage info
            const { data: version } = await getClient()
                .from('drawing_versions')
                .select('storage_path, storage_type, sharepoint_file_id')
                .eq('id', versionId)
                .single();
            
            // Delete from storage based on type
            if (version?.storage_path) {
                if (version.storage_type === 'sharepoint' || version.storage_path.startsWith('sharepoint:')) {
                    // Delete from SharePoint
                    const fileId = version.sharepoint_file_id || version.storage_path.replace('sharepoint:', '');
                    if (window.MODA_SHAREPOINT?.isAvailable()) {
                        try {
                            await window.MODA_SHAREPOINT.deleteFile(fileId);
                        } catch (e) {
                            console.warn('[Drawings] SharePoint delete failed:', e.message);
                        }
                    }
                } else {
                    // Delete from Supabase Storage
                    await getClient().storage.from(STORAGE_BUCKET).remove([version.storage_path]);
                }
            }
            
            // Delete the record
            const { error } = await getClient()
                .from('drawing_versions')
                .delete()
                .eq('id', versionId);
            
            if (error) throw error;
            return true;
        }
    };

    // ============================================================================
    // FOLDERS API - Custom folder structures per project
    // ============================================================================

    const FoldersAPI = {
        // Get all folders for a project
        async getByProject(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_folders')
                .select('*')
                .eq('project_id', projectId)
                .order('sort_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Get categories (top-level folders) for a project
        async getCategories(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_folders')
                .select('*')
                .eq('project_id', projectId)
                .eq('folder_type', 'category')
                .is('parent_id', null)
                .order('sort_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Get disciplines within a category
        async getDisciplines(projectId, categoryId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_folders')
                .select('*')
                .eq('project_id', projectId)
                .eq('folder_type', 'discipline')
                .eq('parent_id', categoryId)
                .order('sort_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Create a new folder
        async create(folderData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawing_folders')
                .insert({
                    project_id: folderData.projectId,
                    parent_id: folderData.parentId || null,
                    name: folderData.name,
                    folder_type: folderData.folderType,
                    color: folderData.color || 'bg-gray-100 border-gray-400',
                    sort_order: folderData.sortOrder || 0,
                    is_default: folderData.isDefault || false,
                    created_by: folderData.createdBy
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        // Update a folder
        async update(folderId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const updateData = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.color !== undefined) updateData.color = updates.color;
            if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
            
            const { data, error } = await getClient()
                .from('drawing_folders')
                .update(updateData)
                .eq('id', folderId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        // Delete a folder
        async delete(folderId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('drawing_folders')
                .delete()
                .eq('id', folderId);
            
            if (error) throw error;
            return true;
        },

        // Initialize default folders for a project
        async initializeDefaults(projectId, createdBy) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Check if project already has folders
            const existing = await this.getByProject(projectId);
            if (existing.length > 0) return existing;
            
            // Create default categories
            const permitCategory = await this.create({
                projectId,
                name: 'Permit Drawings',
                folderType: 'category',
                color: 'bg-blue-100 border-blue-500',
                sortOrder: 1,
                isDefault: true,
                createdBy
            });
            
            const shopCategory = await this.create({
                projectId,
                name: 'Shop Drawings',
                folderType: 'category',
                color: 'bg-amber-100 border-amber-500',
                sortOrder: 2,
                isDefault: true,
                createdBy
            });
            
            // Create default permit disciplines
            const permitDisciplines = [
                { name: 'AOR Reference Submittal', color: 'bg-amber-100 border-amber-400' },
                { name: 'Architectural General Submittal', color: 'bg-blue-100 border-blue-400' },
                { name: 'Assembly Book Submittal', color: 'bg-purple-100 border-purple-400' },
                { name: 'Electrical Submittal', color: 'bg-yellow-100 border-yellow-400' },
                { name: 'Fire Alarm Data Submittal', color: 'bg-red-100 border-red-400' },
                { name: 'Fire Alarm Submittal', color: 'bg-red-100 border-red-400' },
                { name: 'Fire Sprinkler Submittal', color: 'bg-orange-100 border-orange-400' },
                { name: 'Mechanical Submittal', color: 'bg-cyan-100 border-cyan-400' },
                { name: 'Modular Architect Submittal', color: 'bg-indigo-100 border-indigo-400' },
                { name: 'Plumbing Submittal', color: 'bg-teal-100 border-teal-400' },
                { name: 'Sprinkler Submittal Plans', color: 'bg-orange-100 border-orange-400' },
                { name: 'Structural Documents', color: 'bg-gray-100 border-gray-400' },
                { name: 'Structural Plans Submittal', color: 'bg-slate-100 border-slate-400' },
                { name: 'Title 24', color: 'bg-green-100 border-green-400' }
            ];
            
            for (let i = 0; i < permitDisciplines.length; i++) {
                await this.create({
                    projectId,
                    parentId: permitCategory.id,
                    name: permitDisciplines[i].name,
                    folderType: 'discipline',
                    color: permitDisciplines[i].color,
                    sortOrder: i + 1,
                    isDefault: true,
                    createdBy
                });
            }
            
            // Create default shop disciplines
            const shopDisciplines = [
                { name: 'Module Packages', color: 'bg-emerald-100 border-emerald-400' },
                { name: 'Soffits', color: 'bg-slate-100 border-slate-400' },
                { name: 'Reference Sheets', color: 'bg-blue-100 border-blue-400' },
                { name: 'Prototype Drawings', color: 'bg-purple-100 border-purple-400' },
                { name: 'Interior Walls', color: 'bg-cyan-100 border-cyan-400' },
                { name: 'End Walls', color: 'bg-teal-100 border-teal-400' },
                { name: 'Corridor Walls', color: 'bg-amber-100 border-amber-400' },
                { name: '3HR Walls', color: 'bg-red-100 border-red-400' }
            ];
            
            for (let i = 0; i < shopDisciplines.length; i++) {
                await this.create({
                    projectId,
                    parentId: shopCategory.id,
                    name: shopDisciplines[i].name,
                    folderType: 'discipline',
                    color: shopDisciplines[i].color,
                    sortOrder: i + 1,
                    isDefault: true,
                    createdBy
                });
            }
            
            return this.getByProject(projectId);
        },

        // Reset folders to defaults (delete all and recreate)
        async resetToDefaults(projectId, createdBy) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Delete all existing folders for this project
            const { error: deleteError } = await getClient()
                .from('drawing_folders')
                .delete()
                .eq('project_id', projectId);
            
            if (deleteError) throw deleteError;
            
            // Recreate defaults (initializeDefaults checks for existing, so we call create directly)
            // Create default categories
            const permitCategory = await this.create({
                projectId,
                name: 'Permit Drawings',
                folderType: 'category',
                color: 'bg-blue-100 border-blue-500',
                sortOrder: 1,
                isDefault: true,
                createdBy
            });
            
            const shopCategory = await this.create({
                projectId,
                name: 'Shop Drawings',
                folderType: 'category',
                color: 'bg-amber-100 border-amber-500',
                sortOrder: 2,
                isDefault: true,
                createdBy
            });
            
            // Create default permit disciplines
            const permitDisciplines = [
                { name: 'AOR Reference Submittal', color: 'bg-amber-100 border-amber-400' },
                { name: 'Architectural General Submittal', color: 'bg-blue-100 border-blue-400' },
                { name: 'Assembly Book Submittal', color: 'bg-purple-100 border-purple-400' },
                { name: 'Electrical Submittal', color: 'bg-yellow-100 border-yellow-400' },
                { name: 'Fire Alarm Data Submittal', color: 'bg-red-100 border-red-400' },
                { name: 'Fire Alarm Submittal', color: 'bg-red-100 border-red-400' },
                { name: 'Fire Sprinkler Submittal', color: 'bg-orange-100 border-orange-400' },
                { name: 'Mechanical Submittal', color: 'bg-cyan-100 border-cyan-400' },
                { name: 'Modular Architect Submittal', color: 'bg-indigo-100 border-indigo-400' },
                { name: 'Plumbing Submittal', color: 'bg-teal-100 border-teal-400' },
                { name: 'Sprinkler Submittal Plans', color: 'bg-orange-100 border-orange-400' },
                { name: 'Structural Documents', color: 'bg-gray-100 border-gray-400' },
                { name: 'Structural Plans Submittal', color: 'bg-slate-100 border-slate-400' },
                { name: 'Title 24', color: 'bg-green-100 border-green-400' }
            ];
            
            for (let i = 0; i < permitDisciplines.length; i++) {
                await this.create({
                    projectId,
                    parentId: permitCategory.id,
                    name: permitDisciplines[i].name,
                    folderType: 'discipline',
                    color: permitDisciplines[i].color,
                    sortOrder: i + 1,
                    isDefault: true,
                    createdBy
                });
            }
            
            // Create default shop disciplines
            const shopDisciplines2 = [
                { name: 'Module Packages', color: 'bg-emerald-100 border-emerald-400' },
                { name: 'Soffits', color: 'bg-slate-100 border-slate-400' },
                { name: 'Reference Sheets', color: 'bg-blue-100 border-blue-400' },
                { name: 'Prototype Drawings', color: 'bg-purple-100 border-purple-400' },
                { name: 'Interior Walls', color: 'bg-cyan-100 border-cyan-400' },
                { name: 'End Walls', color: 'bg-teal-100 border-teal-400' },
                { name: 'Corridor Walls', color: 'bg-amber-100 border-amber-400' },
                { name: '3HR Walls', color: 'bg-red-100 border-red-400' }
            ];
            
            for (let i = 0; i < shopDisciplines2.length; i++) {
                await this.create({
                    projectId,
                    parentId: shopCategory.id,
                    name: shopDisciplines2[i].name,
                    folderType: 'discipline',
                    color: shopDisciplines2[i].color,
                    sortOrder: i + 1,
                    isDefault: true,
                    createdBy
                });
            }
            
            return this.getByProject(projectId);
        },

        // Get or create Module Packages folder under Shop Drawings
        async getOrCreateModulePackagesFolder(projectId, createdBy) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Find Shop Drawings category
            const folders = await this.getByProject(projectId);
            const shopCategory = folders.find(f => f.name === 'Shop Drawings' && f.folder_type === 'category');
            
            if (!shopCategory) {
                throw new Error('Shop Drawings category not found. Initialize defaults first.');
            }
            
            // Check if Module Packages folder exists
            let modulePackagesFolder = folders.find(f => 
                f.name === 'Module Packages' && 
                f.parent_id === shopCategory.id
            );
            
            if (!modulePackagesFolder) {
                // Create Module Packages folder
                modulePackagesFolder = await this.create({
                    projectId,
                    parentId: shopCategory.id,
                    name: 'Module Packages',
                    folderType: 'discipline',
                    color: 'bg-emerald-100 border-emerald-400',
                    sortOrder: 0,
                    isDefault: true,
                    createdBy
                });
                console.log('[Drawings] Created Module Packages folder:', modulePackagesFolder.id);
            }
            
            return modulePackagesFolder;
        },

        // Create a module package folder
        async createModulePackage(projectId, module, createdBy) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Get or create Module Packages parent folder
            const modulePackagesFolder = await this.getOrCreateModulePackagesFolder(projectId, createdBy);
            
            // Build folder name: "serialNumber | hitchBLM / rearBLM" or just serial if no BLMs
            const hitchBLM = module.hitchBLM || '';
            const rearBLM = module.rearBLM || '';
            let folderName = module.serialNumber;
            
            if (hitchBLM && rearBLM && hitchBLM !== rearBLM) {
                folderName = `${module.serialNumber} | ${hitchBLM} / ${rearBLM}`;
            } else if (hitchBLM || rearBLM) {
                folderName = `${module.serialNumber} | ${hitchBLM || rearBLM}`;
            }
            
            // Check if folder already exists
            const existingFolders = await this.getByProject(projectId);
            const existingFolder = existingFolders.find(f => 
                f.parent_id === modulePackagesFolder.id && 
                f.name === folderName
            );
            
            if (existingFolder) {
                console.log('[Drawings] Module package folder already exists:', folderName);
                return { folder: existingFolder, created: false };
            }
            
            // Create the module folder
            const moduleFolder = await this.create({
                projectId,
                parentId: modulePackagesFolder.id,
                name: folderName,
                folderType: 'module',
                color: 'bg-gray-100 border-gray-400',
                sortOrder: parseInt(module.buildSequence) || 0,
                isDefault: false,
                createdBy
            });
            
            console.log('[Drawings] Created module package folder:', folderName);
            return { folder: moduleFolder, created: true };
        },

        // Generate all module package folders for a project
        async generateAllModulePackages(projectId, modules, createdBy) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!modules || modules.length === 0) return { created: 0, skipped: 0 };
            
            let created = 0;
            let skipped = 0;
            
            for (const module of modules) {
                if (!module.serialNumber) continue;
                
                try {
                    const result = await this.createModulePackage(projectId, module, createdBy);
                    if (result.created) created++;
                    else skipped++;
                } catch (err) {
                    console.error('[Drawings] Error creating module package:', module.serialNumber, err);
                }
            }
            
            console.log('[Drawings] Generated module packages:', created, 'created,', skipped, 'skipped');
            return { created, skipped };
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const Utils = {
        // Calculate next version number
        getNextVersion(versions) {
            if (!versions || versions.length === 0) return '1.0';
            
            const latestVersion = versions.reduce((max, v) => {
                const num = parseFloat(v.version) || 0;
                return num > max ? num : max;
            }, 0);
            
            return (latestVersion + 1).toFixed(1);
        },

        // Format file size for display
        formatFileSize(bytes) {
            if (!bytes) return 'Unknown';
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        },

        // Format date for display
        formatDate(dateString) {
            if (!dateString) return 'Unknown';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // Parse module identifier from filename
        // Supports formats: B1L2M15, B1-L2-M15, B1_L2_M15, Module B1L2M15, etc.
        parseModuleFromFilename(filename) {
            if (!filename) return null;
            
            // Common module patterns:
            // B1L2M15, B1-L2-M15, B1_L2_M15 (Building-Level-Module)
            // M15, M-15, Module15, Module-15
            // Also handle with prefixes like "Shops - B1L2M15.pdf"
            
            const patterns = [
                // Full format: B1L2M15 or B1-L2-M15 or B1_L2_M15
                /\b([Bb]\d+[_\-]?[Ll]\d+[_\-]?[Mm]\d+)\b/,
                // Level-Module format: L2M15 or L2-M15
                /\b([Ll]\d+[_\-]?[Mm]\d+)\b/,
                // Simple module: M15 or M-15 or Module15
                /\b[Mm](?:odule)?[_\-]?(\d+)\b/,
                // Just numbers after common prefixes
                /(?:module|mod|unit)[_\-\s]*(\d+)/i
            ];
            
            for (const pattern of patterns) {
                const match = filename.match(pattern);
                if (match) {
                    // Normalize the result (uppercase, remove separators for consistency)
                    let moduleId = match[1] || match[0];
                    moduleId = moduleId.toUpperCase().replace(/[_\-]/g, '');
                    return moduleId;
                }
            }
            
            return null;
        },

        // Find matching module from project modules list
        findMatchingModule(filename, modules) {
            const parsedId = this.parseModuleFromFilename(filename);
            if (!parsedId || !modules || !modules.length) return null;
            
            // Try to find exact match first
            let match = modules.find(m => {
                const moduleId = (m.moduleId || m.module_id || '').toUpperCase().replace(/[_\-]/g, '');
                return moduleId === parsedId;
            });
            
            if (match) return match;
            
            // Try partial match (e.g., M15 matches B1L2M15)
            if (parsedId.startsWith('M') || /^\d+$/.test(parsedId)) {
                const moduleNum = parsedId.replace(/\D/g, '');
                match = modules.find(m => {
                    const mId = (m.moduleId || m.module_id || '');
                    return mId.toUpperCase().includes('M' + moduleNum);
                });
            }
            
            return match || null;
        },

        // Generate versioned filename for SharePoint (handles duplicates)
        generateVersionedFilename(originalName, existingVersions) {
            if (!existingVersions || existingVersions.length === 0) {
                return originalName;
            }
            
            // Extract base name and extension
            const lastDot = originalName.lastIndexOf('.');
            const baseName = lastDot > 0 ? originalName.substring(0, lastDot) : originalName;
            const extension = lastDot > 0 ? originalName.substring(lastDot) : '';
            
            // Find highest version number for this base filename
            let maxVersion = 0;
            const versionPattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:_v(\\d+))?${extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            
            existingVersions.forEach(v => {
                const fileName = v.file_name || v.fileName || '';
                const match = fileName.match(versionPattern);
                if (match) {
                    const ver = match[1] ? parseInt(match[1]) : 1;
                    if (ver > maxVersion) maxVersion = ver;
                }
            });
            
            // Return versioned filename
            return `${baseName}_v${maxVersion + 1}${extension}`;
        }
    };

    // ============================================================================
    // ACTIVITY LOG API
    // ============================================================================

    const ActivityAPI = {
        // Log a drawing activity
        async log(activityData) {
            if (!isAvailable()) return null;
            
            try {
                const { data, error } = await getClient()
                    .from('drawing_activity')
                    .insert({
                        action: activityData.action,
                        drawing_id: activityData.drawing_id,
                        project_id: activityData.project_id,
                        user_name: activityData.user_name,
                        user_id: activityData.user_id,
                        details: activityData.details,
                        created_at: activityData.created_at || new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.warn('[Drawings] Activity log insert error:', error);
                    return null;
                }
                return data;
            } catch (e) {
                console.warn('[Drawings] Activity log error:', e);
                return null;
            }
        },
        
        // Get activity log for a drawing
        async getByDrawing(drawingId, limit = 50) {
            if (!isAvailable()) return [];
            
            const { data, error } = await getClient()
                .from('drawing_activity')
                .select('*')
                .eq('drawing_id', drawingId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.warn('[Drawings] Activity fetch error:', error);
                return [];
            }
            return data || [];
        },
        
        // Get activity log for a project
        async getByProject(projectId, limit = 100) {
            if (!isAvailable()) return [];
            
            const { data, error } = await getClient()
                .from('drawing_activity')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.warn('[Drawings] Activity fetch error:', error);
                return [];
            }
            return data || [];
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Admin utility to clear Supabase Storage files
    const AdminUtils = {
        // Clear all files from Supabase Storage bucket
        async clearSupabaseStorage() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            console.log('[Admin] Listing files in drawings bucket...');
            
            // List all files in the bucket
            const { data: files, error: listError } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .list('', { limit: 1000 });
            
            if (listError) {
                console.error('[Admin] Error listing files:', listError);
                throw listError;
            }
            
            if (!files || files.length === 0) {
                console.log('[Admin] No files found in storage bucket');
                return { deleted: 0 };
            }
            
            console.log(`[Admin] Found ${files.length} files to delete`);
            
            // Get all file paths (including nested folders)
            const allPaths = [];
            for (const file of files) {
                if (file.id) {
                    // It's a file
                    allPaths.push(file.name);
                } else {
                    // It's a folder, list its contents
                    const { data: folderFiles } = await getClient()
                        .storage
                        .from(STORAGE_BUCKET)
                        .list(file.name, { limit: 1000 });
                    
                    if (folderFiles) {
                        folderFiles.forEach(f => {
                            if (f.id) allPaths.push(`${file.name}/${f.name}`);
                        });
                    }
                }
            }
            
            if (allPaths.length === 0) {
                console.log('[Admin] No files to delete');
                return { deleted: 0 };
            }
            
            console.log(`[Admin] Deleting ${allPaths.length} files...`);
            
            // Delete all files
            const { error: deleteError } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .remove(allPaths);
            
            if (deleteError) {
                console.error('[Admin] Error deleting files:', deleteError);
                throw deleteError;
            }
            
            console.log(`[Admin] Successfully deleted ${allPaths.length} files from Supabase Storage`);
            return { deleted: allPaths.length, paths: allPaths };
        },

        // Delete drawing version records that used Supabase storage
        async clearSupabaseVersionRecords() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Find versions stored in Supabase
            const { data: versions, error: findError } = await getClient()
                .from('drawing_versions')
                .select('id, file_name, storage_path, storage_type')
                .or('storage_type.eq.supabase,storage_type.is.null')
                .not('storage_path', 'like', 'sharepoint:%');
            
            if (findError) throw findError;
            
            if (!versions || versions.length === 0) {
                console.log('[Admin] No Supabase version records found');
                return { deleted: 0 };
            }
            
            console.log(`[Admin] Found ${versions.length} Supabase version records to delete`);
            
            // Delete the records
            const ids = versions.map(v => v.id);
            const { error: deleteError } = await getClient()
                .from('drawing_versions')
                .delete()
                .in('id', ids);
            
            if (deleteError) throw deleteError;
            
            console.log(`[Admin] Deleted ${versions.length} version records`);
            return { deleted: versions.length, versions };
        },

        // Full cleanup: storage files + database records
        async fullCleanup() {
            console.log('[Admin] Starting full Supabase cleanup...');
            
            const storageResult = await this.clearSupabaseStorage();
            const recordsResult = await this.clearSupabaseVersionRecords();
            
            console.log('[Admin] Cleanup complete!');
            console.log(`  - Storage files deleted: ${storageResult.deleted}`);
            console.log(`  - Database records deleted: ${recordsResult.deleted}`);
            
            return {
                storageFilesDeleted: storageResult.deleted,
                recordsDeleted: recordsResult.deleted
            };
        }
    };

    window.MODA_SUPABASE_DRAWINGS = {
        isAvailable,
        disciplines: DisciplinesAPI,
        drawings: DrawingsAPI,
        versions: VersionsAPI,
        folders: FoldersAPI,
        activity: ActivityAPI,
        utils: Utils,
        admin: AdminUtils
    };

    console.log('[Supabase Drawings] Module initialized');
})();
