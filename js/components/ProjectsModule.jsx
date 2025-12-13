// ============================================================================
// MODA PROJECTS DIRECTORY MODULE
// Extracted from App.jsx for better maintainability
// ============================================================================

        // Projects Directory Component
        function ProjectsDirectory({ projects, setProjects, trashedProjects, setTrashedProjects, onSelectProject, showNewProjectModal, auth, exportData, importData }) {
            const [statusFilter, setStatusFilter] = useState('all');
            const [editMode, setEditMode] = useState(false);
            const [editingProject, setEditingProject] = useState(null);
            const [deleteConfirm, setDeleteConfirm] = useState(null);
            
            const filteredProjects = projects.filter(p => 
                statusFilter === 'all' || p.status === statusFilter
            );

            const statusCounts = {
                'Pre-Construction': projects.filter(p => p.status === 'Pre-Construction').length,
                'Planned': projects.filter(p => p.status === 'Planned').length,
                'Active': projects.filter(p => p.status === 'Active').length,
                'Complete': projects.filter(p => p.status === 'Complete').length
            };

            // Move to trash instead of permanent delete
            const handleDeleteProject = (project) => {
                const trashedProject = {
                    ...project,
                    deletedAt: Date.now(),
                    deletedBy: auth.currentUser?.name || 'Unknown'
                };
                setTrashedProjects([...trashedProjects, trashedProject]);
                setProjects(projects.filter(p => p.id !== project.id));
                setDeleteConfirm(null);
            };

            const handleUpdateProject = (updatedProject) => {
                setProjects(projects.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
                setEditingProject(null);
            };

            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-autovol-navy">Project Directory</h2>
                        <div className="flex items-center gap-2">
                            {auth.isAdmin && (
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                                        editMode 
                                            ? 'bg-gray-800 text-white' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {editMode ? '✓ Done Editing' : '✎ Edit Projects'}
                                </button>
                            )}
                            <button
                                onClick={showNewProjectModal}
                                className="px-4 py-2 btn-primary rounded-lg transition flex items-center gap-2"
                            >
                                <span>+</span> New Project
                            </button>
                        </div>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 rounded-full text-sm ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            All ({projects.length})
                        </button>
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1 rounded-full text-sm ${statusFilter === status ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                {status} ({count})
                            </button>
                        ))}
                    </div>

                    {/* Project Cards */}
                    <div className="grid gap-4">
                        {filteredProjects.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-8 text-center">
                                <p className="text-gray-500">No projects found. Click "New Project" to create one.</p>
                            </div>
                        ) : (
                            filteredProjects.map(project => (
                                <div 
                                    key={project.id}
                                    className={`bg-white rounded-lg shadow p-4 transition ${!editMode ? 'hover:shadow-md cursor-pointer' : ''}`}
                                    onClick={() => !editMode && onSelectProject(project)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{project.name}</h3>
                                            <p className="text-sm text-gray-500">{project.location}</p>
                                            {project.description && (
                                                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-0.5 text-xs rounded ${
                                                    project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                    project.status === 'Complete' ? 'bg-gray-100 text-gray-800' :
                                                    project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600">{project.modules?.length || 0} modules</span>
                                            {editMode && (
                                                <div className="flex gap-2 ml-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingProject(project); }}
                                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Edit Project Modal */}
                    {editingProject && (
                        <EditProjectModal
                            project={editingProject}
                            onClose={() => setEditingProject(null)}
                            onSave={handleUpdateProject}
                        />
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Move to Trash?</h2>
                                <p className="text-gray-600 mb-2">
                                    Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                                </p>
                                {deleteConfirm.modules?.length > 0 && (
                                    <p className="text-orange-600 text-sm mb-4">
                                        ⚠ This project has {deleteConfirm.modules.length} modules that will also be moved to trash.
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 mb-6">
                                    ✓ This project will be moved to Trash and can be restored within 90 days from the Data Management panel.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProject(deleteConfirm)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        Move to Trash
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Edit Project Modal
        function EditProjectModal({ project, onClose, onSave }) {
            const [name, setName] = useState(project.name || '');
            const [location, setLocation] = useState(project.location || '');
            const [description, setDescription] = useState(project.description || '');
            const [status, setStatus] = useState(project.status || 'Pre-Construction');
            const [sharepointSite, setSharepointSite] = useState(project.sharepointSite || 'ProductDevelopmentAutovolPrefab');
            const [sharepointChannel, setSharepointChannel] = useState(project.sharepointChannel || '');
            
            // Shop Drawing Links state - convert existing links object to text format
            const existingLinksText = Object.entries(project.shopDrawingLinks || {})
                .map(([blm, url]) => `${blm}, ${url}`)
                .join('\n');
            const [shopDrawingLinksText, setShopDrawingLinksText] = useState(existingLinksText);
            const [shopDrawingLinksError, setShopDrawingLinksError] = useState('');
            const [parsedLinksCount, setParsedLinksCount] = useState(Object.keys(project.shopDrawingLinks || {}).length);
            
            // Parse shop drawing links from text input
            const parseShopDrawingLinks = (text) => {
                const links = {};
                const lines = text.split('\n').filter(line => line.trim());
                let errorMsg = '';
                
                for (const line of lines) {
                    const parts = line.split(/[,\t]/).map(p => p.trim());
                    if (parts.length >= 2) {
                        const blm = parts[0];
                        const url = parts[1];
                        if (blm && url && url.startsWith('http')) {
                            links[blm] = url;
                        } else if (blm && url && !url.startsWith('http')) {
                            errorMsg = `Invalid URL for BLM "${blm}"`;
                        }
                    }
                }
                
                setShopDrawingLinksError(errorMsg);
                setParsedLinksCount(Object.keys(links).length);
                return links;
            };
            
            const handleLinksTextChange = (text) => {
                setShopDrawingLinksText(text);
                parseShopDrawingLinks(text);
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                onSave({ 
                    ...project, 
                    name: name.trim(), 
                    location: location.trim(), 
                    description: description.trim(), 
                    status, 
                    sharepointSite: sharepointSite.trim(), 
                    sharepointChannel: sharepointChannel.trim(),
                    shopDrawingLinks: parseShopDrawingLinks(shopDrawingLinksText)
                });
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Edit Project</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Building A - Phoenix"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Phoenix, AZ"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief project description..."
                                        className="w-full px-3 py-2 border rounded-lg"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="Pre-Construction">Pre-Construction</option>
                                        <option value="Planned">Planned</option>
                                        <option value="Active">Active</option>
                                        <option value="Complete">Complete</option>
                                    </select>
                                </div>
                                
                                {/* SharePoint Integration */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📋</span> SharePoint Integration
                                        <span className="text-xs font-normal text-gray-500">(for Shop Drawings)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint Site</label>
                                            <input
                                                type="text"
                                                value={sharepointSite}
                                                onChange={(e) => setSharepointSite(e.target.value)}
                                                placeholder="e.g., ProductDevelopmentAutovolPrefab"
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Site name from SharePoint URL</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teams Channel Folder</label>
                                            <input
                                                type="text"
                                                value={sharepointChannel}
                                                onChange={(e) => setSharepointChannel(e.target.value)}
                                                placeholder="e.g., Alvarado Creek - San Diego, CA (TPC)"
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Exact channel name from Teams</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Shop Drawing Links */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📐</span> Shop Drawing Links
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">BLM / URL Mapping</label>
                                        <textarea
                                            value={shopDrawingLinksText}
                                            onChange={(e) => handleLinksTextChange(e.target.value)}
                                            placeholder="B1L2M39, https://sharepoint.com/..."
                                            rows={5}
                                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                        />
                                        <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">Format: BLM, URL (one per line)</p>
                                            {parsedLinksCount > 0 && (
                                                <p className="text-xs text-green-600 font-medium">{parsedLinksCount} links</p>
                                            )}
                                        </div>
                                        {shopDrawingLinksError && (
                                            <p className="text-xs text-red-600 mt-1">{shopDrawingLinksError}</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 justify-end pt-4">
                                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 btn-primary rounded-lg">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            );
        }

        // Data Management Panel (Admin Only)
        function DataManagementPanel({ onClose, projects, setProjects, trashedProjects, setTrashedProjects, employees, setEmployees, trashedEmployees, setTrashedEmployees, exportData, importData }) {
            const [activeTab, setActiveTab] = useState('trash');
            const [trashTab, setTrashTab] = useState('projects');
            const [confirmEmpty, setConfirmEmpty] = useState(false);

            const formatDate = (timestamp) => {
                if (!timestamp) return 'Unknown';
                return new Date(timestamp).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
            };

            const getDaysRemaining = (deletedAt) => {
                const ninetyDays = 90 * 24 * 60 * 60 * 1000;
                const expiresAt = deletedAt + ninetyDays;
                const remaining = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
                return remaining;
            };

            const restoreProject = (project) => {
                const { deletedAt, deletedBy, ...cleanProject } = project;
                setProjects([...projects, cleanProject]);
                setTrashedProjects(trashedProjects.filter(p => p.id !== project.id));
            };

            const restoreEmployee = (employee) => {
                const { deletedAt, deletedBy, ...cleanEmployee } = employee;
                setEmployees([...employees, cleanEmployee]);
                setTrashedEmployees(trashedEmployees.filter(e => e.id !== employee.id));
            };

            const permanentlyDeleteProject = (projectId) => {
                setTrashedProjects(trashedProjects.filter(p => p.id !== projectId));
            };

            const permanentlyDeleteEmployee = (employeeId) => {
                setTrashedEmployees(trashedEmployees.filter(e => e.id !== employeeId));
            };

            const emptyTrash = () => {
                if (trashTab === 'projects') {
                    setTrashedProjects([]);
                } else {
                    setTrashedEmployees([]);
                }
                setConfirmEmpty(false);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">⚙</span>
                                <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        {/* Tabs */}
                        <div className="border-b">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('trash')}
                                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'trash' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-600'}`}
                                >
                                    🗑 Trash ({trashedProjects.length + trashedEmployees.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('backup')}
                                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'backup' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                                >
                                    💾 Backup & Restore
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 140px)'}}>
                            {activeTab === 'trash' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTrashTab('projects')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium ${trashTab === 'projects' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                                            >
                                                Projects ({trashedProjects.length})
                                            </button>
                                            <button
                                                onClick={() => setTrashTab('employees')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium ${trashTab === 'employees' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                                            >
                                                Employees ({trashedEmployees.length})
                                            </button>
                                        </div>
                                        {((trashTab === 'projects' && trashedProjects.length > 0) || (trashTab === 'employees' && trashedEmployees.length > 0)) && (
                                            <button
                                                onClick={() => setConfirmEmpty(true)}
                                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                                            >
                                                Empty {trashTab === 'projects' ? 'Projects' : 'Employees'} Trash
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-500">
                                        Items in trash are automatically deleted after 90 days.
                                    </p>

                                    {trashTab === 'projects' && (
                                        <div className="space-y-2">
                                            {trashedProjects.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p>No deleted projects</p>
                                                </div>
                                            ) : (
                                                trashedProjects.map(project => (
                                                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{project.name}</h4>
                                                            <p className="text-sm text-gray-500">
                                                                {project.modules?.length || 0} modules • Deleted {formatDate(project.deletedAt)}
                                                            </p>
                                                            <p className="text-xs text-orange-600">
                                                                {getDaysRemaining(project.deletedAt)} days until permanent deletion
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => restoreProject(project)}
                                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                onClick={() => permanentlyDeleteProject(project.id)}
                                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                            >
                                                                Delete Forever
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {trashTab === 'employees' && (
                                        <div className="space-y-2">
                                            {trashedEmployees.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p>No deleted employees</p>
                                                </div>
                                            ) : (
                                                trashedEmployees.map(employee => (
                                                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">
                                                                {employee.firstName} {employee.lastName}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">
                                                                {employee.jobTitle} • {employee.department} • Deleted {formatDate(employee.deletedAt)}
                                                            </p>
                                                            <p className="text-xs text-orange-600">
                                                                {getDaysRemaining(employee.deletedAt)} days until permanent deletion
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => restoreEmployee(employee)}
                                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                onClick={() => permanentlyDeleteEmployee(employee.id)}
                                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                            >
                                                                Delete Forever
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'backup' && (
                                <div className="space-y-6">
                                    {/* Export Section */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-2">📋¤ Export Data</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Download a complete backup of all MODA data including projects, modules, employees, and trash.
                                        </p>
                                        <button
                                            onClick={exportData}
                                            className="px-4 py-2 btn-primary rounded-lg"
                                        >
                                            Download Backup
                                        </button>
                                    </div>

                                    {/* Import Section */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-2">📋¥ Import Data</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Restore MODA data from a previously exported backup file. This will replace current data.
                                        </p>
                                        <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                                            Select Backup File
                                            <input 
                                                type="file" 
                                                accept=".json" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    if (e.target.files[0]) {
                                                        if (confirm('This will replace all current data. Are you sure?')) {
                                                            importData(e.target.files[0]);
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {/* Data Summary */}
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">📋Š Current Data Summary</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Projects:</span>
                                                <span className="ml-2 font-medium">{projects.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Trashed Projects:</span>
                                                <span className="ml-2 font-medium">{trashedProjects.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Employees:</span>
                                                <span className="ml-2 font-medium">{employees.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Trashed Employees:</span>
                                                <span className="ml-2 font-medium">{trashedEmployees.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Total Modules:</span>
                                                <span className="ml-2 font-medium">{projects.reduce((sum, p) => sum + (p.modules?.length || 0), 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Empty Trash Confirmation */}
                        {confirmEmpty && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <div className="bg-white rounded-lg p-6 max-w-sm">
                                    <h3 className="font-bold text-lg mb-2">Empty {trashTab === 'projects' ? 'Projects' : 'Employees'} Trash?</h3>
                                    <p className="text-gray-600 text-sm mb-4">
                                        This will permanently delete all {trashTab === 'projects' ? trashedProjects.length + ' projects' : trashedEmployees.length + ' employees'}. This cannot be undone.
                                    </p>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setConfirmEmpty(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                                        <button onClick={emptyTrash} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete All</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

// Export for use in App.jsx
window.ProjectsDirectory = ProjectsDirectory;

