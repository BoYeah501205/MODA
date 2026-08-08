// ============================================================================
// QA Photo Hub - Default Category Template Editor
// Admin panel editor for qa_default_categories in app_settings
// ============================================================================

const { useState, useEffect, useCallback } = React;

const QA_DEFAULT_CATEGORIES_KEY = 'qa_default_categories';
const FALLBACK_CATEGORIES = ['General', 'Pre-Pour', 'Post-Pour', 'Final Inspection', 'Punch List'];

function QACategoryTemplateEditor() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [errors, setErrors] = useState({});

    const supabase = () => window.MODA_SUPABASE?.client;

    const showToast = (message, type = 'success') => {
        if (window.MODA_TOAST) {
            window.MODA_TOAST[type === 'success' ? 'success' : 'error'](message);
        } else if (window.MODA_DEBUG) {
            console.log(`[QACategoryTemplateEditor] ${type}:`, message);
        }
    };

    const loadCategories = useCallback(async () => {
        setLoading(true);
        try {
            const client = supabase();
            if (!client) {
                setCategories([...FALLBACK_CATEGORIES]);
                return;
            }
            const { data, error } = await client
                .from('app_settings')
                .select('key, value')
                .eq('key', QA_DEFAULT_CATEGORIES_KEY)
                .single();

            if (error || !data) {
                setCategories([...FALLBACK_CATEGORIES]);
            } else {
                try {
                    const parsed = JSON.parse(data.value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCategories(parsed.filter(c => typeof c === 'string' && c.trim() !== ''));
                    } else {
                        setCategories([...FALLBACK_CATEGORIES]);
                    }
                } catch (e) {
                    setCategories([...FALLBACK_CATEGORIES]);
                }
            }
        } catch (err) {
            console.error('[QACategoryTemplateEditor] Load error:', err);
            setCategories([...FALLBACK_CATEGORIES]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const validateCategories = (list) => {
        const newErrors = {};
        const seen = new Set();
        list.forEach((cat, i) => {
            const trimmed = String(cat || '').trim();
            if (!trimmed) {
                newErrors[i] = 'Category name cannot be empty';
            } else if (seen.has(trimmed.toLowerCase())) {
                newErrors[i] = 'Duplicate category name';
            } else {
                seen.add(trimmed.toLowerCase());
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateCategories(categories)) {
            showToast('Please fix validation errors before saving', 'error');
            return;
        }
        const cleaned = categories.map(c => String(c || '').trim()).filter(c => c !== '');

        setSaving(true);
        try {
            const client = supabase();
            if (!client) throw new Error('Supabase client not available');

            const { error } = await client
                .from('app_settings')
                .upsert({
                    key: QA_DEFAULT_CATEGORIES_KEY,
                    value: JSON.stringify(cleaned),
                    description: 'Default QA photo category folders for every new module',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
            showToast('QA Photo Categories template saved', 'success');
        } catch (err) {
            console.error('[QACategoryTemplateEditor] Save error:', err);
            showToast('Failed to save template', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = () => {
        setCategories(prev => [...prev, '']);
        setEditingIndex(categories.length);
        setEditValue('');
    };

    const handleDelete = (index) => {
        setCategories(prev => prev.filter((_, i) => i !== index));
        setErrors(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const handleEditStart = (index) => {
        setEditingIndex(index);
        setEditValue(categories[index] || '');
    };

    const handleEditConfirm = () => {
        const trimmed = editValue.trim();
        if (editingIndex === null) return;

        setCategories(prev => {
            const next = [...prev];
            next[editingIndex] = trimmed;
            return next;
        });

        setTimeout(() => validateCategories(categories.map((c, i) => i === editingIndex ? trimmed : c)), 0);
        setEditingIndex(null);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    if (loading) {
        return <p className="text-gray-500">Loading categories...</p>;
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                Default folders created for every new module when the QA Photo Hub opens.
            </p>

            <div className="space-y-2">
                {categories.map((cat, index) => {
                    const isEditing = editingIndex === index;
                    return (
                        <div
                            key={`${cat}-${index}`}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                        >
                            {isEditing ? (
                                <>
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleEditConfirm();
                                            if (e.key === 'Escape') handleEditCancel();
                                        }}
                                        className={`flex-1 px-2 py-1 text-sm border rounded ${errors[index] ? 'border-red-500' : ''}`}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleEditConfirm}
                                        className="px-2 py-1 text-sm bg-teal-600 text-white rounded"
                                        title="Confirm"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={handleEditCancel}
                                        className="px-2 py-1 text-sm border rounded"
                                        title="Cancel"
                                    >
                                        ✕
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className={`flex-1 text-sm ${cat ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                                        {cat || '(blank)'}
                                    </span>
                                    <button
                                        onClick={() => handleEditStart(index)}
                                        className="px-2 py-1 text-sm text-gray-600 hover:text-blue-600"
                                        title="Edit"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="px-2 py-1 text-sm text-gray-600 hover:text-red-600"
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}

                {errors.global && (
                    <p className="text-xs text-red-600">{errors.global}</p>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 text-sm border border-dashed border-gray-400 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                    + Add Category
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Template'}
                </button>
            </div>
        </div>
    );
}

window.QACategoryTemplateEditor = QACategoryTemplateEditor;
