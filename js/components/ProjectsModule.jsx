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
            const [searchQuery, setSearchQuery] = useState('');
            const [sortField, setSortField] = useState('newest');
            const [sortDirection, setSortDirection] = useState('desc');

            // Multi-field search filter
            const searchFilteredProjects = projects.filter(p => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                    (p.name || '').toLowerCase().includes(query) ||
                    (p.customer || '').toLowerCase().includes(query) ||
                    (p.city || '').toLowerCase().includes(query) ||
                    (p.state || '').toLowerCase().includes(query) ||
                    (p.country || '').toLowerCase().includes(query) ||
                    (p.description || '').toLowerCase().includes(query)
                );
            });

            // Status filter
            const statusFilteredProjects = searchFilteredProjects.filter(p => 
                statusFilter === 'all' || p.status === statusFilter
            );

            // Helper: Get max serial number from project modules (for "newest" sorting)
            const getMaxSerial = (project) => {
                if (!project.modules || project.modules.length === 0) return -1;
                return Math.max(...project.modules.map(m => {
                    const serial = m.serialNumber || '';
                    const numPart = serial.replace(/\D/g, '');
                    return parseInt(numPart, 10) || 0;
                }));
            };

            // Sorting
            const sortedProjects = [...statusFilteredProjects].sort((a, b) => {
                let aVal, bVal;
                
                if (sortField === 'newest') {
                    // Projects with 0 modules go first (to remind user to add data)
                    const aHasModules = (a.modules?.length || 0) > 0;
                    const bHasModules = (b.modules?.length || 0) > 0;
                    if (!aHasModules && bHasModules) return -1;
                    if (aHasModules && !bHasModules) return 1;
                    // Then sort by max serial number (higher = newer)
                    aVal = getMaxSerial(a);
                    bVal = getMaxSerial(b);
                } else if (sortField === 'modules') {
                    aVal = a.modules?.length || 0;
                    bVal = b.modules?.length || 0;
                } else if (sortField === 'location') {
                    aVal = `${a.city || ''}, ${a.state || ''}`.toLowerCase();
                    bVal = `${b.city || ''}, ${b.state || ''}`.toLowerCase();
                } else {
                    aVal = (a[sortField] || '').toString().toLowerCase();
                    bVal = (b[sortField] || '').toString().toLowerCase();
                }
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            const filteredProjects = sortedProjects;

            // Handle column header click for sorting
            const handleSort = (field) => {
                if (sortField === field) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                    setSortField(field);
                    setSortDirection('asc');
                }
            };

            // Sort indicator arrow
            const SortArrow = ({ field }) => {
                if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
                return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
            };

            // Quick stats
            const totalModules = projects.reduce((sum, p) => sum + (p.modules?.length || 0), 0);
            const statusSummary = Object.entries({
                Active: projects.filter(p => p.status === 'Active').length,
                Complete: projects.filter(p => p.status === 'Complete').length,
                Planning: projects.filter(p => p.status === 'Planning').length,
                'On Hold': projects.filter(p => p.status === 'On Hold').length
            }).filter(([_, count]) => count > 0).map(([status, count]) => `${count} ${status}`).join(', ');

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
                <div className="space-y-4">
                    {/* Header Row */}
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
                                    {editMode ? 'Done Editing' : 'Edit Projects'}
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

                    {/* Quick Stats Summary */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                            <span className="font-semibold text-gray-700">{projects.length} projects</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-600">{totalModules.toLocaleString()} total modules</span>
                        </div>
                        <div className="text-gray-500">{statusSummary}</div>
                    </div>

                    {/* Search and Filter Row */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[250px]">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search projects by name, customer, city, state..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    x
                                </button>
                            )}
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-full text-sm transition ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                All ({projects.length})
                            </button>
                            {Object.entries(statusCounts).filter(([_, count]) => count > 0).map(([status, count]) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition ${statusFilter === status ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                >
                                    {status} ({count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Projects Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {filteredProjects.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-gray-500">
                                    {searchQuery ? `No projects match "${searchQuery}"` : 'No projects found. Click "New Project" to create one.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('name')}
                                            >
                                                <span className="flex items-center">Project Name <SortArrow field="name" /></span>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('customer')}
                                            >
                                                <span className="flex items-center">Customer <SortArrow field="customer" /></span>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('location')}
                                            >
                                                <span className="flex items-center">Location <SortArrow field="location" /></span>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('status')}
                                            >
                                                <span className="flex items-center">Status <SortArrow field="status" /></span>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('modules')}
                                            >
                                                <span className="flex items-center justify-end">Modules <SortArrow field="modules" /></span>
                                            </th>
                                            {editMode && (
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredProjects.map(project => (
                                            <tr 
                                                key={project.id}
                                                className={`${!editMode ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'} transition-colors`}
                                                onClick={() => !editMode && onSelectProject(project)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{project.name}</div>
                                                    {project.description && (
                                                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{project.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {project.customer || <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {project.city || project.state || project.country ? (
                                                        <span>
                                                            {project.city}{project.city && project.state ? ', ' : ''}{project.state}
                                                            {project.country && project.country !== 'US' && ` (${project.country})`}
                                                            {!project.city && !project.state && project.country && project.country}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                                        project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                        project.status === 'Complete' ? 'bg-gray-100 text-gray-800' :
                                                        project.status === 'Planning' ? 'bg-blue-100 text-blue-800' :
                                                        project.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-purple-100 text-purple-800'
                                                    }`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 text-right font-medium">
                                                    {project.modules?.length || 0}
                                                </td>
                                                {editMode && (
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingProject(project); }}
                                                                className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                                                                className="px-2.5 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
            const [abbreviation, setAbbreviation] = useState(project.abbreviation || '');
            const [address, setAddress] = useState(project.address || '');
            const [city, setCity] = useState(project.city || '');
            const [country, setCountry] = useState(project.country || 'US');
            const [state, setState] = useState(project.state || '');
            const [zipCode, setZipCode] = useState(project.zipCode || '');
            const [customer, setCustomer] = useState(project.customer || '');
            const [description, setDescription] = useState(project.description || '');
            const [status, setStatus] = useState(project.status || 'Planning');

            const isUS = country === 'US';

            const handleSubmit = (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                onSave({ 
                    ...project, 
                    name: name.trim(),
                    abbreviation: abbreviation.trim(),
                    address: address.trim(),
                    city: city.trim(),
                    country,
                    state,
                    zipCode: zipCode.trim(),
                    customer: customer.trim(),
                    description: description.trim(), 
                    status
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
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Alvarado Creek"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
                                        <input
                                            type="text"
                                            value={abbreviation}
                                            onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                                            placeholder="e.g., AC"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            maxLength={6}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <select
                                        value={country}
                                        onChange={(e) => { setCountry(e.target.value); setState(''); }}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="US">United States</option>
                                        <option value="CA">Canada</option>
                                        <option value="MX">Mexico</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="e.g., 123 Main Street"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="e.g., San Diego"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{isUS ? 'State' : 'State/Province'} *</label>
                                        {isUS ? (
                                            <select
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg"
                                            >
                                                <option value="">Select...</option>
                                                <option value="AL">Alabama</option><option value="AK">Alaska</option><option value="AZ">Arizona</option>
                                                <option value="AR">Arkansas</option><option value="CA">California</option><option value="CO">Colorado</option>
                                                <option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="FL">Florida</option>
                                                <option value="GA">Georgia</option><option value="HI">Hawaii</option><option value="ID">Idaho</option>
                                                <option value="IL">Illinois</option><option value="IN">Indiana</option><option value="IA">Iowa</option>
                                                <option value="KS">Kansas</option><option value="KY">Kentucky</option><option value="LA">Louisiana</option>
                                                <option value="ME">Maine</option><option value="MD">Maryland</option><option value="MA">Massachusetts</option>
                                                <option value="MI">Michigan</option><option value="MN">Minnesota</option><option value="MS">Mississippi</option>
                                                <option value="MO">Missouri</option><option value="MT">Montana</option><option value="NE">Nebraska</option>
                                                <option value="NV">Nevada</option><option value="NH">New Hampshire</option><option value="NJ">New Jersey</option>
                                                <option value="NM">New Mexico</option><option value="NY">New York</option><option value="NC">North Carolina</option>
                                                <option value="ND">North Dakota</option><option value="OH">Ohio</option><option value="OK">Oklahoma</option>
                                                <option value="OR">Oregon</option><option value="PA">Pennsylvania</option><option value="RI">Rhode Island</option>
                                                <option value="SC">South Carolina</option><option value="SD">South Dakota</option><option value="TN">Tennessee</option>
                                                <option value="TX">Texas</option><option value="UT">Utah</option><option value="VT">Vermont</option>
                                                <option value="VA">Virginia</option><option value="WA">Washington</option><option value="WV">West Virginia</option>
                                                <option value="WI">Wisconsin</option><option value="WY">Wyoming</option><option value="DC">Washington DC</option>
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                placeholder="e.g., Ontario"
                                                className="w-full px-3 py-2 border rounded-lg"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{isUS ? 'Zip Code' : 'Postal Code'}</label>
                                        <input
                                            type="text"
                                            value={zipCode}
                                            onChange={(e) => setZipCode(e.target.value)}
                                            placeholder={isUS ? 'e.g., 92101' : 'e.g., A1A 1A1'}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        >
                                            <option value="Planning">Planning</option>
                                            <option value="Active">Active</option>
                                            <option value="On Hold">On Hold</option>
                                            <option value="Complete">Complete</option>
                                            <option value="Archived">Archived</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                    <input
                                        type="text"
                                        value={customer}
                                        onChange={(e) => setCustomer(e.target.value)}
                                        placeholder="e.g., ABC Development Corp"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Phase 1 residential units..."
                                        className="w-full px-3 py-2 border rounded-lg"
                                        rows={2}
                                    />
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

