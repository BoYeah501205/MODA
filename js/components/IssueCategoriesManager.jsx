/**
 * Issue Categories Manager for MODA
 * 
 * Admin component to manage issue categories per issue type.
 * Categories are stored in Supabase and used in the Issue Submission Modal.
 */

const { useState, useEffect, useCallback } = React;

// Issue types from the routing system
const ISSUE_TYPES = [
    { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8' },
    { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED' },
    { id: 'material-supply', label: 'Material/Supply', color: '#EA580C' },
    { id: 'quality', label: 'Quality Issue', color: '#DC2626' },
    { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2' },
    { id: 'rfi', label: 'RFI Required', color: '#4F46E5' },
    { id: 'other', label: 'Other', color: '#6B7280' }
];

function IssueCategoriesManager({ auth }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIssueType, setSelectedIssueType] = useState('shop-drawing');
    const [editingCategory, setEditingCategory] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });

    // Load categories from Supabase
    const loadCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const supabase = window.MODA_SUPABASE?.client;
            if (!supabase) {
                // Fallback to localStorage
                const saved = localStorage.getItem('moda_issue_categories');
                if (saved) {
                    setCategories(JSON.parse(saved));
                }
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('issue_categories')
                .select('*')
                .order('issue_type')
                .order('sort_order');

            if (fetchError) throw fetchError;
            
            setCategories(data || []);
            // Also cache in localStorage for offline access
            localStorage.setItem('moda_issue_categories', JSON.stringify(data || []));
        } catch (err) {
            console.error('[IssueCategoriesManager] Error loading categories:', err);
            setError('Failed to load categories. Using cached data if available.');
            // Try localStorage fallback
            const saved = localStorage.getItem('moda_issue_categories');
            if (saved) {
                setCategories(JSON.parse(saved));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    // Get categories for selected issue type
    const filteredCategories = categories.filter(c => c.issue_type === selectedIssueType && c.is_active !== false);

    // Add new category
    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            setError('Category name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const supabase = window.MODA_SUPABASE?.client;
            const categoryData = {
                issue_type: selectedIssueType,
                name: newCategory.name.trim(),
                description: newCategory.description.trim() || null,
                sort_order: filteredCategories.length + 1,
                is_active: true,
                created_by: auth?.userId || null
            };

            if (supabase) {
                const { data, error: insertError } = await supabase
                    .from('issue_categories')
                    .insert(categoryData)
                    .select()
                    .single();

                if (insertError) throw insertError;
                
                setCategories(prev => [...prev, data]);
                localStorage.setItem('moda_issue_categories', JSON.stringify([...categories, data]));
            } else {
                // localStorage fallback
                const localCategory = {
                    ...categoryData,
                    id: `local-${Date.now()}`,
                    created_at: new Date().toISOString()
                };
                const updated = [...categories, localCategory];
                setCategories(updated);
                localStorage.setItem('moda_issue_categories', JSON.stringify(updated));
            }

            setNewCategory({ name: '', description: '' });
            setShowAddForm(false);
        } catch (err) {
            console.error('[IssueCategoriesManager] Error adding category:', err);
            setError(err.message || 'Failed to add category');
        } finally {
            setSaving(false);
        }
    };

    // Update category
    const handleUpdateCategory = async (category) => {
        setSaving(true);
        setError(null);

        try {
            const supabase = window.MODA_SUPABASE?.client;
            
            if (supabase) {
                const { error: updateError } = await supabase
                    .from('issue_categories')
                    .update({
                        name: category.name,
                        description: category.description
                    })
                    .eq('id', category.id);

                if (updateError) throw updateError;
            }

            // Update local state
            const updated = categories.map(c => c.id === category.id ? category : c);
            setCategories(updated);
            localStorage.setItem('moda_issue_categories', JSON.stringify(updated));
            setEditingCategory(null);
        } catch (err) {
            console.error('[IssueCategoriesManager] Error updating category:', err);
            setError(err.message || 'Failed to update category');
        } finally {
            setSaving(false);
        }
    };

    // Delete category (soft delete)
    const handleDeleteCategory = async (categoryId) => {
        if (!confirm('Are you sure you want to delete this category?')) return;

        setSaving(true);
        setError(null);

        try {
            const supabase = window.MODA_SUPABASE?.client;
            
            if (supabase) {
                const { error: deleteError } = await supabase
                    .from('issue_categories')
                    .update({ is_active: false })
                    .eq('id', categoryId);

                if (deleteError) throw deleteError;
            }

            // Update local state
            const updated = categories.map(c => 
                c.id === categoryId ? { ...c, is_active: false } : c
            );
            setCategories(updated);
            localStorage.setItem('moda_issue_categories', JSON.stringify(updated));
        } catch (err) {
            console.error('[IssueCategoriesManager] Error deleting category:', err);
            setError(err.message || 'Failed to delete category');
        } finally {
            setSaving(false);
        }
    };

    // Reorder categories
    const handleMoveCategory = async (categoryId, direction) => {
        const currentIndex = filteredCategories.findIndex(c => c.id === categoryId);
        if (currentIndex === -1) return;
        
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= filteredCategories.length) return;

        setSaving(true);
        
        try {
            const supabase = window.MODA_SUPABASE?.client;
            const current = filteredCategories[currentIndex];
            const swap = filteredCategories[newIndex];

            if (supabase) {
                // Swap sort_order values
                await Promise.all([
                    supabase.from('issue_categories').update({ sort_order: swap.sort_order }).eq('id', current.id),
                    supabase.from('issue_categories').update({ sort_order: current.sort_order }).eq('id', swap.id)
                ]);
            }

            // Update local state
            const updated = categories.map(c => {
                if (c.id === current.id) return { ...c, sort_order: swap.sort_order };
                if (c.id === swap.id) return { ...c, sort_order: current.sort_order };
                return c;
            });
            setCategories(updated);
            localStorage.setItem('moda_issue_categories', JSON.stringify(updated));
        } catch (err) {
            console.error('[IssueCategoriesManager] Error reordering:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                    Issue Categories
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Manage categories for each issue type. Categories appear in the Report Issue form.
                </p>
            </div>

            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="p-6">
                {/* Issue Type Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Issue Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ISSUE_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setSelectedIssueType(type.id)}
                                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                                    selectedIssueType === type.id
                                        ? 'border-current bg-opacity-10'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                                style={{
                                    borderColor: selectedIssueType === type.id ? type.color : undefined,
                                    backgroundColor: selectedIssueType === type.id ? `${type.color}15` : undefined,
                                    color: selectedIssueType === type.id ? type.color : '#374151'
                                }}
                            >
                                <span 
                                    className="inline-block w-2 h-2 rounded-full mr-2"
                                    style={{ backgroundColor: type.color }}
                                ></span>
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categories List */}
                <div className="border rounded-lg">
                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                            Categories for {ISSUE_TYPES.find(t => t.id === selectedIssueType)?.label}
                        </h3>
                        <button
                            onClick={() => setShowAddForm(true)}
                            disabled={showAddForm}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            <span>+</span> Add Category
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading categories...</div>
                    ) : (
                        <div className="divide-y">
                            {/* Add Form */}
                            {showAddForm && (
                                <div className="p-4 bg-blue-50">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={newCategory.name}
                                            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Category name"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                        />
                                        <input
                                            type="text"
                                            value={newCategory.description}
                                            onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Description (optional)"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={handleAddCategory}
                                            disabled={saving || !newCategory.name.trim()}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setNewCategory({ name: '', description: '' });
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Category Items */}
                            {filteredCategories.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No categories defined for this issue type.
                                    <br />
                                    <span className="text-sm">Click "Add Category" to create one.</span>
                                </div>
                            ) : (
                                filteredCategories
                                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                                    .map((category, index) => (
                                        <div key={category.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                                            {/* Reorder Buttons */}
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleMoveCategory(category.id, 'up')}
                                                    disabled={index === 0 || saving}
                                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    title="Move up"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleMoveCategory(category.id, 'down')}
                                                    disabled={index === filteredCategories.length - 1 || saving}
                                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    title="Move down"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Category Info */}
                                            {editingCategory?.id === category.id ? (
                                                <div className="flex-1 flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={editingCategory.name}
                                                        onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editingCategory.description || ''}
                                                        onChange={(e) => setEditingCategory(prev => ({ ...prev, description: e.target.value }))}
                                                        placeholder="Description"
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateCategory(editingCategory)}
                                                        disabled={saving}
                                                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingCategory(null)}
                                                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{category.name}</div>
                                                        {category.description && (
                                                            <div className="text-sm text-gray-500">{category.description}</div>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingCategory({ ...category })}
                                                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCategory(category.id)}
                                                            disabled={saving}
                                                            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Export to window for global access
window.IssueCategoriesManager = IssueCategoriesManager;
