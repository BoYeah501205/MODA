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
        // Get all drawings for a project
        async getByProject(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('drawings')
                .select(`
                    *,
                    versions:drawing_versions(*)
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Get drawings for a specific project and discipline
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
                    .eq('project_id', projectId);
                
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
            
            const { data, error } = await getClient()
                .from('drawings')
                .update({
                    name: updates.name,
                    description: updates.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', drawingId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        // Delete a drawing (cascades to versions)
        async delete(drawingId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // First, get all versions to delete their files from storage
            const { data: versions } = await getClient()
                .from('drawing_versions')
                .select('storage_path')
                .eq('drawing_id', drawingId);
            
            // Delete files from storage
            if (versions && versions.length > 0) {
                const paths = versions.map(v => v.storage_path).filter(Boolean);
                if (paths.length > 0) {
                    await getClient().storage.from(STORAGE_BUCKET).remove(paths);
                }
            }
            
            // Delete the drawing (versions cascade)
            const { error } = await getClient()
                .from('drawings')
                .delete()
                .eq('id', drawingId);
            
            if (error) throw error;
            console.log('[Drawings] Deleted drawing:', drawingId);
            return true;
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

        // Create a new version (with file upload)
        async create(drawingId, file, versionData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Generate storage path
            const timestamp = Date.now();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `${drawingId}/${timestamp}_${sanitizedName}`;
            
            // Upload file to storage
            const { data: uploadData, error: uploadError } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error('[Drawings] Upload error:', uploadError);
                throw uploadError;
            }
            
            // Get public URL (or signed URL for private bucket)
            const { data: urlData } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry
            
            const fileUrl = urlData?.signedUrl || '';
            
            // Create version record
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
                    notes: versionData.notes || '',
                    uploaded_by: versionData.uploadedBy || 'Unknown'
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Drawings] Created version:', data.id);
            return data;
        },

        // Get download URL for a version
        async getDownloadUrl(storagePath) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(storagePath, 60 * 60); // 1 hour expiry
            
            if (error) throw error;
            return data?.signedUrl;
        },

        // Delete a specific version
        async delete(versionId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Get the version to find storage path
            const { data: version } = await getClient()
                .from('drawing_versions')
                .select('storage_path')
                .eq('id', versionId)
                .single();
            
            // Delete from storage
            if (version?.storage_path) {
                await getClient().storage.from(STORAGE_BUCKET).remove([version.storage_path]);
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
            const shopDisciplines = [
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
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_SUPABASE_DRAWINGS = {
        isAvailable,
        disciplines: DisciplinesAPI,
        drawings: DrawingsAPI,
        versions: VersionsAPI,
        folders: FoldersAPI,
        utils: Utils
    };

    console.log('[Supabase Drawings] Module initialized');
})();
