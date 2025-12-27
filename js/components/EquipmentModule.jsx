// ============================================================================
// MODA EQUIPMENT MODULE
// Extracted from App.jsx for better maintainability
// ============================================================================

        // ============================================================================
        // EQUIPMENT MODULE - Integrated
        // ============================================================================

        // People/Departments Data (would come from People module)
        const equipmentSamplePeople = [];

        const equipmentDepartments = [
            'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Finishing', 
            'Welding', 'Assembly', 'Quality Control', 'Maintenance', 
            'Automation', 'Drywall', 'Roofing', 'Tool Crib'
        ];

        // Initial Equipment Data
        const equipmentInitialData = [];

        const equipmentInitialVendors = [];

        // Main App
        function EquipmentApp() {
            const [activeTab, setActiveTab] = useState('equipment');
            const [equipment, setEquipment] = useState([]);
            const [vendors, setVendors] = useState([]);
            const [inventoryLogs, setInventoryLogs] = useState([]);
            const [missingResolutions, setMissingResolutions] = useState([]);
            const [notifications, setNotifications] = useState([]);
            const [showEquipmentModal, setShowEquipmentModal] = useState(false);
            const [showVendorModal, setShowVendorModal] = useState(false);
            const [editingItem, setEditingItem] = useState(null);
            const [searchTerm, setSearchTerm] = useState('');
            const [filterType, setFilterType] = useState('All');
            const [filterStatus, setFilterStatus] = useState('All');
            const [filterToolStatus, setFilterToolStatus] = useState('All');

            const [isLoading, setIsLoading] = useState(true);
            
            const safeParseJSON = (str, fallback) => {
                if (str && str !== 'undefined' && str !== 'null') {
                    try { return JSON.parse(str); } catch (e) { return fallback; }
                }
                return fallback;
            };

            // Load data from Supabase on mount
            useEffect(() => {
                const loadData = async () => {
                    try {
                        if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
                            console.log('[Equipment] Loading data from Supabase...');
                            const [equipmentData, vendorsData, logsData] = await Promise.all([
                                window.MODA_SUPABASE_DATA.equipment.getAll(),
                                window.MODA_SUPABASE_DATA.equipment.getVendors(),
                                window.MODA_SUPABASE_DATA.equipment.getLogs()
                            ]);
                            
                            setEquipment(equipmentData.length > 0 ? equipmentData : safeParseJSON(localStorage.getItem('modaEquipmentV2'), equipmentInitialData));
                            setVendors(vendorsData.length > 0 ? vendorsData : safeParseJSON(localStorage.getItem('modaVendorsV2'), equipmentInitialVendors));
                            setInventoryLogs(logsData.length > 0 ? logsData : safeParseJSON(localStorage.getItem('modaInventoryLogs'), []));
                            setMissingResolutions(safeParseJSON(localStorage.getItem('modaMissingResolutions'), []));
                            console.log('[Equipment] Loaded from Supabase:', equipmentData.length, 'items,', vendorsData.length, 'vendors,', logsData.length, 'logs');
                        } else {
                            console.log('[Equipment] Supabase not available, using localStorage');
                            setEquipment(safeParseJSON(localStorage.getItem('modaEquipmentV2'), equipmentInitialData));
                            setVendors(safeParseJSON(localStorage.getItem('modaVendorsV2'), equipmentInitialVendors));
                            setInventoryLogs(safeParseJSON(localStorage.getItem('modaInventoryLogs'), []));
                            setMissingResolutions(safeParseJSON(localStorage.getItem('modaMissingResolutions'), []));
                        }
                    } catch (error) {
                        console.error('[Equipment] Error loading data:', error);
                        setEquipment(safeParseJSON(localStorage.getItem('modaEquipmentV2'), equipmentInitialData));
                        setVendors(safeParseJSON(localStorage.getItem('modaVendorsV2'), equipmentInitialVendors));
                        setInventoryLogs(safeParseJSON(localStorage.getItem('modaInventoryLogs'), []));
                        setMissingResolutions(safeParseJSON(localStorage.getItem('modaMissingResolutions'), []));
                    } finally {
                        setIsLoading(false);
                    }
                };
                
                const timer = setTimeout(loadData, 500);
                return () => clearTimeout(timer);
            }, []);

            // Save data to localStorage as backup
            useEffect(() => {
                if (!isLoading && equipment.length > 0) localStorage.setItem('modaEquipmentV2', JSON.stringify(equipment));
            }, [equipment, isLoading]);

            useEffect(() => {
                if (!isLoading && vendors.length > 0) localStorage.setItem('modaVendorsV2', JSON.stringify(vendors));
            }, [vendors, isLoading]);

            useEffect(() => {
                if (!isLoading) localStorage.setItem('modaInventoryLogs', JSON.stringify(inventoryLogs));
            }, [inventoryLogs, isLoading]);

            useEffect(() => {
                if (!isLoading) localStorage.setItem('modaMissingResolutions', JSON.stringify(missingResolutions));
            }, [missingResolutions, isLoading]);

            // Notification system
            const showNotification = (message, type = 'info') => {
                const id = Date.now();
                setNotifications(prev => [...prev, { id, message, type }]);
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }, 4000);
            };

            // Check for duplicate Serial ID
            const isSerialIdDuplicate = (serialId, excludeId = null) => {
                return equipment.some(e => 
                    e.serialId && 
                    (e.serialId || '').toLowerCase() === (serialId || '').toLowerCase() && 
                    e.id !== excludeId
                );
            };

            // Equipment CRUD
            const addEquipment = (item) => {
                if (item.serialId && isSerialIdDuplicate(item.serialId)) {
                    showNotification(`⚠ Duplicate Serial ID: ${item.serialId} already exists!`, 'error');
                    return false;
                }
                const newItem = {
                    ...item,
                    id: item.id || `TOOL-${String(equipment.length + 1).padStart(4, '0')}`,
                    assignmentHistory: [{
                        date: new Date().toISOString().split('T')[0],
                        type: item.assignmentType,
                        assignedTo: item.assignedTo,
                        department: item.department,
                        action: 'Initial Assignment'
                    }]
                };
                setEquipment([...equipment, newItem]);
                showNotification(`✅ Equipment added: ${item.name}`, 'success');
                return true;
            };

            const updateEquipment = (item) => {
                if (item.serialId && isSerialIdDuplicate(item.serialId, item.id)) {
                    showNotification(`⚠ Duplicate Serial ID: ${item.serialId} already exists!`, 'error');
                    return false;
                }
                
                const oldItem = equipment.find(e => e.id === item.id);
                let updatedItem = { ...item };
                
                // Track assignment changes
                if (oldItem && (
                    oldItem.assignmentType !== item.assignmentType ||
                    oldItem.assignedTo !== item.assignedTo ||
                    oldItem.department !== item.department
                )) {
                    updatedItem.assignmentHistory = [
                        ...(oldItem.assignmentHistory || []),
                        {
                            date: new Date().toISOString().split('T')[0],
                            type: item.assignmentType,
                            assignedTo: item.assignedTo,
                            department: item.department,
                            action: 'Reassignment'
                        }
                    ];
                }
                
                setEquipment(equipment.map(e => e.id === item.id ? updatedItem : e));
                showNotification(`✅ Equipment updated: ${item.name}`, 'success');
                return true;
            };

            const deleteEquipment = (id) => {
                if (confirm('Delete this equipment? This cannot be undone.')) {
                    const item = equipment.find(e => e.id === id);
                    setEquipment(equipment.filter(e => e.id !== id));
                    showNotification(`🗑 Equipment deleted: ${item?.name}`, 'info');
                }
            };

            // Update tool status
            const updateToolStatus = (id, newStatus, additionalInfo = {}) => {
                setEquipment(equipment.map(e => {
                    if (e.id === id) {
                        const updated = { ...e, toolStatus: newStatus };
                        if (newStatus === 'Missing') {
                            updated.missingInfo = additionalInfo;
                        } else if (newStatus === 'Loaned') {
                            updated.loanInfo = additionalInfo;
                        } else if (newStatus === 'Warranty/Repair') {
                            updated.repairInfo = additionalInfo;
                        }
                        return updated;
                    }
                    return e;
                }));
            };

            // Resolve missing tool
            const resolveMissingTool = (id, resolution, notes) => {
                const tool = equipment.find(e => e.id === id);
                if (!tool) return;

                const resolutionRecord = {
                    id: `RES-${Date.now()}`,
                    toolId: id,
                    toolName: tool.name,
                    serialId: tool.serialId,
                    resolution,
                    notes,
                    resolvedDate: new Date().toISOString(),
                    resolvedBy: 'Current User' // Would come from auth
                };

                setMissingResolutions([...missingResolutions, resolutionRecord]);

                if (resolution === 'Found') {
                    setEquipment(equipment.map(e => 
                        e.id === id ? { ...e, toolStatus: 'Present', missingInfo: null } : e
                    ));
                    showNotification(`✅ Tool marked as Found: ${tool.name}`, 'success');
                } else {
                    // Abandoned or Broken - mark as retired
                    setEquipment(equipment.map(e => 
                        e.id === id ? { ...e, toolStatus: 'Present', status: 'Retired', missingInfo: null } : e
                    ));
                    showNotification(`📋¦ Tool retired (${resolution}): ${tool.name}`, 'info');
                }
            };

            // Vendor CRUD
            const addVendor = (item) => {
                const newItem = { ...item, id: item.id || `VEND-${String(vendors.length + 1).padStart(4, '0')}` };
                setVendors([...vendors, newItem]);
                showNotification(`✅ Vendor added: ${item.name}`, 'success');
            };

            const updateVendor = (item) => {
                setVendors(vendors.map(v => v.id === item.id ? item : v));
                showNotification(`✅ Vendor updated: ${item.name}`, 'success');
            };

            const deleteVendor = (id) => {
                if (confirm('Delete this vendor?')) {
                    setVendors(vendors.filter(v => v.id !== id));
                }
            };

            // Save inventory log
            const saveInventoryLog = (log) => {
                setInventoryLogs([...inventoryLogs, log]);
                
                // Update equipment statuses based on log
                log.items.forEach(item => {
                    updateToolStatus(item.equipmentId, item.status, item.additionalInfo);
                });
                
                showNotification(`✅ Inventory log saved for ${log.department}`, 'success');
            };

            // Filtered equipment
            const filteredEquipment = equipment.filter(item => {
                const matchesSearch = 
                    (item.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                    (item.id || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                    (item.serialId || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                    (item.assignedTo || '').toLowerCase().includes((searchTerm || '').toLowerCase());
                const matchesType = filterType === 'All' || item.type === filterType;
                const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
                const matchesToolStatus = filterToolStatus === 'All' || item.toolStatus === filterToolStatus;
                return matchesSearch && matchesType && matchesStatus && matchesToolStatus;
            });

            // Missing tools
            const missingTools = equipment.filter(e => e.toolStatus === 'Missing');

            // Stats
            const stats = {
                total: equipment.length,
                present: equipment.filter(e => e.toolStatus === 'Present').length,
                missing: missingTools.length,
                loaned: equipment.filter(e => e.toolStatus === 'Loaned').length,
                repair: equipment.filter(e => e.toolStatus === 'Warranty/Repair').length
            };

            // Export
            const exportToExcel = () => {
                const ws1 = XLSX.utils.json_to_sheet(equipment.map(e => ({
                    ...e,
                    assignmentHistory: JSON.stringify(e.assignmentHistory),
                    loanInfo: JSON.stringify(e.loanInfo),
                    missingInfo: JSON.stringify(e.missingInfo),
                    repairInfo: JSON.stringify(e.repairInfo)
                })));
                const ws2 = XLSX.utils.json_to_sheet(vendors);
                const ws3 = XLSX.utils.json_to_sheet(inventoryLogs);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws1, "Equipment");
                XLSX.utils.book_append_sheet(wb, ws2, "Vendors");
                XLSX.utils.book_append_sheet(wb, ws3, "InventoryLogs");
                XLSX.writeFile(wb, `MODA_Equipment_${new Date().toISOString().split('T')[0]}.xlsx`);
            };

            return (
                <div className="p-6">
                    {/* Notifications */}
                    {notifications.map(n => (
                        <div
                            key={n.id}
                            className={`equipment-notification ${
                                n.type === 'error' ? 'bg-red-600 text-white' :
                                n.type === 'success' ? 'bg-green-600 text-white' :
                                'bg-blue-600 text-white'
                            }`}
                        >
                            {n.message}
                        </div>
                    ))}

                    {/* Stats Bar */}
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'linear-gradient(135deg, var(--autovol-red) 0%, var(--autovol-navy) 100%)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '18px'
                                }}>
                                    🔧
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold" style={{ color: 'var(--autovol-navy)' }}>
                                        Tools & Equipment
                                    </h2>
                                    <p className="text-sm text-gray-500">Power Tool Tracking & Inventory</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>{stats.total}</div>
                                    <div className="text-xs text-gray-500">Total Tools</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                                    <div className="text-xs text-gray-500">Present</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
                                    <div className="text-xs text-gray-500">Missing</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">{stats.loaned}</div>
                                    <div className="text-xs text-gray-500">Loaned</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{stats.repair}</div>
                                    <div className="text-xs text-gray-500">Repair</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="bg-white rounded-lg shadow-sm mb-4">
                        <div className="px-4">
                            <div className="flex gap-1 overflow-x-auto">
                                {[
                                    { id: 'equipment', label: 'Equipment', count: equipment.length },
                                    { id: 'missing', label: 'Missing Tools', count: missingTools.length, alert: missingTools.length > 0 },
                                    { id: 'inventory', label: 'Inventory Log', count: null },
                                    { id: 'vendors', label: 'Vendors', count: vendors.length },
                                    { id: 'admin', label: 'Data Management', count: null }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`equipment-tab-btn ${activeTab === tab.id ? 'active' : ''} whitespace-nowrap`}
                                    >
                                        {tab.label}
                                        {tab.count !== null && (
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded font-bold ${
                                                tab.alert ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <main className="py-4">
                        {activeTab === 'equipment' && (
                            <EquipmentDirectory
                                equipment={filteredEquipment}
                                vendors={vendors}
                                people={equipmentSamplePeople}
                                departments={equipmentDepartments}
                                onAdd={() => { setEditingItem(null); setShowEquipmentModal(true); }}
                                onEdit={(item) => { setEditingItem(item); setShowEquipmentModal(true); }}
                                onDelete={deleteEquipment}
                                onUpdateStatus={updateToolStatus}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                filterType={filterType}
                                setFilterType={setFilterType}
                                filterStatus={filterStatus}
                                setFilterStatus={setFilterStatus}
                                filterToolStatus={filterToolStatus}
                                setFilterToolStatus={setFilterToolStatus}
                            />
                        )}

                        {activeTab === 'missing' && (
                            <MissingToolBoard
                                missingTools={missingTools}
                                resolutions={missingResolutions}
                                onResolve={resolveMissingTool}
                            />
                        )}

                        {activeTab === 'inventory' && (
                            <InventoryLogSection
                                equipment={equipment}
                                departments={equipmentDepartments}
                                logs={inventoryLogs}
                                onSaveLog={saveInventoryLog}
                            />
                        )}

                        {activeTab === 'vendors' && (
                            <VendorDirectory
                                vendors={vendors}
                                onAdd={() => { setEditingItem(null); setShowVendorModal(true); }}
                                onEdit={(item) => { setEditingItem(item); setShowVendorModal(true); }}
                                onDelete={deleteVendor}
                            />
                        )}

                        {activeTab === 'admin' && (
                            <AdminPanel
                                stats={stats}
                                onExport={exportToExcel}
                            />
                        )}
                    </main>

                    {/* Equipment Modal */}
                    {showEquipmentModal && (
                        <EquipmentModal
                            item={editingItem}
                            vendors={vendors}
                            people={equipmentSamplePeople}
                            departments={equipmentDepartments}
                            onSave={(item) => {
                                const success = editingItem ? updateEquipment(item) : addEquipment(item);
                                if (success) {
                                    setShowEquipmentModal(false);
                                    setEditingItem(null);
                                }
                            }}
                            onClose={() => { setShowEquipmentModal(false); setEditingItem(null); }}
                        />
                    )}

                    {/* Vendor Modal */}
                    {showVendorModal && (
                        <VendorModal
                            item={editingItem}
                            onSave={(item) => {
                                editingItem ? updateVendor(item) : addVendor(item);
                                setShowVendorModal(false);
                                setEditingItem(null);
                            }}
                            onClose={() => { setShowVendorModal(false); setEditingItem(null); }}
                        />
                    )}
                </div>
            );
        }

        // Equipment Directory
        function EquipmentDirectory({ 
            equipment, vendors, people, departments,
            onAdd, onEdit, onDelete, onUpdateStatus,
            searchTerm, setSearchTerm,
            filterType, setFilterType,
            filterStatus, setFilterStatus,
            filterToolStatus, setFilterToolStatus
        }) {
            const [selectedItem, setSelectedItem] = useState(null);

            return (
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-5">
                        <div className="mb-4 space-y-3">
                            <input
                                type="text"
                                placeholder="Search name, ID, serial, assignee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                style={{ fontSize: '14px' }}
                            />
                            
                            <div className="grid grid-cols-3 gap-2">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="All">All Types</option>
                                    <option value="Tool">Tool</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Jig/Fixture">Jig/Fixture</option>
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Retired">Retired</option>
                                </select>

                                <select
                                    value={filterToolStatus}
                                    onChange={(e) => setFilterToolStatus(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="All">All Locations</option>
                                    <option value="Present">Present</option>
                                    <option value="Missing">Missing</option>
                                    <option value="Loaned">Loaned</option>
                                    <option value="Warranty/Repair">Repair</option>
                                </select>
                            </div>

                            <button onClick={onAdd} className="btn-equipment-primary w-full">
                                + Add Equipment
                            </button>
                        </div>

                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b text-sm font-semibold text-gray-600">
                                Equipment ({equipment.length})
                            </div>
                            <div className="max-h-[calc(100vh-450px)] overflow-y-auto">
                                {equipment.map(item => (
                                    <EquipmentListRow
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedItem?.id === item.id}
                                        onClick={() => setSelectedItem(item)}
                                    />
                                ))}
                                {equipment.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">No equipment found</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-7">
                        {selectedItem ? (
                            <EquipmentDetailPanel
                                item={selectedItem}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onClose={() => setSelectedItem(null)}
                            />
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                                <div className="text-6xl mb-4">🔧</div>
                                <p className="text-lg font-medium">Select a tool to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Equipment List Row
        function EquipmentListRow({ item, isSelected, onClick }) {
            const getToolStatusStyle = (status) => {
                switch(status) {
                    case 'Present': return 'bg-green-100 text-green-800';
                    case 'Missing': return 'bg-red-100 text-red-800';
                    case 'Loaned': return 'bg-yellow-100 text-yellow-800';
                    case 'Warranty/Repair': return 'bg-blue-100 text-blue-800';
                    default: return 'bg-gray-100 text-gray-800';
                }
            };

            return (
                <div className={`equipment-list-row ${isSelected ? 'selected' : ''}`} onClick={onClick}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-500 serial-id">{item.serialId || item.id}</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 truncate" style={{ fontSize: '15px' }}>{item.name}</h4>
                            <div className="text-xs text-gray-600 mt-1 font-medium">
                                {item.assignmentType === 'Individual' ? (
                                    <span>👤 {item.assignedTo}</span>
                                ) : (
                                    <span>🏢 {item.department}</span>
                                )}
                            </div>
                        </div>
                        <div className="ml-3">
                            <span className={`badge ${getToolStatusStyle(item.toolStatus)}`}>
                                {item.toolStatus === 'Warranty/Repair' ? '🔧 Repair' : item.toolStatus}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        // Equipment Detail Panel
        function EquipmentDetailPanel({ item, onEdit, onDelete, onClose }) {
            const getToolStatusStyle = (status) => {
                switch(status) {
                    case 'Present': return 'bg-green-100 text-green-800';
                    case 'Missing': return 'bg-red-100 text-red-800';
                    case 'Loaned': return 'bg-yellow-100 text-yellow-800';
                    case 'Warranty/Repair': return 'bg-blue-100 text-blue-800';
                    default: return 'bg-gray-100 text-gray-800';
                }
            };

            return (
                <div className="equipment-detail-panel">
                    <div className="equipment-detail-section">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-sm text-gray-500 font-mono mb-1 tool-id">{item.id}</div>
                                <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`badge ${getToolStatusStyle(item.toolStatus)}`}>
                                {item.toolStatus}
                            </span>
                            <span className={`badge ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {item.status}
                            </span>
                        </div>
                    </div>

                    {/* Tool Identification */}
                    <div className="equipment-detail-section">
                        <h3 className="font-bold text-lg mb-3">Tool Identification</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Part Number / Model</div>
                                <div className="font-semibold font-mono">{item.partNumber || '–'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Serial ID</div>
                                <div className="font-semibold font-mono text-autovol-blue serial-id">{item.serialId || '–'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Category</div>
                                <div className="font-semibold">{item.category || '–'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Location</div>
                                <div className="font-semibold">{item.location || '–'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Assignment */}
                    <div className="equipment-detail-section">
                        <h3 className="font-bold text-lg mb-3">Current Assignment</h3>
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4" style={{ borderLeftColor: '#0057B8' }}>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-gray-500 mb-1 font-medium">Assignment Type</div>
                                    <div className="font-semibold">{item.assignmentType}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1 font-medium">Department</div>
                                    <div className="font-semibold">{item.department || '–'}</div>
                                </div>
                                {item.assignmentType === 'Individual' && (
                                    <div className="col-span-2">
                                        <div className="text-gray-500 mb-1 font-medium">Assigned To</div>
                                        <div className="font-semibold text-lg">👤 {item.assignedTo}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Loan Info */}
                    {item.toolStatus === 'Loaned' && item.loanInfo && (
                        <div className="equipment-detail-section">
                            <h3 className="font-bold text-lg mb-3 text-yellow-700">📋¤ Loan Information</h3>
                            <div className="bg-yellow-50 p-4 rounded-lg text-sm border-l-4 border-yellow-500">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Loaned To</div>
                                        <div className="font-semibold">{item.loanInfo.loanedTo}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Department</div>
                                        <div className="font-semibold">{item.loanInfo.loanedToDept}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Loan Date</div>
                                        <div className="font-semibold">{item.loanInfo.loanDate}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Expected Return</div>
                                        <div className="font-semibold text-yellow-700">{item.loanInfo.expectedReturn}</div>
                                    </div>
                                </div>
                                {item.loanInfo.reason && (
                                    <div className="mt-3 pt-3 border-t border-yellow-200">
                                        <div className="text-gray-500 mb-1 font-medium">Reason</div>
                                        <div>{item.loanInfo.reason}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Repair Info */}
                    {item.toolStatus === 'Warranty/Repair' && item.repairInfo && (
                        <div className="equipment-detail-section">
                            <h3 className="font-bold text-lg mb-3 text-blue-700">🔧 Repair Information</h3>
                            <div className="bg-blue-50 p-4 rounded-lg text-sm border-l-4 border-blue-500">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Service Provider</div>
                                        <div className="font-semibold">{item.repairInfo.vendor}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Ticket #</div>
                                        <div className="font-semibold font-mono">{item.repairInfo.ticketNumber}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Sent Date</div>
                                        <div className="font-semibold">{item.repairInfo.sentDate}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Expected Return</div>
                                        <div className="font-semibold text-blue-700">{item.repairInfo.expectedReturn}</div>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                    <div className="text-gray-500 mb-1 font-medium">Issue</div>
                                    <div>{item.repairInfo.issue}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Missing Info */}
                    {item.toolStatus === 'Missing' && item.missingInfo && (
                        <div className="equipment-detail-section">
                            <h3 className="font-bold text-lg mb-3 text-red-700">⚠ Missing Tool Report</h3>
                            <div className="bg-red-50 p-4 rounded-lg text-sm border-l-4 border-red-500">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Reported Date</div>
                                        <div className="font-semibold">{item.missingInfo.reportedDate}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 mb-1 font-medium">Reported By</div>
                                        <div className="font-semibold">{item.missingInfo.reportedBy}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-gray-500 mb-1 font-medium">Last Known Location</div>
                                        <div className="font-semibold">{item.missingInfo.lastKnownLocation}</div>
                                    </div>
                                </div>
                                {item.missingInfo.notes && (
                                    <div className="mt-3 pt-3 border-t border-red-200">
                                        <div className="text-gray-500 mb-1 font-medium">Notes</div>
                                        <div>{item.missingInfo.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Purchase Info */}
                    <div className="equipment-detail-section">
                        <h3 className="font-bold text-lg mb-3">Purchase Information</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Vendor</div>
                                <div className="font-semibold">{item.vendor || '–'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Purchase Date</div>
                                <div className="font-semibold">{item.purchaseDate || '–'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Cost</div>
                                <div className="font-semibold">
                                    {item.cost ? `$${parseFloat(item.cost).toFixed(2)}` : '–'}
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 mb-1 font-medium">Warranty Exp.</div>
                                <div className="font-semibold">{item.warranty || '–'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Assignment History */}
                    {item.assignmentHistory && item.assignmentHistory.length > 0 && (
                        <div className="equipment-detail-section">
                            <h3 className="font-bold text-lg mb-3">Assignment History</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {[...item.assignmentHistory].reverse().map((h, idx) => (
                                    <div key={idx} className="text-sm p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                                        <div>
                                            <span className="font-semibold">{h.action}</span>
                                            <span className="text-gray-500 mx-2">→</span>
                                            {h.type === 'Individual' ? (
                                                <span>👤 {h.assignedTo} ({h.department})</span>
                                            ) : (
                                                <span>🏢 {h.department}</span>
                                            )}
                                        </div>
                                        <span className="text-gray-500 text-xs">{h.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                        <div className="equipment-detail-section">
                            <h3 className="font-bold text-lg mb-3">Notes</h3>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{item.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="equipment-detail-section">
                        <div className="flex gap-3">
                            <button onClick={() => onEdit(item)} className="btn-equipment-primary flex-1">
                                ✏ Edit
                            </button>
                            <button onClick={() => onDelete(item.id)} className="btn-equipment-danger">
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Missing Tool Board
        function MissingToolBoard({ missingTools, resolutions, onResolve }) {
            const [selectedTool, setSelectedTool] = useState(null);
            const [showResolveModal, setShowResolveModal] = useState(false);

            // Calculate days missing
            const getDaysMissing = (reportedDate) => {
                if (!reportedDate) return 0;
                const reported = new Date(reportedDate);
                const today = new Date();
                return Math.floor((today - reported) / (1000 * 60 * 60 * 24));
            };

            return (
                <div>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Missing Tool Tracking Board</h2>
                        <p className="text-gray-600">Track and resolve missing tools. Tools missing over 30 days are marked critical.</p>
                    </div>

                    {missingTools.length === 0 ? (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-12 text-center">
                            <div className="text-6xl mb-4">✅</div>
                            <h3 className="text-xl font-bold text-green-800 mb-2">All Tools Accounted For</h3>
                            <p className="text-green-600">No missing tools reported at this time.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {missingTools.map(tool => {
                                const daysMissing = getDaysMissing(tool.missingInfo?.reportedDate);
                                const isCritical = daysMissing > 30;
                                
                                return (
                                    <div
                                        key={tool.id}
                                        className={`missing-card ${isCritical ? 'border-red-600 bg-red-50' : ''}`}
                                    >
                                        {isCritical && (
                                            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded mb-3 inline-block">
                                                🚨 CRITICAL: {daysMissing} DAYS MISSING
                                            </div>
                                        )}
                                        
                                        <div className="text-sm text-gray-500 font-mono mb-1 serial-id">{tool.serialId || tool.id}</div>
                                        <h3 className="font-bold text-lg mb-2">{tool.name}</h3>
                                        
                                        <div className="text-sm space-y-1.5 mb-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Assigned To:</span>
                                                <span className="font-semibold">
                                                    {tool.assignmentType === 'Individual' ? tool.assignedTo : tool.department}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Reported:</span>
                                                <span className="font-semibold">{tool.missingInfo?.reportedDate || 'Unknown'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Last Location:</span>
                                                <span className="font-semibold">{tool.missingInfo?.lastKnownLocation || 'Unknown'}</span>
                                            </div>
                                            {!isCritical && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 font-medium">Days Missing:</span>
                                                    <span className="font-bold text-red-600">{daysMissing} days</span>
                                                </div>
                                            )}
                                        </div>

                                        {tool.missingInfo?.notes && (
                                            <div className="text-sm text-gray-600 italic border-t pt-2 mb-4 bg-gray-50 p-2 rounded">
                                                "{tool.missingInfo.notes}"
                                            </div>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedTool(tool);
                                                setShowResolveModal(true);
                                            }}
                                            className="btn-equipment-primary w-full"
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Resolution History */}
                    {resolutions.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4">Resolution History</h3>
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Date</th>
                                            <th className="px-4 py-3 text-left font-semibold">Tool</th>
                                            <th className="px-4 py-3 text-left font-semibold">Serial</th>
                                            <th className="px-4 py-3 text-left font-semibold">Resolution</th>
                                            <th className="px-4 py-3 text-left font-semibold">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...resolutions].reverse().map((r, idx) => (
                                            <tr key={r.id} className="border-t" style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                                <td className="px-4 py-3">{new Date(r.resolvedDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-semibold">{r.toolName}</td>
                                                <td className="px-4 py-3 font-mono text-gray-500 serial-id">{r.serialId}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge ${
                                                        r.resolution === 'Found' ? 'bg-green-100 text-green-800' :
                                                        r.resolution === 'Abandoned' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {r.resolution}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{r.notes || '–'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Resolve Modal */}
                    {showResolveModal && selectedTool && (
                        <ResolveModal
                            tool={selectedTool}
                            onResolve={(resolution, notes) => {
                                onResolve(selectedTool.id, resolution, notes);
                                setShowResolveModal(false);
                                setSelectedTool(null);
                            }}
                            onClose={() => {
                                setShowResolveModal(false);
                                setSelectedTool(null);
                            }}
                        />
                    )}
                </div>
            );
        }

        // Resolve Modal
        function ResolveModal({ tool, onResolve, onClose }) {
            const [resolution, setResolution] = useState('');
            const [notes, setNotes] = useState('');

            const resolutionOptions = [
                { value: 'Found', label: '✅ Tool Found', description: 'Tool has been located and is back in service', color: 'bg-green-100 border-green-500' },
                { value: 'Abandoned', label: '📋¦ Abandoned', description: 'Search abandoned - tool written off', color: 'bg-yellow-100 border-yellow-500' },
                { value: 'Broken', label: '🔨 Broken/Non-repairable', description: 'Tool found but not repairable', color: 'bg-red-100 border-red-500' }
            ];

            return (
                <div className="equipment-modal-overlay" onClick={onClose}>
                    <div className="equipment-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">Resolve Missing Tool</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6 border-l-4" style={{ borderLeftColor: '#0057B8' }}>
                                <div className="text-sm text-gray-500 font-mono serial-id">{tool.serialId || tool.id}</div>
                                <div className="font-bold text-lg">{tool.name}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    Assigned: {tool.assignmentType === 'Individual' ? tool.assignedTo : tool.department}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block font-semibold mb-3">Select Resolution:</label>
                                <div className="space-y-2">
                                    {resolutionOptions.map(opt => (
                                        <div
                                            key={opt.value}
                                            onClick={() => setResolution(opt.value)}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                resolution === opt.value 
                                                    ? opt.color + ' border-opacity-100' 
                                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="font-semibold">{opt.label}</div>
                                            <div className="text-sm text-gray-600 mt-1">{opt.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block font-semibold mb-2">Notes (required):</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                    rows="3"
                                    placeholder="Provide details about the resolution..."
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        if (!resolution) {
                                            alert('Please select a resolution');
                                            return;
                                        }
                                        if (!notes.trim()) {
                                            alert('Please provide notes for this resolution');
                                            return;
                                        }
                                        onResolve(resolution, notes);
                                    }}
                                    className="btn-equipment-success flex-1"
                                >
                                    Confirm Resolution
                                </button>
                                <button onClick={onClose} className="btn-equipment-secondary">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Inventory Log Section
        function InventoryLogSection({ equipment, departments, logs, onSaveLog }) {
            const [activeView, setActiveView] = useState('conduct');
            const [selectedDept, setSelectedDept] = useState('');
            const [inventoryItems, setInventoryItems] = useState([]);
            const [isInventoryActive, setIsInventoryActive] = useState(false);

            // Start inventory for department
            const startInventory = () => {
                if (!selectedDept) return;
                
                const deptEquipment = equipment.filter(e => 
                    e.department === selectedDept && e.status === 'Active'
                );
                
                setInventoryItems(deptEquipment.map(e => ({
                    equipmentId: e.id,
                    name: e.name,
                    serialId: e.serialId,
                    currentStatus: e.toolStatus,
                    status: null,
                    additionalInfo: {}
                })));
                
                setIsInventoryActive(true);
            };

            // Update item status
            const updateItemStatus = (equipmentId, status) => {
                setInventoryItems(items => items.map(item => 
                    item.equipmentId === equipmentId ? { ...item, status } : item
                ));
            };

            // Submit inventory
            const submitInventory = () => {
                const incompleteItems = inventoryItems.filter(i => !i.status);
                if (incompleteItems.length > 0) {
                    alert(`Please mark status for all items. ${incompleteItems.length} items remaining.`);
                    return;
                }

                const log = {
                    id: `LOG-${Date.now()}`,
                    department: selectedDept,
                    date: new Date().toISOString(),
                    conductedBy: 'Current User',
                    items: inventoryItems,
                    summary: {
                        total: inventoryItems.length,
                        present: inventoryItems.filter(i => i.status === 'Present').length,
                        missing: inventoryItems.filter(i => i.status === 'Missing').length,
                        loaned: inventoryItems.filter(i => i.status === 'Loaned').length,
                        repair: inventoryItems.filter(i => i.status === 'Warranty/Repair').length
                    }
                };

                onSaveLog(log);
                setIsInventoryActive(false);
                setSelectedDept('');
                setInventoryItems([]);
            };

            // Get next inventory due date (monthly)
            const getNextInventoryDate = (dept) => {
                const deptLogs = logs.filter(l => l.department === dept);
                if (deptLogs.length === 0) return 'Not yet conducted';
                
                const lastLog = deptLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                const lastDate = new Date(lastLog.date);
                const nextDate = new Date(lastDate);
                nextDate.setMonth(nextDate.getMonth() + 1);
                
                const today = new Date();
                const isOverdue = nextDate < today;
                
                return {
                    date: nextDate.toLocaleDateString(),
                    isOverdue
                };
            };

            return (
                <div>
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Tool Inventory Log</h2>
                        <p className="text-gray-600">Monthly inventory exercises by department. Track tool status and accountability.</p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveView('conduct')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                activeView === 'conduct' ? 'bg-autovol-blue text-white' : 'bg-gray-200'
                            }`}
                        >
                            Conduct Inventory
                        </button>
                        <button
                            onClick={() => setActiveView('history')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                activeView === 'history' ? 'bg-autovol-blue text-white' : 'bg-gray-200'
                            }`}
                        >
                            View History
                        </button>
                        <button
                            onClick={() => setActiveView('schedule')}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                activeView === 'schedule' ? 'bg-autovol-blue text-white' : 'bg-gray-200'
                            }`}
                        >
                            Schedule Overview
                        </button>
                    </div>

                    {activeView === 'conduct' && !isInventoryActive && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-bold text-lg mb-4">Start New Inventory Exercise</h3>
                            <div className="max-w-md">
                                <label className="block mb-2 font-semibold">Select Department:</label>
                                <select
                                    value={selectedDept}
                                    onChange={e => setSelectedDept(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                                >
                                    <option value="">Choose department...</option>
                                    {departments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={startInventory}
                                    disabled={!selectedDept}
                                    className="btn-equipment-primary w-full disabled:opacity-50"
                                >
                                    Start Inventory
                                </button>
                            </div>
                        </div>
                    )}

                    {activeView === 'conduct' && isInventoryActive && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg">Inventory: {selectedDept}</h3>
                                        <p className="text-sm text-gray-600">
                                            {inventoryItems.filter(i => i.status).length} / {inventoryItems.length} items marked
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setIsInventoryActive(false);
                                                setInventoryItems([]);
                                            }}
                                            className="btn-equipment-secondary"
                                        >
                                            Cancel
                                        </button>
                                        <button onClick={submitInventory} className="btn-equipment-success">
                                            Submit Inventory
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {inventoryItems.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No equipment found for this department.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {inventoryItems.map(item => (
                                        <div key={item.equipmentId} className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <div className="text-sm text-gray-500 font-mono serial-id">{item.serialId || item.equipmentId}</div>
                                                    <div className="font-semibold">{item.name}</div>
                                                </div>
                                                {item.status && (
                                                    <span className={`badge ${
                                                        item.status === 'Present' ? 'bg-green-100 text-green-800' :
                                                        item.status === 'Missing' ? 'bg-red-100 text-red-800' :
                                                        item.status === 'Loaned' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {['Present', 'Missing', 'Warranty/Repair', 'Loaned'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => updateItemStatus(item.equipmentId, status)}
                                                        className={`equipment-status-btn ${
                                                            item.status === status ? 'selected' : ''
                                                        } ${
                                                            status === 'Present' ? 'bg-green-50 text-green-800' :
                                                            status === 'Missing' ? 'bg-red-50 text-red-800' :
                                                            status === 'Loaned' ? 'bg-yellow-50 text-yellow-800' :
                                                            'bg-blue-50 text-blue-800'
                                                        }`}
                                                    >
                                                        {status === 'Present' ? '✅' : 
                                                         status === 'Missing' ? '❌' :
                                                         status === 'Loaned' ? '📋¤' : '🔧'} {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'history' && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                                        <th className="px-4 py-3 text-left font-semibold">Conducted By</th>
                                        <th className="px-4 py-3 text-center font-semibold">Total</th>
                                        <th className="px-4 py-3 text-center font-semibold">Present</th>
                                        <th className="px-4 py-3 text-center font-semibold">Missing</th>
                                        <th className="px-4 py-3 text-center font-semibold">Loaned</th>
                                        <th className="px-4 py-3 text-center font-semibold">Repair</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                                No inventory logs yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        [...logs].reverse().map((log, idx) => (
                                            <tr key={log.id} className="border-t" style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                                <td className="px-4 py-3">{new Date(log.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-semibold">{log.department}</td>
                                                <td className="px-4 py-3">{log.conductedBy}</td>
                                                <td className="px-4 py-3 text-center">{log.summary.total}</td>
                                                <td className="px-4 py-3 text-center text-green-600 font-bold">{log.summary.present}</td>
                                                <td className="px-4 py-3 text-center text-red-600 font-bold">{log.summary.missing}</td>
                                                <td className="px-4 py-3 text-center text-yellow-600 font-bold">{log.summary.loaned}</td>
                                                <td className="px-4 py-3 text-center text-blue-600 font-bold">{log.summary.repair}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeView === 'schedule' && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tool Count</th>
                                        <th className="px-4 py-3 text-left font-semibold">Last Inventory</th>
                                        <th className="px-4 py-3 text-left font-semibold">Next Due</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map((dept, idx) => {
                                        const deptEquip = equipment.filter(e => e.department === dept && e.status === 'Active');
                                        const deptLogs = logs.filter(l => l.department === dept);
                                        const lastLog = deptLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                        const nextInfo = getNextInventoryDate(dept);
                                        
                                        if (deptEquip.length === 0) return null;
                                        
                                        return (
                                            <tr key={dept} className="border-t" style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                                <td className="px-4 py-3 font-semibold">{dept}</td>
                                                <td className="px-4 py-3">{deptEquip.length}</td>
                                                <td className="px-4 py-3">
                                                    {lastLog ? new Date(lastLog.date).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {typeof nextInfo === 'string' ? nextInfo : nextInfo.date}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {typeof nextInfo === 'string' ? (
                                                        <span className="equipment-badge bg-gray-100 text-gray-800">Pending</span>
                                                    ) : nextInfo.isOverdue ? (
                                                        <span className="equipment-badge bg-red-100 text-red-800">⚠ Overdue</span>
                                                    ) : (
                                                        <span className="equipment-badge bg-green-100 text-green-800">On Track</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            );
        }

        // Vendor Directory
        function VendorDirectory({ vendors, onAdd, onEdit, onDelete }) {
            const [selectedVendor, setSelectedVendor] = useState(null);
            const [searchTerm, setSearchTerm] = useState('');

            const filteredVendors = vendors.filter(v =>
                (v.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
            );

            return (
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-5">
                        <div className="mb-4 space-y-3">
                            <input
                                type="text"
                                placeholder="Search vendors..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            />
                            <button onClick={onAdd} className="btn-equipment-primary w-full">
                                + Add Vendor
                            </button>
                        </div>

                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b text-sm font-semibold text-gray-600">
                                Vendors ({filteredVendors.length})
                            </div>
                            <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                                {filteredVendors.map(vendor => (
                                    <div
                                        key={vendor.id}
                                        className={`equipment-list-row ${selectedVendor?.id === vendor.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedVendor(vendor)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{vendor.name}</span>
                                                    {vendor.preferred && <span className="text-yellow-500">⭐</span>}
                                                </div>
                                                <div className="text-sm text-gray-500 font-mono">{vendor.phone}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-12 lg:col-span-7">
                        {selectedVendor ? (
                            <div className="equipment-detail-panel">
                                <div className="equipment-detail-section">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedVendor.name}</h2>
                                            {selectedVendor.preferred && (
                                                <span className="equipment-badge bg-green-100 text-green-800 mt-2">⭐ Preferred Vendor</span>
                                            )}
                                        </div>
                                        <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                                    </div>
                                </div>

                                <div className="equipment-detail-section">
                                    <h3 className="font-bold text-lg mb-3">Contact Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-500 font-medium">Contact:</span> <span className="font-semibold">{selectedVendor.contactPerson}</span></div>
                                        <div><span className="text-gray-500 font-medium">Phone:</span> <span className="font-semibold font-mono">{selectedVendor.phone}</span></div>
                                        <div><span className="text-gray-500 font-medium">Email:</span> <span className="font-semibold text-blue-600">{selectedVendor.email}</span></div>
                                        <div><span className="text-gray-500 font-medium">Website:</span> <span className="font-semibold text-blue-600">{selectedVendor.website}</span></div>
                                        <div><span className="text-gray-500 font-medium">Payment Terms:</span> <span className="font-semibold">{selectedVendor.paymentTerms}</span></div>
                                    </div>
                                </div>

                                {selectedVendor.categories && (
                                    <div className="equipment-detail-section">
                                        <h3 className="font-bold text-lg mb-3">Product Categories</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedVendor.categories.map((cat, i) => (
                                                <span key={i} className="equipment-badge bg-blue-100 text-blue-800">{cat}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedVendor.notes && (
                                    <div className="equipment-detail-section">
                                        <h3 className="font-bold text-lg mb-3">Notes</h3>
                                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedVendor.notes}</p>
                                    </div>
                                )}

                                <div className="equipment-detail-section">
                                    <div className="flex gap-3">
                                        <button onClick={() => onEdit(selectedVendor)} className="btn-equipment-primary flex-1">✏ Edit</button>
                                        <button onClick={() => onDelete(selectedVendor.id)} className="btn-equipment-danger">🗑 Delete</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                                <div className="text-6xl mb-4">🏢</div>
                                <p className="text-lg font-medium">Select a vendor to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Admin Panel
        function AdminPanel({ stats, onExport }) {
            return (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">System Overview</h2>
                        <div className="grid grid-cols-5 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-3xl font-bold">{stats.total}</div>
                                <div className="text-sm text-gray-600 font-medium">Total Tools</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-3xl font-bold text-green-600">{stats.present}</div>
                                <div className="text-sm text-gray-600 font-medium">Present</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-3xl font-bold text-red-600">{stats.missing}</div>
                                <div className="text-sm text-gray-600 font-medium">Missing</div>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <div className="text-3xl font-bold text-yellow-600">{stats.loaned}</div>
                                <div className="text-sm text-gray-600 font-medium">Loaned</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-600">{stats.repair}</div>
                                <div className="text-sm text-gray-600 font-medium">In Repair</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Data Management</h2>
                        <button onClick={onExport} className="btn-equipment-primary">
                            📋Š Export to Excel
                        </button>
                    </div>
                </div>
            );
        }

        // Equipment Modal
        function EquipmentModal({ item, vendors, people, departments, onSave, onClose }) {
            const [formData, setFormData] = useState(item || {
                name: '',
                type: 'Tool',
                category: 'Power Tools',
                partNumber: '',
                serialId: '',
                location: '',
                status: 'Active',
                toolStatus: 'Present',
                assignmentType: 'Unassigned',
                assignedTo: null,
                department: '',
                purchaseDate: '',
                cost: '',
                vendor: '',
                warranty: '',
                notes: ''
            });

            // Auto-fill department when individual selected
            const handleAssigneeChange = (personName) => {
                const person = people.find(p => p.name === personName);
                setFormData({
                    ...formData,
                    assignedTo: personName,
                    department: person ? person.department : formData.department
                });
            };

            return (
                <div className="equipment-modal-overlay" onClick={onClose}>
                    <div className="equipment-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">{item ? 'Edit Equipment' : 'Add Equipment'}</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                            </div>

                            <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold mb-1">Tool Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                            placeholder="e.g., DeWalt 20V Impact Driver"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Part Number / Model</label>
                                        <input
                                            type="text"
                                            value={formData.partNumber}
                                            onChange={e => setFormData({...formData, partNumber: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                                            placeholder="e.g., DCF887B"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Serial ID (Unique) *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.serialId}
                                            onChange={e => setFormData({...formData, serialId: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                                            placeholder="e.g., DW-2024-0001"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({...formData, type: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        >
                                            <option value="Tool">Tool</option>
                                            <option value="Equipment">Equipment</option>
                                            <option value="Jig/Fixture">Jig/Fixture</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => setFormData({...formData, category: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                            placeholder="e.g., Power Tools"
                                        />
                                    </div>
                                </div>

                                {/* Assignment */}
                                <div className="border-t pt-4">
                                    <h3 className="font-bold mb-3">Assignment</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Assignment Type</label>
                                            <select
                                                value={formData.assignmentType}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    assignmentType: e.target.value,
                                                    assignedTo: e.target.value !== 'Individual' ? null : formData.assignedTo
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            >
                                                <option value="Unassigned">Unassigned</option>
                                                <option value="Individual">Individual</option>
                                                <option value="Department">Department</option>
                                            </select>
                                        </div>

                                        {formData.assignmentType === 'Individual' && (
                                            <div>
                                                <label className="block text-sm font-semibold mb-1">Assigned To</label>
                                                <select
                                                    value={formData.assignedTo || ''}
                                                    onChange={e => handleAssigneeChange(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                                >
                                                    <option value="">Select person...</option>
                                                    {people.map(p => (
                                                        <option key={p.id} value={p.name}>{p.name} ({p.department})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Department</label>
                                            <select
                                                value={formData.department}
                                                onChange={e => setFormData({...formData, department: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                                disabled={formData.assignmentType === 'Individual' && formData.assignedTo}
                                            >
                                                <option value="">Select department...</option>
                                                {departments.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Location & Status */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={e => setFormData({...formData, location: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                            placeholder="e.g., Station 5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({...formData, status: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Retired">Retired</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Tool Status</label>
                                        <select
                                            value={formData.toolStatus}
                                            onChange={e => setFormData({...formData, toolStatus: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        >
                                            <option value="Present">Present</option>
                                            <option value="Missing">Missing</option>
                                            <option value="Loaned">Loaned</option>
                                            <option value="Warranty/Repair">Warranty/Repair</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Purchase Info */}
                                <div className="border-t pt-4">
                                    <h3 className="font-bold mb-3">Purchase Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Vendor</label>
                                            <select
                                                value={formData.vendor}
                                                onChange={e => setFormData({...formData, vendor: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            >
                                                <option value="">Select vendor...</option>
                                                {vendors.map(v => (
                                                    <option key={v.id} value={v.name}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Purchase Date</label>
                                            <input
                                                type="date"
                                                value={formData.purchaseDate}
                                                onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Cost ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.cost}
                                                onChange={e => setFormData({...formData, cost: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Warranty Expiration</label>
                                            <input
                                                type="date"
                                                value={formData.warranty}
                                                onChange={e => setFormData({...formData, warranty: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Notes</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded"
                                        rows="2"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="btn-equipment-primary flex-1">
                                        {item ? 'Update' : 'Add'} Equipment
                                    </button>
                                    <button type="button" onClick={onClose} className="btn-equipment-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            );
        }

        // Vendor Modal
        function VendorModal({ item, onSave, onClose }) {
            const [formData, setFormData] = useState(item || {
                name: '',
                contactPerson: '',
                phone: '',
                email: '',
                website: '',
                categories: [],
                paymentTerms: 'Net 30',
                preferred: false,
                notes: ''
            });
            const [categoryInput, setCategoryInput] = useState('');

            const addCategory = () => {
                if (categoryInput.trim() && !formData.categories.includes(categoryInput.trim())) {
                    setFormData({ ...formData, categories: [...formData.categories, categoryInput.trim()] });
                    setCategoryInput('');
                }
            };

            return (
                <div className="equipment-modal-overlay" onClick={onClose}>
                    <div className="equipment-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-4">{item ? 'Edit' : 'Add'} Vendor</h2>

                            <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold mb-1">Vendor Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Contact Person</label>
                                        <input
                                            type="text"
                                            value={formData.contactPerson}
                                            onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Website</label>
                                        <input
                                            type="text"
                                            value={formData.website}
                                            onChange={e => setFormData({...formData, website: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Payment Terms</label>
                                        <select
                                            value={formData.paymentTerms}
                                            onChange={e => setFormData({...formData, paymentTerms: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        >
                                            <option value="Net 30">Net 30</option>
                                            <option value="Net 60">Net 60</option>
                                            <option value="Due on Receipt">Due on Receipt</option>
                                            <option value="COD">COD</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.preferred}
                                                onChange={e => setFormData({...formData, preferred: e.target.checked})}
                                                className="w-4 h-4"
                                                style={{ accentColor: '#C8102E' }}
                                            />
                                            <span className="font-medium">Preferred Vendor</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-1">Categories</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={categoryInput}
                                            onChange={e => setCategoryInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded"
                                            placeholder="Add category..."
                                        />
                                        <button type="button" onClick={addCategory} className="btn-equipment-secondary">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.categories.map((cat, i) => (
                                            <span key={i} className="equipment-badge bg-blue-100 text-blue-800 flex items-center gap-1">
                                                {cat}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        categories: formData.categories.filter(c => c !== cat)
                                                    })}
                                                    className="text-red-500 hover:text-red-700 ml-1 font-bold"
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-1">Notes</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded"
                                        rows="2"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="btn-equipment-primary flex-1">{item ? 'Update' : 'Add'} Vendor</button>
                                    <button type="button" onClick={onClose} className="btn-equipment-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            );
        }


// Export for use in App.jsx
window.EquipmentApp = EquipmentApp;

