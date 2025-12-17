// ============================================================================
// MODA RFI MANAGEMENT SYSTEM
// PreCon RFI (Request for Information) tracking and management
// Integrates with existing MODA projects and employees
// ============================================================================

// RFI Manager Component - Add to PreconTab or as standalone tab
function RFIManager({ projects = [], employees = [] }) {
    const { useState, useEffect, useMemo } = React;
    
    // ===== STATE =====
    const [rfis, setRfis] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRFI, setSelectedRFI] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        priority: '',
        project: ''
    });
    const [attachments, setAttachments] = useState([]);

    // ===== COLORS (Autovol Brand) =====
    const COLORS = {
        red: '#C8102E',
        blue: '#0057B8',
        charcoal: '#2D3436',
        gray50: '#F9FAFB',
        gray100: '#F3F4F6',
        gray200: '#E5E7EB',
        gray300: '#D1D5DB',
        gray500: '#6B7280',
        gray600: '#4B5563',
        gray700: '#374151',
        gray900: '#111827',
        green500: '#10B981',
        red500: '#EF4444',
        yellow500: '#F59E0B',
        white: '#FFFFFF'
    };

    // ===== LOAD/SAVE DATA =====
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('moda_rfis') || '[]');
        if (stored.length === 0) {
            // Create sample RFIs for demo
            const samples = createSampleRFIs();
            setRfis(samples);
            localStorage.setItem('moda_rfis', JSON.stringify(samples));
        } else {
            setRfis(stored);
        }
    }, []);

    const saveRFIs = (updatedRFIs) => {
        setRfis(updatedRFIs);
        localStorage.setItem('moda_rfis', JSON.stringify(updatedRFIs));
    };

    // ===== SAMPLE DATA =====
    const createSampleRFIs = () => {
        const projectName = projects.length > 0 ? projects[0].name : 'Sample Project';
        const assignee = employees.length > 0 
            ? `${employees[0].firstName} ${employees[0].lastName}` 
            : 'Unassigned';
        
        return [
            {
                id: 'RFI-2025-001',
                project: projectName,
                subject: 'Wall Framing Height Clarification',
                question: 'Drawing A-102 shows wall height at 9\'-2" but specification calls for 9\'-0". Which dimension should we follow for modules B1L2M01-08?',
                module: 'B1L2M01',
                assignedTo: assignee,
                priority: 'High',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                cc: '',
                status: 'Open',
                createdDate: new Date().toISOString(),
                createdBy: 'Trevor Fletcher',
                responses: [],
                attachments: []
            },
            {
                id: 'RFI-2025-002',
                project: projectName,
                subject: 'MEP Coordination - HVAC/Plumbing Conflict',
                question: 'HVAC ductwork conflicts with plumbing drain in unit stack. Need coordination drawings for resolution.',
                module: 'A-H205',
                assignedTo: assignee,
                priority: 'High',
                dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                cc: '',
                status: 'Open',
                createdDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                createdBy: 'Trevor Fletcher',
                responses: [
                    {
                        author: 'Engineering Team',
                        date: new Date().toISOString(),
                        text: 'Reviewing coordination drawings. Will provide updated routing by EOD.'
                    }
                ],
                attachments: []
            }
        ];
    };

    // ===== UTILITIES =====
    const generateRFINumber = () => {
        const year = new Date().getFullYear();
        const existingRFIs = rfis.filter(r => r.id.startsWith(`RFI-${year}-`));
        const nextNum = existingRFIs.length + 1;
        return `RFI-${year}-${String(nextNum).padStart(3, '0')}`;
    };

    const getRFIStatus = (rfi) => {
        if (rfi.status === 'Closed') return 'Closed';
        if (new Date(rfi.dueDate) < new Date() && rfi.status !== 'Closed') return 'Overdue';
        if (rfi.responses && rfi.responses.length > 0) return 'Pending';
        return 'Open';
    };

    // ===== STATS =====
    const stats = useMemo(() => {
        const open = rfis.filter(r => getRFIStatus(r) === 'Open').length;
        const pending = rfis.filter(r => getRFIStatus(r) === 'Pending').length;
        const overdue = rfis.filter(r => getRFIStatus(r) === 'Overdue').length;
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const closed = rfis.filter(r => 
            r.status === 'Closed' && 
            new Date(r.dateClosed) >= thisMonth
        ).length;

        return { open, pending, overdue, closed };
    }, [rfis]);

    // ===== FILTERING =====
    const filteredRFIs = useMemo(() => {
        return rfis.filter(rfi => {
            const status = getRFIStatus(rfi);
            const matchesSearch = !filters.search || 
                (rfi.id || '').toLowerCase().includes((filters.search || '').toLowerCase()) ||
                (rfi.subject || '').toLowerCase().includes((filters.search || '').toLowerCase()) ||
                (rfi.module || '').toLowerCase().includes((filters.search || '').toLowerCase());
            const matchesStatus = !filters.status || status === filters.status;
            const matchesPriority = !filters.priority || rfi.priority === filters.priority;
            const matchesProject = !filters.project || rfi.project === filters.project;

            return matchesSearch && matchesStatus && matchesPriority && matchesProject;
        });
    }, [rfis, filters]);

    // ===== ACTIONS =====
    const createRFI = (formData) => {
        const newRFI = {
            id: generateRFINumber(),
            ...formData,
            status: 'Open',
            createdDate: new Date().toISOString(),
            createdBy: 'Current User', // Would come from auth
            responses: [],
            attachments: [...attachments]
        };
        saveRFIs([...rfis, newRFI]);
        setAttachments([]);
        setShowCreateModal(false);
    };

    const addResponse = (rfiId, responseText) => {
        const updated = rfis.map(rfi => {
            if (rfi.id === rfiId) {
                const newResponse = {
                    author: 'Current User',
                    date: new Date().toISOString(),
                    text: responseText
                };
                return {
                    ...rfi,
                    responses: [...(rfi.responses || []), newResponse],
                    status: rfi.status === 'Open' ? 'Pending' : rfi.status
                };
            }
            return rfi;
        });
        saveRFIs(updated);
        setSelectedRFI(updated.find(r => r.id === rfiId));
    };

    const closeRFI = (rfiId) => {
        const updated = rfis.map(rfi => {
            if (rfi.id === rfiId) {
                return {
                    ...rfi,
                    status: 'Closed',
                    dateClosed: new Date().toISOString()
                };
            }
            return rfi;
        });
        saveRFIs(updated);
        setShowViewModal(false);
        setSelectedRFI(null);
    };

    const handleFiles = (files) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setAttachments(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // ===== STYLES =====
    const styles = {
        container: {
            padding: '24px',
            background: `linear-gradient(135deg, ${COLORS.gray100} 0%, ${COLORS.gray200} 100%)`,
            minHeight: '100vh'
        },
        header: {
            background: `linear-gradient(135deg, ${COLORS.red} 0%, #A01027 100%)`,
            color: COLORS.white,
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(200, 16, 46, 0.3)',
            marginBottom: '24px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
        },
        statCard: {
            background: COLORS.white,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            textAlign: 'center'
        },
        statValue: {
            fontSize: '32px',
            fontWeight: '700',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: '8px'
        },
        statLabel: {
            fontSize: '13px',
            color: COLORS.gray600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        controls: {
            background: COLORS.white,
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            marginBottom: '24px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center'
        },
        searchInput: {
            flex: 1,
            minWidth: '250px',
            padding: '12px 16px',
            border: `2px solid ${COLORS.gray200}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit'
        },
        select: {
            padding: '10px 14px',
            border: `2px solid ${COLORS.gray200}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            background: COLORS.white
        },
        btnPrimary: {
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            background: `linear-gradient(135deg, ${COLORS.red} 0%, #A01027 100%)`,
            color: COLORS.white,
            boxShadow: '0 4px 12px rgba(200, 16, 46, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
        },
        btnSecondary: {
            padding: '12px 24px',
            border: `2px solid ${COLORS.gray300}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            background: COLORS.white,
            color: COLORS.charcoal
        },
        rfiCard: (status) => ({
            background: COLORS.white,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            borderLeft: `4px solid ${
                status === 'Open' ? COLORS.red :
                status === 'Pending' ? COLORS.yellow500 :
                status === 'Closed' ? COLORS.green500 :
                '#DC2626'
            }`,
            cursor: 'pointer',
            marginBottom: '16px',
            transition: 'all 0.2s'
        }),
        badge: (type, value) => {
            const colors = {
                'status-open': { bg: '#FEE2E2', color: '#991B1B' },
                'status-pending': { bg: '#FEF3C7', color: '#92400E' },
                'status-closed': { bg: '#D1FAE5', color: '#065F46' },
                'status-overdue': { bg: '#FEE2E2', color: '#7F1D1D' },
                'priority-high': { bg: '#FEE2E2', color: '#991B1B' },
                'priority-medium': { bg: '#FEF3C7', color: '#92400E' },
                'priority-low': { bg: '#DBEAFE', color: '#1E40AF' }
            };
            const key = `${type}-${(value || '').toLowerCase()}`;
            const c = colors[key] || { bg: COLORS.gray200, color: COLORS.gray700 };
            return {
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: c.bg,
                color: c.color,
                display: 'inline-block',
                marginRight: '8px'
            };
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        },
        modalContent: {
            background: COLORS.white,
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        },
        modalHeader: {
            background: `linear-gradient(135deg, ${COLORS.red} 0%, #A01027 100%)`,
            color: COLORS.white,
            padding: '24px',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        modalBody: {
            padding: '24px'
        },
        formGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: COLORS.gray700,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
        },
        input: {
            width: '100%',
            padding: '12px 14px',
            border: `2px solid ${COLORS.gray200}`,
            borderRadius: '8px',
            fontSize: '15px',
            fontFamily: 'inherit'
        },
        textarea: {
            width: '100%',
            padding: '12px 14px',
            border: `2px solid ${COLORS.gray200}`,
            borderRadius: '8px',
            fontSize: '15px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '100px'
        }
    };

    // ===== RENDER =====
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600' }}>
                    📋 PreCon RFI Management
                </h1>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                    Request for Information • Timeline Tracking • Module Integration
                </p>
            </div>

            {/* Stats Dashboard */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: COLORS.red }}>{stats.open}</div>
                    <div style={styles.statLabel}>Open RFIs</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: COLORS.yellow500 }}>{stats.pending}</div>
                    <div style={styles.statLabel}>Pending Response</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#DC2626' }}>{stats.overdue}</div>
                    <div style={styles.statLabel}>Overdue</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: COLORS.green500 }}>{stats.closed}</div>
                    <div style={styles.statLabel}>Closed This Month</div>
                </div>
            </div>

            {/* Controls */}
            <div style={styles.controls}>
                <input
                    type="text"
                    placeholder="🔍 Search RFI number, subject, module..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={styles.searchInput}
                />
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    style={styles.select}
                >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                    <option value="Overdue">Overdue</option>
                </select>
                <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    style={styles.select}
                >
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
                <select
                    value={filters.project}
                    onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                    style={styles.select}
                >
                    <option value="">All Projects</option>
                    {projects.map(proj => (
                        <option key={proj.id} value={proj.name}>{proj.name}</option>
                    ))}
                </select>
                <button style={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
                    ➕ New RFI
                </button>
            </div>

            {/* RFI List */}
            <div>
                {filteredRFIs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: COLORS.gray500 }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <p style={{ fontSize: '16px' }}>No RFIs match your filters</p>
                    </div>
                ) : (
                    filteredRFIs.map(rfi => {
                        const status = getRFIStatus(rfi);
                        return (
                            <div
                                key={rfi.id}
                                style={styles.rfiCard(status)}
                                onClick={() => { setSelectedRFI(rfi); setShowViewModal(true); }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: '600', color: COLORS.red }}>
                                        {rfi.id}
                                    </div>
                                    <div>
                                        <span style={styles.badge('status', status)}>{status}</span>
                                        <span style={styles.badge('priority', rfi.priority)}>{rfi.priority}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: COLORS.gray900 }}>
                                    {rfi.subject}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.gray200}` }}>
                                    <div>
                                        <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '2px' }}>Project</div>
                                        <div style={{ color: COLORS.gray900, fontWeight: '500' }}>{rfi.project}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '2px' }}>Assigned To</div>
                                        <div style={{ color: COLORS.gray900, fontWeight: '500' }}>{rfi.assignedTo}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '2px' }}>Due Date</div>
                                        <div style={{ color: COLORS.gray900, fontWeight: '500' }}>{new Date(rfi.dueDate).toLocaleDateString()}</div>
                                    </div>
                                    {rfi.module && (
                                        <div>
                                            <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '2px' }}>Module</div>
                                            <div style={{ color: COLORS.gray900, fontWeight: '500', fontFamily: "'JetBrains Mono', monospace" }}>{rfi.module}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create RFI Modal */}
            {showCreateModal && (
                <CreateRFIModal
                    projects={projects}
                    employees={employees}
                    attachments={attachments}
                    onFileUpload={handleFiles}
                    onRemoveFile={(idx) => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    onClose={() => { setShowCreateModal(false); setAttachments([]); }}
                    onSave={createRFI}
                    styles={styles}
                    COLORS={COLORS}
                />
            )}

            {/* View RFI Modal */}
            {showViewModal && selectedRFI && (
                <ViewRFIModal
                    rfi={selectedRFI}
                    status={getRFIStatus(selectedRFI)}
                    onClose={() => { setShowViewModal(false); setSelectedRFI(null); }}
                    onAddResponse={(text) => addResponse(selectedRFI.id, text)}
                    onCloseRFI={() => closeRFI(selectedRFI.id)}
                    styles={styles}
                    COLORS={COLORS}
                />
            )}
        </div>
    );
}

// ===== CREATE RFI MODAL =====
function CreateRFIModal({ projects, employees, attachments, onFileUpload, onRemoveFile, onClose, onSave, styles, COLORS }) {
    const [formData, setFormData] = React.useState({
        project: '',
        subject: '',
        question: '',
        module: '',
        assignedTo: '',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cc: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={styles.modal} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Create New RFI</h2>
                    <button 
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: COLORS.white, width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}
                    >×</button>
                </div>
                <div style={styles.modalBody}>
                    <form onSubmit={handleSubmit}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Project *</label>
                            <select
                                required
                                value={formData.project}
                                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                style={styles.input}
                            >
                                <option value="">Select Project...</option>
                                {projects.map(proj => (
                                    <option key={proj.id} value={proj.name}>{proj.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Subject *</label>
                            <input
                                type="text"
                                required
                                placeholder="Brief description of the issue"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Question / Request *</label>
                            <textarea
                                required
                                placeholder="Detailed description of what needs clarification..."
                                value={formData.question}
                                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                style={styles.textarea}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Related Module (BLM ID)</label>
                            <input
                                type="text"
                                placeholder="e.g., A-H102, B1L2M01"
                                value={formData.module}
                                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                                style={styles.input}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Assigned To *</label>
                                <select
                                    required
                                    value={formData.assignedTo}
                                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                    style={styles.input}
                                >
                                    <option value="">Select Person...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                                            {emp.firstName} {emp.lastName} - {emp.jobTitle || emp.department}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Priority *</label>
                                <select
                                    required
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    style={styles.input}
                                >
                                    <option value="High">🔴 High - Impacts Schedule</option>
                                    <option value="Medium">🟡 Medium - Normal</option>
                                    <option value="Low">🟢 Low - Non-Critical</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Due Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>CC Recipients</label>
                                <input
                                    type="text"
                                    placeholder="email1@example.com, email2@example.com"
                                    value={formData.cc}
                                    onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Attachments</label>
                            <div 
                                style={{ 
                                    border: `2px dashed ${COLORS.gray300}`, 
                                    borderRadius: '8px', 
                                    padding: '30px', 
                                    textAlign: 'center', 
                                    cursor: 'pointer' 
                                }}
                                onClick={() => document.getElementById('rfi-file-input').click()}
                            >
                                <div>📎 Click to upload files</div>
                                <div style={{ fontSize: '12px', color: COLORS.gray500, marginTop: '8px' }}>
                                    Photos, PDFs, Drawings (Max 50MB each)
                                </div>
                            </div>
                            <input 
                                type="file" 
                                id="rfi-file-input"
                                multiple 
                                accept="image/*,.pdf,.dwg,.docx,.xlsx" 
                                style={{ display: 'none' }} 
                                onChange={(e) => onFileUpload(e.target.files)}
                            />
                            {attachments.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    {attachments.map((att, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: COLORS.gray50, borderRadius: '6px', marginBottom: '8px' }}>
                                            <span>📎 {att.name} ({(att.size / 1024).toFixed(1)} KB)</span>
                                            <button type="button" onClick={() => onRemoveFile(idx)} style={{ background: 'none', border: 'none', color: COLORS.red500, cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" style={{ ...styles.btnPrimary, width: '100%', marginTop: '20px', justifyContent: 'center' }}>
                            💾 Create RFI
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ===== VIEW RFI MODAL =====
function ViewRFIModal({ rfi, status, onClose, onAddResponse, onCloseRFI, styles, COLORS }) {
    const [responseText, setResponseText] = React.useState('');
    const [showResponseInput, setShowResponseInput] = React.useState(false);

    const handleAddResponse = () => {
        if (responseText.trim()) {
            onAddResponse(responseText);
            setResponseText('');
            setShowResponseInput(false);
        }
    };

    return (
        <div style={styles.modal} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>{rfi.id}</h2>
                    <button 
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: COLORS.white, width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}
                    >×</button>
                </div>
                <div style={styles.modalBody}>
                    {/* Status & Priority */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <span style={styles.badge('status', status)}>{status}</span>
                        <span style={styles.badge('priority', rfi.priority)}>{rfi.priority} Priority</span>
                    </div>

                    {/* Subject */}
                    <h3 style={{ fontSize: '20px', marginBottom: '16px', color: COLORS.gray900 }}>{rfi.subject}</h3>

                    {/* Meta Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '4px' }}>Project</div>
                            <div style={{ fontWeight: '600' }}>{rfi.project}</div>
                        </div>
                        <div>
                            <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '4px' }}>Assigned To</div>
                            <div style={{ fontWeight: '600' }}>{rfi.assignedTo}</div>
                        </div>
                        <div>
                            <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '4px' }}>Due Date</div>
                            <div style={{ fontWeight: '600' }}>{new Date(rfi.dueDate).toLocaleDateString()}</div>
                        </div>
                        {rfi.module && (
                            <div>
                                <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '4px' }}>Related Module</div>
                                <div style={{ fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>{rfi.module}</div>
                            </div>
                        )}
                    </div>

                    {/* Question */}
                    <div style={{ background: COLORS.gray50, padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                        <div style={{ color: COLORS.gray500, fontSize: '13px', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>QUESTION</div>
                        <div style={{ lineHeight: '1.6' }}>{rfi.question}</div>
                    </div>

                    {/* Attachments */}
                    {rfi.attachments && rfi.attachments.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontWeight: '600', marginBottom: '12px' }}>Attachments ({rfi.attachments.length})</div>
                            {rfi.attachments.map((att, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: COLORS.gray50, borderRadius: '6px', marginBottom: '8px' }}>
                                    <span>📎 {att.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button style={styles.btnPrimary} onClick={() => setShowResponseInput(true)}>
                            💬 Add Response
                        </button>
                        {status !== 'Closed' && (
                            <button style={styles.btnSecondary} onClick={onCloseRFI}>
                                ✅ Close RFI
                            </button>
                        )}
                    </div>

                    {/* Response Input */}
                    {showResponseInput && (
                        <div style={{ marginBottom: '24px', padding: '16px', background: COLORS.gray50, borderRadius: '8px' }}>
                            <textarea
                                placeholder="Enter your response..."
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                style={{ ...styles.textarea, marginBottom: '12px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={styles.btnPrimary} onClick={handleAddResponse}>Submit Response</button>
                                <button style={styles.btnSecondary} onClick={() => { setShowResponseInput(false); setResponseText(''); }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Response Timeline */}
                    {rfi.responses && rfi.responses.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Response Timeline</h3>
                            {rfi.responses.map((resp, idx) => (
                                <div key={idx} style={{ paddingLeft: '20px', borderLeft: `3px solid ${COLORS.gray300}`, marginLeft: '20px', marginBottom: '16px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-8px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', background: COLORS.blue, border: '3px solid white' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '600', color: COLORS.gray900 }}>{resp.author}</div>
                                        <div style={{ fontSize: '12px', color: COLORS.gray500 }}>{new Date(resp.date).toLocaleString()}</div>
                                    </div>
                                    <div style={{ color: COLORS.gray700, lineHeight: '1.6' }}>{resp.text}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Export for use in MODA
if (typeof window !== 'undefined') {
    window.RFIManager = RFIManager;
}
