// ============================================================================
// QA Photo Hub - Photos Panel
// Module-level photo upload, organization, and export
// ============================================================================

const { useState, useEffect, useCallback, useMemo, useRef } = React;

const QA_DEFAULT_CATEGORIES_KEY = 'qa_default_categories';
const DEFAULT_CATEGORIES_FALLBACK = ['General'];

function PhotosPanel({ project, modules, currentUser, isAdmin }) {
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('General');
    const [categories, setCategories] = useState(['General']);
    const [categoryFolderIds, setCategoryFolderIds] = useState({});
    const [moduleSharepointUrl, setModuleSharepointUrl] = useState(null);
    const [settingUpFolders, setSettingUpFolders] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [categoryError, setCategoryError] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const [search, setSearch] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(null);
    const fileInputRef = useRef(null);

    const supabase = () => window.MODA_SUPABASE?.client;
    const sharepoint = () => window.MODA_SHAREPOINT_ATTACHMENTS;
    const photoUtils = () => window.MODA_PHOTO;

    const showToast = (message, type = 'success') => {
        if (window.MODA_TOAST) {
            window.MODA_TOAST[type === 'success' ? 'success' : 'error'](message);
        } else if (type === 'error') {
            alert(message);
        }
    };

    const moduleSerial = useMemo(() => {
        return selectedModule?.serialNumber || selectedModule?.serial_number || selectedModule?.name || '';
    }, [selectedModule]);

    const getDefaultCategories = useCallback(async () => {
        const client = supabase();
        if (!client) return [...DEFAULT_CATEGORIES_FALLBACK];
        try {
            const { data, error } = await client
                .from('app_settings')
                .select('value')
                .eq('key', QA_DEFAULT_CATEGORIES_KEY)
                .single();
            if (error || !data) return [...DEFAULT_CATEGORIES_FALLBACK];
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.filter(c => typeof c === 'string' && c.trim() !== '');
            }
        } catch (e) {
            console.warn('[PhotosPanel] Could not load default categories:', e);
        }
        return [...DEFAULT_CATEGORIES_FALLBACK];
    }, []);

    const getModuleId = useCallback(async () => {
        if (!selectedModule?.id && !moduleSerial) return null;
        const client = supabase();
        if (!client || !project?.id || !moduleSerial) return selectedModule?.id || null;
        try {
            const { data, error } = await client
                .from('modules')
                .select('id')
                .eq('project_id', project.id)
                .eq('serial_number', moduleSerial)
                .single();
            if (error || !data) return selectedModule?.id || null;
            return data.id;
        } catch (err) {
            return selectedModule?.id || null;
        }
    }, [selectedModule, moduleSerial, project?.id]);

    const loadModuleSharePointUrl = useCallback(async (folderId) => {
        if (!folderId) return;
        const spa = sharepoint();
        if (!spa?.isAvailable()) return;
        try {
            const url = await spa.getViewUrl(folderId);
            if (url) setModuleSharepointUrl(url);
        } catch (err) {
            console.warn('[PhotosPanel] Could not get module folder URL:', err);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        if (!project?.name || !moduleSerial) return;
        const spa = sharepoint();
        if (!spa?.isAvailable()) {
            setCategories([...DEFAULT_CATEGORIES_FALLBACK]);
            return;
        }

        const parseFolders = (items) => {
            const folderItems = (items || []).filter(item => item.folder);
            const folderNames = folderItems.map(item => item.name).filter(name => name && name !== '');
            const folderIds = {};
            folderItems.forEach(item => {
                if (item.name && item.id) folderIds[item.name] = item.id;
            });
            return { folderNames, folderIds, folderItems };
        };

        try {
            const folderPath = spa.buildQAPhotoPath(project.name, moduleSerial, '');
            let items = await spa.listFiles(folderPath);
            let { folderNames, folderIds } = parseFolders(items);

            // Auto-create default folders if the module folder is empty
            if (folderNames.length === 0) {
                setSettingUpFolders(true);
                try {
                    const defaults = await getDefaultCategories();
                    for (const cat of defaults) {
                        if (!cat) continue;
                        try {
                            await spa.ensureQAPhotoFolder(project.name, moduleSerial, cat);
                        } catch (err) {
                            console.warn('[PhotosPanel] Could not ensure default folder:', cat, err);
                        }
                    }
                    items = await spa.listFiles(folderPath);
                    const parsed = parseFolders(items);
                    folderNames = parsed.folderNames;
                    folderIds = parsed.folderIds;
                } catch (err) {
                    console.warn('[PhotosPanel] Error setting up default folders:', err);
                } finally {
                    setSettingUpFolders(false);
                }
            }

            setCategoryFolderIds(folderIds);
            setCategories(folderNames.length > 0 ? folderNames : [...DEFAULT_CATEGORIES_FALLBACK]);

            setSelectedCategory(prev => {
                const list = folderNames.length > 0 ? folderNames : ['General'];
                return list.includes(prev) ? prev : list[0];
            });

            // Try to get module root folder id for SharePoint link
            try {
                // Each child in the list result has a parentReference pointing to the module root folder
                const rootFolderId = items && items[0]?.parentReference?.id;
                if (rootFolderId) {
                    await loadModuleSharePointUrl(rootFolderId);
                }
            } catch (err) {
                console.warn('[PhotosPanel] Could not get module folder id:', err);
            }
        } catch (err) {
            console.warn('[PhotosPanel] Could not load categories:', err);
            setCategories([...DEFAULT_CATEGORIES_FALLBACK]);
            setSettingUpFolders(false);
        }
    }, [project?.name, moduleSerial, getDefaultCategories, loadModuleSharePointUrl]);

    const loadPhotos = useCallback(async () => {
        if (!moduleSerial || !selectedCategory) return;
        setLoadingPhotos(true);
        try {
            const client = supabase();
            if (client) {
                const { data, error } = await client
                    .from('module_photos')
                    .select('*')
                    .eq('serial_number', moduleSerial)
                    .eq('category', selectedCategory)
                    .order('uploaded_at', { ascending: false });
                if (error) throw error;
                setPhotos(data || []);
            } else {
                setPhotos([]);
            }
        } catch (err) {
            console.error('[PhotosPanel] Error loading photos:', err);
            setPhotos([]);
        } finally {
            setLoadingPhotos(false);
        }
    }, [moduleSerial, selectedCategory]);

    useEffect(() => {
        if (selectedModule) {
            loadCategories();
        } else {
            setCategories([...DEFAULT_CATEGORIES_FALLBACK]);
            setPhotos([]);
            setModuleSharepointUrl(null);
            setCategoryFolderIds({});
        }
    }, [selectedModule, loadCategories]);

    useEffect(() => {
        if (selectedModule) {
            loadPhotos();
        }
    }, [selectedModule, selectedCategory, loadPhotos]);

    const filteredModules = useMemo(() => {
        if (!search.trim()) return modules || [];
        const term = search.toLowerCase();
        return (modules || []).filter(m => {
            const serial = String(m.serialNumber || m.serial_number || m.name || '').toLowerCase();
            const blm = String(m.blmId || m.blm_id || '').toLowerCase();
            return serial.includes(term) || blm.includes(term);
        });
    }, [modules, search]);

    const handleModuleSelect = (module) => {
        setSelectedModule(module);
        setSelectedCategory('General');
        setSearch('');
        setModuleSharepointUrl(null);
        setCategoryFolderIds({});
        setEditingCategory(null);
        setCategoryError('');
    };

    const getFileExtension = (file) => {
        if (file?.name) {
            const parts = file.name.split('.');
            if (parts.length > 1) return parts.pop().toLowerCase();
        }
        return 'jpg';
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !selectedModule || !project?.name) return;

        const spa = sharepoint();
        const utils = photoUtils();
        if (!spa?.isAvailable() || !utils) {
            alert('Photo upload is not available right now.');
            return;
        }

        setUploading(true);
        try {
            const resolvedModuleId = await getModuleId();

            for (const file of files) {
                let compressed = await utils.compressImage(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.7
                });

                const sizeKB = utils.getBase64Size(compressed);
                if (sizeKB > 1024) {
                    compressed = await utils.compressToTargetSize(file, 1024);
                }

                const ext = getFileExtension(file);
                const fileName = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;

                const folderPath = await spa.ensureQAPhotoFolder(project.name, moduleSerial, selectedCategory);
                const result = await spa.uploadFile(compressed, folderPath, fileName);

                const client = supabase();
                if (client) {
                    const { data, error } = await client
                        .from('module_photos')
                        .insert({
                            module_id: resolvedModuleId,
                            project_id: project.id,
                            serial_number: moduleSerial,
                            category: selectedCategory,
                            sharepoint_file_id: result.id,
                            sharepoint_url: result.webUrl,
                            sharepoint_path: `${folderPath}/${result.name}`,
                            file_name: result.name,
                            file_size: result.size,
                            uploaded_by: currentUser?.id,
                            uploaded_at: new Date().toISOString(),
                            sync_status: 'synced'
                        })
                        .select()
                        .single();
                    if (error) throw error;
                    setPhotos(prev => [data, ...prev]);
                }
            }
        } catch (err) {
            console.error('[PhotosPanel] Upload error:', err);
            alert('Upload failed: ' + (err.message || 'Unknown error'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !isAdmin) return;
        const name = newCategoryName.trim();
        if (categories.includes(name)) {
            alert('A folder with that name already exists.');
            return;
        }
        const spa = sharepoint();
        if (!spa?.isAvailable()) {
            alert('SharePoint is not available.');
            return;
        }
        try {
            await spa.ensureQAPhotoFolder(project.name, moduleSerial, name);
            setShowNewCategoryInput(false);
            setNewCategoryName('');
            // Refresh folder list and ids, then select the new category
            await loadCategories();
            setSelectedCategory(name);
        } catch (err) {
            console.error('[PhotosPanel] Error creating category:', err);
            alert('Could not create category folder.');
        }
    };

    const canDeletePhoto = (photo) => {
        return isAdmin || photo.uploaded_by === currentUser?.id;
    };

    const handleDeletePhoto = async (photo) => {
        if (!photo) return;
        if (!canDeletePhoto(photo)) {
            alert('You can only delete your own photos.');
            return;
        }
        if (!confirm('Delete this photo?')) return;
        try {
            const spa = sharepoint();
            if (spa?.isAvailable() && photo.sharepoint_file_id) {
                await spa.deleteFile(photo.sharepoint_file_id);
            }
            const client = supabase();
            if (client && photo.id) {
                await client.from('module_photos').delete().eq('id', photo.id);
            }
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (lightbox?.id === photo.id) setLightbox(null);
        } catch (err) {
            console.error('[PhotosPanel] Delete error:', err);
            alert('Delete failed: ' + (err.message || 'Unknown error'));
        }
    };

    const handleRenameCategory = async (oldName, newName) => {
        const trimmed = String(newName || '').trim();
        if (!trimmed || trimmed === oldName) {
            setEditingCategory(null);
            setEditCategoryName('');
            setCategoryError('');
            return;
        }
        if (categories.includes(trimmed)) {
            setCategoryError('A folder with that name already exists');
            return;
        }
        if (uploading || renaming) {
            setCategoryError('Please wait for the current operation to finish');
            return;
        }

        setCategoryError('');
        setRenaming(true);
        const spa = sharepoint();
        const client = supabase();
        if (!spa?.isAvailable()) {
            setCategoryError('SharePoint is not available');
            setRenaming(false);
            return;
        }

        let partial = false;
        const movedFileIds = [];

        try {
            // Create the new folder
            const newFolderPath = await spa.ensureQAPhotoFolder(project.name, moduleSerial, trimmed);

            // List files in the old folder
            const oldFolderPath = spa.buildQAPhotoPath(project.name, moduleSerial, oldName);
            const oldFiles = await spa.listFiles(oldFolderPath);
            const fileItems = (oldFiles || []).filter(item => item.file);

            // Move each file by re-uploading
            if (client) {
                for (const file of fileItems) {
                    try {
                        const downloadUrl = await spa.getDownloadUrl(file.id);
                        const response = await fetch(downloadUrl);
                        if (!response.ok) throw new Error('download failed');
                        const blob = await response.blob();
                        const fileObj = new File([blob], file.name, { type: file.file?.mimeType || blob.type || 'image/jpeg' });
                        const result = await spa.uploadFile(fileObj, newFolderPath, file.name);

                        // Update the specific module_photos row by sharepoint_file_id
                        const { data: rows } = await client
                            .from('module_photos')
                            .select('id')
                            .eq('sharepoint_file_id', file.id)
                            .maybeSingle();

                        if (rows) {
                            await client
                                .from('module_photos')
                                .update({
                                    category: trimmed,
                                    sharepoint_file_id: result.id,
                                    sharepoint_url: result.webUrl,
                                    sharepoint_path: `${newFolderPath}/${result.name}`,
                                    file_name: result.name
                                })
                                .eq('id', rows.id);
                        }

                        // Delete the old file now that it has been moved
                        try {
                            await spa.deleteFile(file.id);
                            movedFileIds.push(file.id);
                        } catch (delErr) {
                            console.warn('[PhotosPanel] Could not delete old file:', file.name, delErr);
                        }
                    } catch (fileErr) {
                        console.warn('[PhotosPanel] Could not move file:', file.name, fileErr);
                        partial = true;
                    }
                }

                // If every file moved successfully, update any remaining rows and clean up
                if (!partial && fileItems.length === movedFileIds.length) {
                    const { data: remainingRows, error: remainingError } = await client
                        .from('module_photos')
                        .select('id, sharepoint_path')
                        .eq('serial_number', moduleSerial)
                        .eq('category', oldName);

                    if (!remainingError && remainingRows) {
                        for (const row of remainingRows) {
                            const newPath = row.sharepoint_path
                                ? row.sharepoint_path.replace(oldFolderPath, newFolderPath)
                                : row.sharepoint_path;
                            await client
                                .from('module_photos')
                                .update({ category: trimmed, sharepoint_path: newPath })
                                .eq('id', row.id);
                        }
                    }
                }
            }

            // Delete the old folder only if all files were moved
            if (!partial && fileItems.length === movedFileIds.length) {
                const oldFolderId = categoryFolderIds[oldName];
                if (oldFolderId) {
                    try {
                        await spa.deleteFile(oldFolderId);
                    } catch (delErr) {
                        console.warn('[PhotosPanel] Could not delete old folder:', delErr);
                        partial = true;
                    }
                }

                // Update state: replace old category with new
                setCategories(prev => prev.map(c => c === oldName ? trimmed : c));
                if (selectedCategory === oldName) setSelectedCategory(trimmed);
            } else {
                // Partial: keep old category, add new one
                setCategories(prev => [...new Set([...prev, trimmed])]);
                if (selectedCategory === oldName) setSelectedCategory(trimmed);
            }

            setEditingCategory(null);
            setEditCategoryName('');

            // Refresh folder list and ids
            await loadCategories();

            if (partial) {
                showToast('Rename partially completed — check SharePoint', 'error');
            } else {
                showToast('Category renamed', 'success');
            }
        } catch (err) {
            console.error('[PhotosPanel] Rename error:', err);
            setCategoryError(err.message || 'Rename failed');
            showToast('Rename partially completed — check SharePoint', 'error');
        } finally {
            setRenaming(false);
        }
    };

    const loadJSZip = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (window.JSZip) return resolve(window.JSZip);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error('Could not load JSZip'));
            document.head.appendChild(script);
        });
    }, []);

    const handleExport = async () => {
        if (!selectedModule || !project?.name) return;
        const client = supabase();
        if (!client) {
            alert('Supabase is not available.');
            return;
        }

        setExporting(true);
        try {
            const { data: allPhotos, error } = await client
                .from('module_photos')
                .select('*')
                .eq('serial_number', moduleSerial)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            if (!allPhotos || allPhotos.length === 0) {
                alert('No photos to export.');
                return;
            }

            const JSZip = await loadJSZip();
            const zip = new JSZip();
            const spa = sharepoint();

            setExportProgress({ current: 0, total: allPhotos.length });

            for (let i = 0; i < allPhotos.length; i++) {
                const photo = allPhotos[i];
                setExportProgress({ current: i, total: allPhotos.length });
                try {
                    let blob = null;
                    if (photo.sharepoint_file_id && spa?.isAvailable()) {
                        const downloadUrl = await spa.getDownloadUrl(photo.sharepoint_file_id);
                        const response = await fetch(downloadUrl);
                        if (response.ok) {
                            blob = await response.blob();
                        }
                    } else if (photo.local_data) {
                        const response = await fetch(photo.local_data);
                        blob = await response.blob();
                    }

                    if (blob) {
                        const folder = (photo.category || 'General').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
                        zip.file(`${folder}/${photo.file_name}`, blob);
                    }
                } catch (err) {
                    console.warn('[PhotosPanel] Could not add photo to zip:', photo.id, err);
                }
            }

            setExportProgress({ current: allPhotos.length, total: allPhotos.length });
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QA-${moduleSerial}-photos.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[PhotosPanel] Export error:', err);
            alert('Export failed: ' + (err.message || 'Unknown error'));
        } finally {
            setExporting(false);
            setExportProgress(null);
        }
    };

    if (!selectedModule) {
        return (
            <div className="qa-photos-panel bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--autovol-navy)' }}>
                    QA Photo Hub
                </h2>
                <p className="text-sm text-gray-600 mb-4">Select a module to view or upload QA photos.</p>
                <input
                    type="text"
                    placeholder="Search modules..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredModules.map(m => {
                        const serial = m.serialNumber || m.serial_number || m.name || 'Unknown';
                        const blm = m.blmId || m.blm_id || '';
                        return (
                            <button
                                key={m.id || serial}
                                onClick={() => handleModuleSelect(m)}
                                className="text-left p-4 border rounded-lg hover:bg-gray-50 transition"
                            >
                                <div className="font-semibold text-sm">{serial}</div>
                                {blm && <div className="text-xs text-gray-500">BLM: {blm}</div>}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="qa-photos-panel bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedModule(null)}
                        className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-100"
                    >
                        ← Back
                    </button>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--autovol-navy)' }}>
                        Module: {moduleSerial}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {settingUpFolders && (
                        <span className="text-xs text-gray-500">Setting up folders...</span>
                    )}
                    {moduleSharepointUrl && (
                        <a
                            href={moduleSharepointUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                        >
                            Open in SharePoint ↗
                        </a>
                    )}
                </div>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-4 border-b pb-2">
                {categories.map(cat => (
                    <div key={cat} className="relative group">
                        {editingCategory === cat ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={editCategoryName}
                                    onChange={(e) => { setEditCategoryName(e.target.value); setCategoryError(''); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameCategory(cat, editCategoryName);
                                        if (e.key === 'Escape') { setEditingCategory(null); setEditCategoryName(''); setCategoryError(''); }
                                    }}
                                    className={`px-2 py-1 text-sm border rounded ${categoryError ? 'border-red-500' : ''}`}
                                    autoFocus
                                    disabled={uploading || renaming}
                                />
                                <button
                                    onClick={() => handleRenameCategory(cat, editCategoryName)}
                                    className="px-1.5 py-1 text-sm text-teal-600"
                                    disabled={uploading || renaming}
                                >
                                    ✓
                                </button>
                                <button
                                    onClick={() => { setEditingCategory(null); setEditCategoryName(''); setCategoryError(''); }}
                                    className="px-1.5 py-1 text-sm text-gray-500"
                                    disabled={uploading || renaming}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { if (!renaming && editingCategory === null) setSelectedCategory(cat); }}
                                disabled={renaming || editingCategory !== null}
                                className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selectedCategory === cat
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {cat}
                                {isAdmin && !renaming && editingCategory === null && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!uploading) {
                                                setEditingCategory(cat);
                                                setEditCategoryName(cat);
                                                setCategoryError('');
                                            }
                                        }}
                                        className={`ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                                            selectedCategory === cat ? 'text-white hover:text-blue-200' : 'text-gray-400 hover:text-blue-500'
                                        }`}
                                        title="Rename category"
                                    >
                                        ✎
                                    </span>
                                )}
                            </button>
                        )}
                        {editingCategory === cat && categoryError && (
                            <span className="absolute left-0 -bottom-5 text-xs text-red-600 whitespace-nowrap">{categoryError}</span>
                        )}
                    </div>
                ))}
                {isAdmin && (
                    <>
                        {showNewCategoryInput ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="New category"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    className="px-2 py-1 text-sm border rounded"
                                />
                                <button onClick={handleAddCategory} className="px-2 py-1 text-sm bg-teal-600 text-white rounded">Add</button>
                                <button onClick={() => setShowNewCategoryInput(false)} className="px-2 py-1 text-sm border rounded">Cancel</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { if (!renaming) setShowNewCategoryInput(true); }}
                                disabled={renaming}
                                className="px-3 py-1.5 text-sm rounded-lg border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            >
                                + Add
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Upload */}
            <div className="mb-4">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || renaming}
                    className="w-full sm:w-auto px-4 py-3 bg-teal-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {uploading ? 'Uploading...' : renaming ? 'Renaming...' : '📷 Upload Photos'}
                </button>
            </div>

            {/* Photo grid */}
            {loadingPhotos ? (
                <div className="text-center py-8 text-gray-500">Loading photos...</div>
            ) : photos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No photos in {selectedCategory} yet.</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {photos.map(photo => (
                        <div
                            key={photo.id}
                            onClick={() => setLightbox(photo)}
                            className="aspect-square border rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-teal-500"
                        >
                            <img
                                src={photo.local_data || photo.thumbnail_url || photo.sharepoint_url || ''}
                                alt={photo.caption || photo.file_name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Export */}
            <div className="mt-6 pt-4 border-t">
                <button
                    onClick={handleExport}
                    disabled={exporting || renaming}
                    className="w-full sm:w-auto px-4 py-2 border border-teal-600 text-teal-700 rounded-lg font-medium hover:bg-teal-50 disabled:opacity-50"
                >
                    {exporting ? `Exporting ${exportProgress?.current || 0} of ${exportProgress?.total || 0}` : '↓ Export This Module\'s Photos'}
                </button>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
                        <img
                            src={lightbox.local_data || lightbox.sharepoint_url || ''}
                            alt={lightbox.caption || lightbox.file_name}
                            className="w-full max-h-[60vh] object-contain mb-4"
                        />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">{lightbox.file_name}</p>
                                {lightbox.caption && <p className="text-sm text-gray-600">{lightbox.caption}</p>}
                                <p className="text-xs text-gray-500">
                                    Uploaded {lightbox.uploaded_at ? new Date(lightbox.uploaded_at).toLocaleString() : 'unknown'}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDeletePhoto(lightbox)}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

window.PhotosPanel = PhotosPanel;
