// ============================================================================
// MODA TRANSPORTATION MODULE
// Extracted from App.jsx for better maintainability
// ============================================================================

    // ============================================================================
    // MODA TRANSPORTATION MODULE - AV STYLE
    // ============================================================================

    const COLORS = {
      red: '#E31B23',
      blue: '#1E3A5F',
      charcoal: '#1E3A5F',
      lightGray: '#F5F6FA',
      white: '#FFFFFF',
      success: '#10B981',
      warning: '#F59E0B',
      info: '#3B82F6',
    };

    // Transport Stage SVG Icons (black, 16x16)
    const TransportIcon = ({ type, size = 16, color = 'currentColor' }) => {
      const icons = {
        ready: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7M12,17V15H17V17H12M7,17V15H9V17H7M7,13V11H9V13H7M10,13V11H17V13H10Z"/></svg>,
        staged: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12,3L2,12H5V20H19V12H22L12,3M12,8.75A2.25,2.25 0 0,1 14.25,11A2.25,2.25 0 0,1 12,13.25A2.25,2.25 0 0,1 9.75,11A2.25,2.25 0 0,1 12,8.75M12,15C14.67,15 20,16.34 20,19V20H4V19C4,16.34 9.33,15 12,15Z"/></svg>,
        scheduledTransit: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M19,4H5A2,2 0 0,0 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6A2,2 0 0,0 19,4M19,18H5V8H19V18M17,10H7V12H17V10M15,14H7V16H15V14Z"/></svg>,
        scheduledShuttle: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4M18.32,5.68A10,10 0 0,0 12,2V4A8,8 0 0,1 18.32,5.68M20,12A8,8 0 0,1 12,20V22A10,10 0 0,0 22,12H20M5.68,18.32A8,8 0 0,1 4,12H2A10,10 0 0,0 5.68,18.32M12,20A8,8 0 0,1 5.68,18.32L4.27,19.73A10,10 0 0,0 12,22V20M18.32,18.32L19.73,19.73A10,10 0 0,0 22,12H20A8,8 0 0,1 18.32,18.32Z"/></svg>,
        inTransit: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z"/></svg>,
        arrived: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>
      };
      return <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>{icons[type]}</span>;
    };

    const TRANSPORT_STAGES = [
      { id: 'readyForYard', label: 'Ready for Yard', color: '#6366F1', iconType: 'ready' },
      { id: 'stagedInYard', label: 'Staged in Yard', color: '#8B5CF6', iconType: 'staged' },
      { id: 'scheduledTransit', label: 'Scheduled for Transit', color: '#EC4899', iconType: 'scheduledTransit' },
      { id: 'scheduledShuttle', label: 'Scheduled for Shuttle', color: '#F97316', iconType: 'scheduledShuttle' },
      { id: 'inTransit', label: 'In-Transit', color: '#0EA5E9', iconType: 'inTransit' },
      { id: 'arrived', label: 'Arrived to Site', color: '#10B981', iconType: 'arrived' },
    ];

    const DEFAULT_YARDS = [
      { id: 'front', name: 'Front Yard', address: 'Autovol Property - Main Entrance', isAutovol: true },
      { id: 'back', name: 'Back Yard', address: 'Autovol Property - Rear Lot', isAutovol: true },
      { id: 'northside', name: 'Northside', address: '', isAutovol: false },
      { id: 'cherry', name: 'Cherry', address: '', isAutovol: false },
      { id: 'barger', name: 'Barger', address: '', isAutovol: false },
      { id: 'westervelt', name: 'Westervelt', address: '', isAutovol: false },
      { id: 'transit', name: 'Transit', address: 'Temporary Hold', isAutovol: false },
    ];

    const SAMPLE_COMPANIES = [];

    const SAMPLE_MODULES = [];

    // LocalStorage Keys
    const STORAGE_KEYS = {
      modules: 'autovol_transport_modules',
      yards: 'autovol_transport_yards',
      companies: 'autovol_transport_companies',
    };

    function TransportApp() {
      const safeParseJSON = (str, fallback) => {
        if (str && str !== 'undefined' && str !== 'null') {
          try { return JSON.parse(str); } catch (e) { return fallback; }
        }
        return fallback;
      };
      const [activeView, setActiveView] = useState('board');
      const [modules, setModules] = useState([]);
      const [yards, setYards] = useState([]);
      const [companies, setCompanies] = useState([]);
      const [isLoading, setIsLoading] = useState(true);
      const [selectedModule, setSelectedModule] = useState(null);
      const [showAddYard, setShowAddYard] = useState(false);
      const [showAddCompany, setShowAddCompany] = useState(false);
      const [filterProject, setFilterProject] = useState('all');
      const [editingYard, setEditingYard] = useState(null);
      const [editingCompany, setEditingCompany] = useState(null);
      const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
      const [filterStage, setFilterStage] = useState('all');
      const [searchTerm, setSearchTerm] = useState('');
      const [sortBy, setSortBy] = useState('serialNumber');
      const [sortDir, setSortDir] = useState('asc');
      const [projectsList, setProjectsList] = useState([]); // For YardMap dropdown
      const [selectedModuleIds, setSelectedModuleIds] = useState(new Set()); // For bulk selection
      const [showBulkModal, setShowBulkModal] = useState(false); // Bulk update modal

      // Load data from Supabase on mount - pull modules from projects table
      useEffect(() => {
        const loadData = async () => {
          try {
            if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
              console.log('[Transport] Loading data from Supabase...');
              
              // Load yards, companies, and projects
              const [yardsData, companiesData, projectsData] = await Promise.all([
                window.MODA_SUPABASE_DATA.transport.getYards(),
                window.MODA_SUPABASE_DATA.transport.getCompanies(),
                window.MODA_SUPABASE_DATA.projects.getAll()
              ]);
              
              setYards(yardsData.length > 0 ? yardsData : safeParseJSON(localStorage.getItem(STORAGE_KEYS.yards), DEFAULT_YARDS));
              setCompanies(companiesData.length > 0 ? companiesData : safeParseJSON(localStorage.getItem(STORAGE_KEYS.companies), SAMPLE_COMPANIES));
              
              // Store projects for YardMap
              setProjectsList(projectsData || []);
              
              // Extract modules from projects and transform for transport board
              // All modules from projects are potential transport candidates
              const allModules = [];
              (projectsData || []).forEach(project => {
                const projectModules = project.modules || [];
                projectModules.forEach(mod => {
                  // Default stage is 'readyForYard' for all modules
                  allModules.push({
                    id: mod.id || `${project.id}-${mod.serial_number || mod.serialNumber}`,
                    blm: mod.blm_id || mod.hitchBLM || mod.serial_number || mod.serialNumber,
                    serialNumber: mod.serial_number || mod.serialNumber,
                    project: project.name,
                    projectId: project.id,
                    unitType: mod.unit_type || mod.hitchUnit,
                    stage: mod.transport_stage || 'readyForYard',
                    yardId: mod.yard_id || null,
                    transportCompanyId: mod.transport_company_id || null,
                    scheduledDate: mod.scheduled_transport_date || null,
                    // Map BLM fields - support both snake_case and camelCase
                    hitchBLM: mod.hitchBLM || mod.hitch_blm || mod.hitch_blm_id || '',
                    rearBLM: mod.rearBLM || mod.rear_blm || mod.rear_blm_id || '',
                    // Preserve any existing transport data
                    ...mod
                  });
                });
              });
              
              setModules(allModules);
              console.log('[Transport] Loaded from projects:', allModules.length, 'modules,', yardsData.length, 'yards,', companiesData.length, 'companies');
            } else {
              console.log('[Transport] Supabase not available, using localStorage');
              setModules(safeParseJSON(localStorage.getItem(STORAGE_KEYS.modules), SAMPLE_MODULES));
              setYards(safeParseJSON(localStorage.getItem(STORAGE_KEYS.yards), DEFAULT_YARDS));
              setCompanies(safeParseJSON(localStorage.getItem(STORAGE_KEYS.companies), SAMPLE_COMPANIES));
            }
          } catch (error) {
            console.error('[Transport] Error loading data:', error);
            setModules(safeParseJSON(localStorage.getItem(STORAGE_KEYS.modules), SAMPLE_MODULES));
            setYards(safeParseJSON(localStorage.getItem(STORAGE_KEYS.yards), DEFAULT_YARDS));
            setCompanies(safeParseJSON(localStorage.getItem(STORAGE_KEYS.companies), SAMPLE_COMPANIES));
          } finally {
            setIsLoading(false);
          }
        };
        
        const timer = setTimeout(loadData, 500);
        return () => clearTimeout(timer);
      }, []);

      // Save to localStorage as backup
      useEffect(() => { if (!isLoading) localStorage.setItem(STORAGE_KEYS.modules, JSON.stringify(modules)); }, [modules, isLoading]);
      useEffect(() => { if (!isLoading) localStorage.setItem(STORAGE_KEYS.yards, JSON.stringify(yards)); }, [yards, isLoading]);
      useEffect(() => { if (!isLoading) localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(companies)); }, [companies, isLoading]);

      // Sync from unified layer - import modules marked "Ready for Yard" from Station Board
      useEffect(() => {
        const syncFromUnified = () => {
          if (typeof MODA_UNIFIED === 'undefined') return;
          
          // Get modules in YARD phase (production complete, waiting in staging yard)
          const yardModules = MODA_UNIFIED.getByPhase('yard');
          // Also get modules in transport phase (already scheduled)
          const transportModules = MODA_UNIFIED.getByPhase('transport');
          const allTransportModules = [...yardModules, ...transportModules];
          
          // Check for modules not yet in our transport list
          allTransportModules.forEach(unified => {
            const existsInTransport = modules.some(m => 
              m.moduleId === unified.serialNumber || m.id === unified.id
            );
            
            if (!existsInTransport) {
              console.log(`[Transport] Auto-importing ${unified.serialNumber} from Station Board (phase: ${unified.currentPhase})`);
              setModules(prev => [...prev, {
                id: unified.id,
                moduleId: unified.serialNumber,
                blm: unified.specs?.blmHitch || '',
                project: unified.projectName || 'Unknown',
                projectAbbreviation: unified.projectAbbreviation || null,
                stage: 'ready',
                yardId: null,
                transportCompanyId: null,
                scheduledDate: null,
                notes: `Auto-imported from Station Board on ${new Date().toLocaleDateString()}`,
                importedAt: new Date().toISOString()
              }]);
            }
          });
        };
        
        // Run sync on mount and periodically
        syncFromUnified();
        const interval = setInterval(syncFromUnified, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
      }, [modules]);

      const projects = [...new Set(modules.map(m => m.project))];
      const filteredModules = filterProject === 'all' ? modules : modules.filter(m => m.project === filterProject);
      const modulesByStage = TRANSPORT_STAGES.reduce((acc, stage) => {
        acc[stage.id] = filteredModules.filter(m => m.stage === stage.id);
        return acc;
      }, {});

      const updateModuleStage = (moduleId, newStage, additionalData = {}) => {
        setModules(prev => prev.map(m => {
          if (m.id === moduleId) {
            const { stage: oldStage, ...dataWithoutStage } = additionalData;
            const updated = { ...m, ...dataWithoutStage, stage: newStage };
            if (newStage === 'inTransit') updated.departureTime = new Date().toISOString();
            if (newStage === 'arrived') updated.arrivalTime = new Date().toISOString();
            return updated;
          }
          return m;
        }));
        setSelectedModule(null);
      };

      const addYard = (yard) => {
        setYards(prev => [...prev, { ...yard, id: `yard-${Date.now()}` }]);
        setShowAddYard(false);
      };

      const updateYard = (yardId, updates) => {
        setYards(prev => prev.map(y => y.id === yardId ? { ...y, ...updates } : y));
        setEditingYard(null);
      };

      const deleteYard = (yardId) => {
        if (modules.some(m => m.yardId === yardId)) {
          alert('Cannot delete yard with modules staged there. Move modules first.');
          return;
        }
        setYards(prev => prev.filter(y => y.id !== yardId));
      };

      const addCompany = (company) => {
        setCompanies(prev => [...prev, { ...company, id: `tc-${Date.now()}` }]);
        setShowAddCompany(false);
      };

      const updateCompany = (companyId, updates) => {
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updates } : c));
        setEditingCompany(null);
      };

      const deleteCompany = (companyId) => {
        if (modules.some(m => m.transportCompanyId === companyId)) {
          alert('Cannot delete company with assigned modules. Reassign modules first.');
          return;
        }
        setCompanies(prev => prev.filter(c => c.id !== companyId));
      };

      const getCompanyName = (id) => companies.find(c => c.id === id)?.name || 'Unassigned';
      const getYardName = (id) => yards.find(y => y.id === id)?.name || 'Not Staged';

      // Bulk selection helpers
      const toggleModuleSelection = (moduleId) => {
        setSelectedModuleIds(prev => {
          const next = new Set(prev);
          if (next.has(moduleId)) next.delete(moduleId);
          else next.add(moduleId);
          return next;
        });
      };

      const selectAllFiltered = () => {
        setSelectedModuleIds(new Set(filteredModules.map(m => m.id)));
      };

      const clearSelection = () => {
        setSelectedModuleIds(new Set());
      };

      // Bulk update - update stage and yard for selected modules
      const bulkUpdateModules = async (newStage, yardId) => {
        const selectedIds = Array.from(selectedModuleIds);
        if (selectedIds.length === 0) return;

        // Update local state
        setModules(prev => prev.map(m => {
          if (selectedIds.includes(m.id)) {
            return { ...m, stage: newStage, yardId: yardId || m.yardId };
          }
          return m;
        }));

        // Sync to Supabase - update modules in projects table
        if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
          try {
            // Group modules by project
            const modulesByProject = {};
            modules.filter(m => selectedIds.includes(m.id)).forEach(m => {
              if (!modulesByProject[m.projectId]) modulesByProject[m.projectId] = [];
              modulesByProject[m.projectId].push(m);
            });

            // Update each project's modules array
            for (const [projectId, projectModules] of Object.entries(modulesByProject)) {
              const project = projectsList.find(p => p.id === projectId);
              if (!project) continue;

              const updatedModules = (project.modules || []).map(mod => {
                const serial = mod.serial_number || mod.serialNumber;
                const matchingMod = projectModules.find(pm => 
                  (pm.serialNumber === serial) || (pm.serial_number === serial)
                );
                if (matchingMod) {
                  return { ...mod, transport_stage: newStage, yard_id: yardId };
                }
                return mod;
              });

              await window.MODA_SUPABASE_DATA.projects.update(projectId, { modules: updatedModules });
            }
            console.log('[Transport] Bulk updated', selectedIds.length, 'modules to', newStage);
          } catch (err) {
            console.error('[Transport] Bulk update to Supabase failed:', err);
          }
        }

        clearSelection();
        setShowBulkModal(false);
      };

      // ============================================================================
      // STYLES - AV BRANDED
      // ============================================================================
      
      const styles = {
        header: {
          background: COLORS.charcoal,
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `4px solid ${COLORS.red}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        },
        logo: { display: 'flex', alignItems: 'center', gap: '12px' },
        logoIcon: {
          width: '44px',
          height: '44px',
          background: `linear-gradient(135deg, ${COLORS.red} 0%, ${COLORS.blue} 100%)`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.white,
          fontWeight: '800',
          fontSize: '20px',
          fontFamily: "'Inter', sans-serif",
        },
        nav: {
          display: 'flex',
          gap: '4px',
          background: 'rgba(255,255,255,0.1)',
          padding: '4px',
          borderRadius: '8px',
        },
        navBtn: (active) => ({
          padding: '10px 22px',
          background: active ? COLORS.blue : 'transparent',
          color: active ? COLORS.white : 'rgba(255,255,255,0.7)',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 0.2s ease',
        }),
        main: { padding: '24px 32px', maxWidth: '1800px', margin: '0 auto' },
        statsBar: { display: 'flex', gap: '12px', marginBottom: '20px' },
        statCard: (color) => ({
          padding: '14px 22px',
          background: COLORS.white,
          borderRadius: '10px',
          borderLeft: `4px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }),
        boardContainer: {
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '16px',
          alignItems: 'start',
        },
        stageColumn: {
          background: COLORS.white,
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
        stageHeader: (color) => ({
          padding: '14px 16px',
          background: color,
          color: COLORS.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }),
        stageBody: { padding: '12px', maxHeight: '600px', overflowY: 'auto' },
        moduleCard: {
          background: COLORS.lightGray,
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          borderLeft: '3px solid transparent',
        },
        btn: (variant = 'primary') => ({
          padding: '10px 18px',
          background: variant === 'primary' ? COLORS.blue : variant === 'danger' ? COLORS.red : COLORS.lightGray,
          color: variant === 'secondary' ? COLORS.charcoal : COLORS.white,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 0.2s ease',
        }),
        table: {
          width: '100%',
          borderCollapse: 'collapse',
          background: COLORS.white,
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        },
        th: {
          padding: '14px 16px',
          textAlign: 'left',
          background: COLORS.charcoal,
          color: COLORS.white,
          fontWeight: '600',
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
        },
        td: { 
          padding: '14px 16px', 
          borderBottom: '1px solid #eee', 
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          color: COLORS.charcoal,
        },
        modal: {
          position: 'fixed',
          inset: 0,
          background: 'rgba(45, 52, 54, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        },
        modalContent: {
          background: COLORS.white,
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          borderTop: `4px solid ${COLORS.blue}`,
        },
        modalHeader: {
          padding: '20px 24px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        modalBody: { padding: '24px' },
        input: {
          width: '100%',
          padding: '12px 14px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
        },
        label: {
          display: 'block',
          marginBottom: '6px',
          fontWeight: '600',
          fontSize: '13px',
          color: COLORS.charcoal,
          fontFamily: "'Inter', sans-serif",
        },
        fieldGroup: { marginBottom: '16px' },
      };

      // ============================================================================
      // COMPONENTS
      // ============================================================================

      const ModuleCard = ({ module }) => {
        const [hovered, setHovered] = useState(false);
        return (
          <div
            onClick={() => setSelectedModule(module)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              ...styles.moduleCard,
              background: hovered ? '#e8eaed' : COLORS.lightGray,
              borderLeftColor: hovered ? COLORS.blue : 'transparent',
              transform: hovered ? 'translateX(3px)' : 'none',
              boxShadow: hovered ? '0 2px 8px rgba(0,87,184,0.1)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
              <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.charcoal, fontFamily: "'JetBrains Mono', monospace" }}>{module.moduleId}</span>
              {module.scheduledDate && (
                <span style={{ fontSize: '11px', color: COLORS.red, fontWeight: '600' }}>
                  {new Date(module.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace" }}>{module.blm}</div>
            <div style={{ fontSize: '12px', color: COLORS.blue, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {module.projectAbbreviation && (
                <span style={{ fontSize: '10px', padding: '1px 5px', background: '#e0f2fe', color: '#0369a1', borderRadius: '3px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {module.projectAbbreviation}
                </span>
              )}
              {module.project}
            </div>
            {module.yardId && (
              <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>📋 {getYardName(module.yardId)}</div>
            )}
            {module.transportCompanyId && (
              <div style={{ fontSize: '11px', color: '#888' }}>🚛 {getCompanyName(module.transportCompanyId)}</div>
            )}
          </div>
        );
      };

      const StageColumn = ({ stage, modules }) => (
        <div style={styles.stageColumn}>
          <div style={styles.stageHeader(stage.color)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px' }}>
              <TransportIcon type={stage.iconType} color="white" /> {stage.label}
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              padding: '3px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
            }}>
              {modules.length}
            </span>
          </div>
          <div style={styles.stageBody}>
            {modules.map(m => <ModuleCard key={m.id} module={m} />)}
            {modules.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#999', fontSize: '12px' }}>
                No modules
              </div>
            )}
          </div>
        </div>
      );

      const MobileBoardView = () => {
        const [currentStageIndex, setCurrentStageIndex] = useState(0);
        const [isAnimating, setIsAnimating] = useState(false);
        const [slideDirection, setSlideDirection] = useState(null);
        const touchStartX = React.useRef(0);
        const touchEndX = React.useRef(0);
        
        const currentStage = TRANSPORT_STAGES[currentStageIndex];
        const stageModules = modulesByStage[currentStage.id] || [];
        
        // Navigate with smooth animation
        const navigateTo = (newIndex, direction) => {
          if (isAnimating || newIndex < 0 || newIndex >= TRANSPORT_STAGES.length) return;
          setIsAnimating(true);
          setSlideDirection(direction);
          setTimeout(() => {
            setCurrentStageIndex(newIndex);
            setSlideDirection(null);
            setIsAnimating(false);
          }, 150);
        };
        
        const handleTouchStart = (e) => { 
          touchStartX.current = e.touches[0].clientX;
          touchEndX.current = e.touches[0].clientX;
        };
        const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
        const handleTouchEnd = () => {
          const swipeDistance = touchStartX.current - touchEndX.current;
          if (swipeDistance > 50 && currentStageIndex < TRANSPORT_STAGES.length - 1) {
            navigateTo(currentStageIndex + 1, 'left');
          } else if (swipeDistance < -50 && currentStageIndex > 0) {
            navigateTo(currentStageIndex - 1, 'right');
          }
        };
        
        const goToPrevious = () => navigateTo(currentStageIndex - 1, 'right');
        const goToNext = () => navigateTo(currentStageIndex + 1, 'left');
        
        // Animation styles
        const getSlideStyle = () => {
          if (slideDirection === 'left') return { opacity: 0, transform: 'translateX(-20px)', transition: 'all 0.15s ease-out' };
          if (slideDirection === 'right') return { opacity: 0, transform: 'translateX(20px)', transition: 'all 0.15s ease-out' };
          return { opacity: 1, transform: 'translateX(0)', transition: 'all 0.15s ease-out' };
        };
        
        return (
          <div className="mobile-transport-board">
            {/* Stage Pills */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
              {TRANSPORT_STAGES.map((stage, idx) => (
                <button
                  key={stage.id}
                  onClick={() => !isAnimating && setCurrentStageIndex(idx)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: idx === currentStageIndex ? stage.color : '#e5e7eb',
                    color: idx === currentStageIndex ? 'white' : '#666',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {stage.label} ({(modulesByStage[stage.id] || []).length})
                </button>
              ))}
            </div>
            
            {/* Current Stage - with animation */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'pan-y', ...getSlideStyle() }}
            >
              <div style={{
                background: currentStage.color,
                color: 'white',
                padding: '16px',
                borderRadius: '12px 12px 0 0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TransportIcon type={currentStage.iconType} color="white" />
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>{currentStage.label}</span>
                  </div>
                  <span style={{ background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: '12px', fontWeight: '700' }}>
                    {stageModules.length}
                  </span>
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  {currentStageIndex + 1} of {TRANSPORT_STAGES.length} • Swipe or use arrows
                </div>
              </div>
              
              {/* Modules List */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '12px', maxHeight: '400px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {stageModules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>No modules in this stage</div>
                ) : (
                  stageModules.map(module => (
                    <div
                      key={module.id}
                      onClick={() => setSelectedModule(module)}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${currentStage.color}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>{module.moduleId}</span>
                        {module.scheduledDate && (
                          <span style={{ fontSize: '11px', color: COLORS.red, fontWeight: '600' }}>
                            {new Date(module.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: COLORS.blue, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {module.projectAbbreviation && (
                          <span style={{ fontSize: '10px', padding: '1px 5px', background: '#e0f2fe', color: '#0369a1', borderRadius: '3px', fontFamily: "'JetBrains Mono', monospace" }}>
                            {module.projectAbbreviation}
                          </span>
                        )}
                        {module.project}
                      </div>
                      {module.transportCompanyId && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Carrier: {getCompanyName(module.transportCompanyId)}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Navigation Buttons - larger touch targets */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={goToPrevious}
                disabled={currentStageIndex === 0 || isAnimating}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: currentStageIndex === 0 ? 'not-allowed' : 'pointer',
                  background: currentStageIndex === 0 ? '#e5e7eb' : COLORS.charcoal,
                  color: currentStageIndex === 0 ? '#999' : 'white',
                  transition: 'all 0.2s ease',
                  minHeight: '48px',
                }}
              >
                Previous
              </button>
              <button
                onClick={goToNext}
                disabled={currentStageIndex === TRANSPORT_STAGES.length - 1 || isAnimating}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: currentStageIndex === TRANSPORT_STAGES.length - 1 ? 'not-allowed' : 'pointer',
                  background: currentStageIndex === TRANSPORT_STAGES.length - 1 ? '#e5e7eb' : COLORS.charcoal,
                  color: currentStageIndex === TRANSPORT_STAGES.length - 1 ? '#999' : 'white',
                  transition: 'all 0.2s ease',
                  minHeight: '48px',
                }}
              >
                Next
              </button>
            </div>
          </div>
        );
      };

      const BoardView = () => {
        // Mobile detection
        const isMobile = window.useIsMobile ? window.useIsMobile(768) : (window.innerWidth < 768);
        
        // Filter and sort modules for table view
        const getFilteredModules = () => {
          let filtered = [...modules];
          
          // Project filter
          if (filterProject !== 'all') {
            filtered = filtered.filter(m => m.project === filterProject);
          }
          
          // Stage filter
          if (filterStage !== 'all') {
            filtered = filtered.filter(m => m.stage === filterStage);
          }
          
          // Search filter
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(m => 
              m.blm?.toLowerCase().includes(term) ||
              m.project?.toLowerCase().includes(term) ||
              m.serialNumber?.toLowerCase().includes(term)
            );
          }
          
          // Sort
          filtered.sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
          
          return filtered;
        };
        
        const handleSort = (field) => {
          if (sortBy === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
          } else {
            setSortBy(field);
            setSortDir('asc');
          }
        };
        
        const getStageName = (stageId) => {
          const stage = TRANSPORT_STAGES.find(s => s.id === stageId);
          return stage ? stage.label : stageId;
        };
        
        const getStageColor = (stageId) => {
          const stage = TRANSPORT_STAGES.find(s => s.id === stageId);
          return stage ? stage.color : '#999';
        };
        
        const filteredModules = getFilteredModules();
        
        if (isMobile) {
          return (
            <div>
              {/* Mobile Filter */}
              <div style={{ marginBottom: '16px' }}>
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  style={{ ...styles.input, width: '100%' }}
                >
                  <option value="all">All Projects ({modules.length} modules)</option>
                  {projects.map(p => (
                    <option key={p} value={p}>{p} ({modules.filter(m => m.project === p).length})</option>
                  ))}
                </select>
              </div>
              <MobileBoardView />
            </div>
          );
        }
        
        return (
          <div>
            {/* Header with filters and view toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', background: '#e5e7eb', borderRadius: '6px', padding: '2px' }}>
                  <button
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '6px 14px',
                      border: 'none',
                      borderRadius: '4px',
                      background: viewMode === 'table' ? COLORS.blue : 'transparent',
                      color: viewMode === 'table' ? COLORS.white : '#666',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    style={{
                      padding: '6px 14px',
                      border: 'none',
                      borderRadius: '4px',
                      background: viewMode === 'kanban' ? COLORS.blue : 'transparent',
                      color: viewMode === 'kanban' ? COLORS.white : '#666',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Board
                  </button>
                </div>
                
                {/* Project Filter */}
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  style={{ ...styles.input, width: '200px' }}
                >
                  <option value="all">All Projects ({modules.length})</option>
                  {projects.map(p => (
                    <option key={p} value={p}>{p} ({modules.filter(m => m.project === p).length})</option>
                  ))}
                </select>
                
                {/* Stage Filter (Table view only) */}
                {viewMode === 'table' && (
                  <select
                    value={filterStage}
                    onChange={e => setFilterStage(e.target.value)}
                    style={{ ...styles.input, width: '180px' }}
                  >
                    <option value="all">All Stages</option>
                    {TRANSPORT_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                )}
                
                {/* Search (Table view only) */}
                {viewMode === 'table' && (
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ ...styles.input, width: '180px' }}
                  />
                )}
              </div>
              
              {/* Stats */}
              <div style={styles.statsBar}>
                <div style={styles.statCard(COLORS.info)}>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: COLORS.info }}>
                    {modules.filter(m => m.stage === 'inTransit').length}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>In Transit</span>
                </div>
                <div style={styles.statCard(COLORS.warning)}>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: COLORS.warning }}>
                    {modules.filter(m => m.stage === 'scheduledTransit' || m.stage === 'scheduledShuttle').length}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>Scheduled</span>
                </div>
                <div style={styles.statCard(COLORS.success)}>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: COLORS.success }}>
                    {modules.filter(m => m.stage === 'arrived').length}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>Delivered</span>
                </div>
              </div>
            </div>
            
            {/* Bulk Action Bar */}
            {selectedModuleIds.size > 0 && (
              <div style={{ 
                background: COLORS.navy, 
                color: COLORS.white, 
                padding: '12px 20px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: '600' }}>{selectedModuleIds.size} module{selectedModuleIds.size !== 1 ? 's' : ''} selected</span>
                  <button 
                    onClick={clearSelection}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: COLORS.white, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Clear Selection
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setShowBulkModal(true)}
                    style={{ background: COLORS.teal, color: COLORS.white, border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                  >
                    Stage in Yard
                  </button>
                </div>
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div style={{ background: COLORS.white, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ ...styles.table, marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={filteredModules.length > 0 && filteredModules.every(m => selectedModuleIds.has(m.id))}
                          onChange={(e) => e.target.checked ? selectAllFiltered() : clearSelection()}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th 
                        style={{ ...styles.th, cursor: 'pointer' }} 
                        onClick={() => handleSort('serialNumber')}
                      >
                        Serial No. {sortBy === 'serialNumber' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        style={{ ...styles.th, cursor: 'pointer' }} 
                        onClick={() => handleSort('project')}
                      >
                        Project {sortBy === 'project' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={styles.th}>Hitch BLM</th>
                      <th style={styles.th}>Rear BLM</th>
                      <th 
                        style={{ ...styles.th, cursor: 'pointer' }} 
                        onClick={() => handleSort('stage')}
                      >
                        Stage {sortBy === 'stage' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={styles.th}>Yard</th>
                      <th 
                        style={{ ...styles.th, cursor: 'pointer' }} 
                        onClick={() => handleSort('scheduledDate')}
                      >
                        Scheduled {sortBy === 'scheduledDate' && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={{ ...styles.th, width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModules.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: '#999' }}>
                          No modules found matching your filters
                        </td>
                      </tr>
                    ) : (
                      filteredModules.map((module, idx) => {
                        const yard = yards.find(y => y.id === module.yardId);
                        const company = companies.find(c => c.id === module.transportCompanyId);
                        return (
                          <tr key={module.id} style={{ background: selectedModuleIds.has(module.id) ? '#e0f2fe' : (idx % 2 === 0 ? COLORS.white : '#fafafa') }}>
                            <td style={styles.td}>
                              <input 
                                type="checkbox" 
                                checked={selectedModuleIds.has(module.id)}
                                onChange={() => toggleModuleSelection(module.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ ...styles.td, fontWeight: '600', color: COLORS.charcoal }}>
                              {module.serialNumber || module.serial_number}
                            </td>
                            <td style={styles.td}>{module.project}</td>
                            <td style={styles.td}>{module.hitchBLM || '–'}</td>
                            <td style={styles.td}>{module.rearBLM || '–'}</td>
                            <td style={styles.td}>
                              <span style={{
                                background: getStageColor(module.stage) + '20',
                                color: getStageColor(module.stage),
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}>
                                {getStageName(module.stage)}
                              </span>
                            </td>
                            <td style={styles.td}>{yard?.name || '–'}</td>
                            <td style={styles.td}>
                              {module.scheduledDate || module.scheduled_transport_date ? new Date(module.scheduledDate || module.scheduled_transport_date).toLocaleDateString() : '–'}
                            </td>
                            <td style={styles.td}>
                              <button 
                                onClick={() => setSelectedModule(module)} 
                                style={{ ...styles.btn('secondary'), padding: '4px 10px', fontSize: '11px' }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {filteredModules.length > 0 && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fafafa', fontSize: '12px', color: '#666' }}>
                    Showing {filteredModules.length} of {modules.length} modules
                  </div>
                )}
              </div>
            )}
            
            {/* Kanban View */}
            {viewMode === 'kanban' && (
              <div style={styles.boardContainer}>
                {TRANSPORT_STAGES.map(stage => (
                  <StageColumn key={stage.id} stage={stage} modules={modulesByStage[stage.id]} />
                ))}
              </div>
            )}
          </div>
        );
      };

      const YardsView = () => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: COLORS.charcoal, fontSize: '22px', fontWeight: '700' }}>Staging Yards Directory</h2>
            <button 
              onClick={() => setShowAddYard(true)} 
              style={styles.btn('primary')}
              onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
              onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
            >
              + Add Yard
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Yard Name</th>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>Type</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Modules Staged</th>
                <th style={{ ...styles.th, width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {yards.map((yard, idx) => {
                const moduleCount = modules.filter(m => m.yardId === yard.id).length;
                return (
                  <tr key={yard.id} style={{ background: idx % 2 === 0 ? COLORS.white : '#fafafa' }}>
                    <td style={{ ...styles.td, fontWeight: '600', color: COLORS.charcoal }}>{yard.name}</td>
                    <td style={styles.td}>{yard.address || '–'}</td>
                    <td style={styles.td}>
                      {yard.isAutovol ? (
                        <span style={{
                          background: COLORS.red,
                          color: COLORS.white,
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                        }}>AUTOVOL</span>
                      ) : (
                        <span style={{ color: '#666' }}>External</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{
                        background: moduleCount > 0 ? COLORS.blue : '#eee',
                        color: moduleCount > 0 ? COLORS.white : '#999',
                        padding: '5px 16px',
                        borderRadius: '14px',
                        fontWeight: '700',
                        fontSize: '13px',
                      }}>
                        {moduleCount}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setEditingYard(yard)} style={{ ...styles.btn('secondary'), padding: '6px 12px' }}>Edit</button>
                        <button onClick={() => deleteYard(yard.id)} style={{ ...styles.btn('danger'), padding: '6px 12px' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );

      const CompaniesView = () => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: COLORS.charcoal, fontSize: '22px', fontWeight: '700' }}>Transport Companies Directory</h2>
            <button 
              onClick={() => setShowAddCompany(true)} 
              style={styles.btn('primary')}
              onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
              onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
            >
              + Add Company
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Company Name</th>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>Office Phone</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Contact Phone</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Scheduled</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>In Transit</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Delivered</th>
                <th style={{ ...styles.th, width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company, idx) => {
                const assigned = modules.filter(m => m.transportCompanyId === company.id);
                const scheduled = assigned.filter(m => m.stage === 'scheduledTransit' || m.stage === 'scheduledShuttle').length;
                const inTransit = assigned.filter(m => m.stage === 'inTransit').length;
                const delivered = assigned.filter(m => m.stage === 'arrived').length;
                return (
                  <tr key={company.id} style={{ background: idx % 2 === 0 ? COLORS.white : '#fafafa' }}>
                    <td style={{ ...styles.td, fontWeight: '600', color: COLORS.charcoal }}>🚛 {company.name}</td>
                    <td style={{ ...styles.td, fontSize: '12px' }}>{company.address}</td>
                    <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{company.phone}</td>
                    <td style={styles.td}>{company.contact}</td>
                    <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{company.contactPhone || '–'}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ color: scheduled > 0 ? COLORS.warning : '#999', fontWeight: '700' }}>{scheduled}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ color: inTransit > 0 ? COLORS.info : '#999', fontWeight: '700' }}>{inTransit}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ color: delivered > 0 ? COLORS.success : '#999', fontWeight: '700' }}>{delivered}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setEditingCompany(company)} style={{ ...styles.btn('secondary'), padding: '6px 12px' }}>Edit</button>
                        <button onClick={() => deleteCompany(company.id)} style={{ ...styles.btn('danger'), padding: '6px 12px' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );

      const HistoryView = () => {
        const arrivedModules = modules.filter(m => m.stage === 'arrived').sort((a, b) => 
          new Date(b.arrivalTime || 0) - new Date(a.arrivalTime || 0)
        );
        return (
          <div>
            <h2 style={{ margin: '0 0 20px 0', color: COLORS.charcoal, fontSize: '22px', fontWeight: '700' }}>Shipment History</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Module ID</th>
                  <th style={styles.th}>BLM</th>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Transport Company</th>
                  <th style={styles.th}>Scheduled Date</th>
                  <th style={styles.th}>Departure Time</th>
                  <th style={styles.th}>Arrival Time</th>
                  <th style={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {arrivedModules.map((module, idx) => (
                  <tr key={module.id} style={{ background: idx % 2 === 0 ? COLORS.white : '#fafafa' }}>
                    <td style={{ ...styles.td, fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }}>{module.moduleId}</td>
                    <td style={{ ...styles.td, fontFamily: "'JetBrains Mono', monospace", color: '#666' }}>{module.blm}</td>
                    <td style={{ ...styles.td, color: COLORS.blue, fontWeight: '600' }}>{module.project}</td>
                    <td style={styles.td}>{getCompanyName(module.transportCompanyId)}</td>
                    <td style={styles.td}>{module.scheduledDate ? new Date(module.scheduledDate).toLocaleDateString() : '–'}</td>
                    <td style={styles.td}>{module.departureTime ? new Date(module.departureTime).toLocaleString() : '–'}</td>
                    <td style={{ ...styles.td, color: COLORS.success, fontWeight: '600' }}>{module.arrivalTime ? new Date(module.arrivalTime).toLocaleString() : '–'}</td>
                    <td style={{ ...styles.td, fontSize: '12px', color: '#666' }}>{module.notes || '–'}</td>
                  </tr>
                ))}
                {arrivedModules.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...styles.td, textAlign: 'center', padding: '50px', color: '#999' }}>
                      No completed shipments yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      };

      // Module Detail Modal
      const ModuleModal = () => {
        const [localModule, setLocalModule] = useState({ ...selectedModule });
        const [shuttleDestinationYardId, setShuttleDestinationYardId] = useState(selectedModule?.shuttleDestinationYardId || '');
        
        const handleSave = () => {
          setModules(prev => prev.map(m => m.id === localModule.id ? localModule : m));
          setSelectedModule(null);
        };
        
        // Validate shuttle destination - must be off-property yard
        const validateShuttleDestination = () => {
          if (!shuttleDestinationYardId) {
            return { valid: false, error: 'Please select a destination yard for the shuttle' };
          }
          const destinationYard = yards.find(y => y.id === shuttleDestinationYardId);
          if (destinationYard?.isAutovol) {
            return { valid: false, error: 'Shuttles are for moving modules to off-property yards. Please select an external yard location.' };
          }
          return { valid: true };
        };
        
        const getNextStages = () => {
          const stages = [];
          if (localModule.stage === 'ready') stages.push({ id: 'staged', label: 'Move to Yard', requiresYard: true });
          if (localModule.stage === 'staged') {
            stages.push({ id: 'scheduledTransit', label: 'Schedule for Transit', requiresCompany: true, requiresDate: true });
            stages.push({ id: 'scheduledShuttle', label: 'Schedule for Shuttle', requiresDate: true, requiresShuttleDestination: true });
          }
          if (localModule.stage === 'scheduledTransit' || localModule.stage === 'scheduledShuttle') stages.push({ id: 'inTransit', label: 'Mark In-Transit' });
          if (localModule.stage === 'inTransit') stages.push({ id: 'arrived', label: 'Mark Arrived to Site' });
          return stages;
        };
        const currentStage = TRANSPORT_STAGES.find(s => s.id === localModule.stage);

        return (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, borderTop: `4px solid ${currentStage?.color || COLORS.blue}` }}>
              <div style={{ ...styles.modalHeader, background: currentStage?.color, color: COLORS.white }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontFamily: "'JetBrains Mono', monospace" }}>{localModule.moduleId}</h2>
                  <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' }}>{localModule.blm} • {localModule.project}</p>
                </div>
                <button onClick={() => setSelectedModule(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: COLORS.white, width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={{ padding: '16px 18px', background: currentStage?.color + '12', borderRadius: '10px', marginBottom: '20px', borderLeft: `4px solid ${currentStage?.color}` }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Current Status</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: COLORS.charcoal }}>{currentStage?.iconType && <TransportIcon type={currentStage.iconType} size={20} />} {currentStage?.label}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {(localModule.stage === 'ready' || localModule.stage === 'staged') && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Staging Yard</label>
                      <select value={localModule.yardId || ''} onChange={e => setLocalModule({ ...localModule, yardId: e.target.value })} style={styles.input}>
                        <option value="">-- Select Yard --</option>
                        {yards.map(y => <option key={y.id} value={y.id}>{y.name} {y.isAutovol ? '(Autovol)' : ''}</option>)}
                      </select>
                    </div>
                  )}
                  {(localModule.stage === 'staged' || localModule.stage === 'scheduledTransit' || localModule.stage === 'scheduledShuttle') && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Transport Company</label>
                      <select value={localModule.transportCompanyId || ''} onChange={e => setLocalModule({ ...localModule, transportCompanyId: e.target.value })} style={styles.input}>
                        <option value="">-- Select Company --</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {(localModule.stage === 'staged' || localModule.stage === 'scheduledTransit' || localModule.stage === 'scheduledShuttle') && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Scheduled Date</label>
                      <input type="date" value={localModule.scheduledDate || ''} onChange={e => setLocalModule({ ...localModule, scheduledDate: e.target.value })} style={styles.input} />
                    </div>
                  )}
                  {localModule.stage === 'staged' && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Shuttle Destination Yard</label>
                      <select value={shuttleDestinationYardId} onChange={e => setShuttleDestinationYardId(e.target.value)} style={styles.input}>
                        <option value="">-- Select Destination --</option>
                        {yards.filter(y => !y.isAutovol).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                      </select>
                      <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>Required for shuttle (off-property yards only)</p>
                    </div>
                  )}
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Notes</label>
                  <textarea value={localModule.notes || ''} onChange={e => setLocalModule({ ...localModule, notes: e.target.value })} placeholder="Delivery instructions, special handling notes..." rows={3} style={{ ...styles.input, resize: 'vertical' }} />
                </div>
                {getNextStages().length > 0 && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Actions</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {getNextStages().map(nextStage => {
                        const stageInfo = TRANSPORT_STAGES.find(s => s.id === nextStage.id);
                        return (
                          <button
                            key={nextStage.id}
                            onClick={() => {
                              if (nextStage.requiresYard && !localModule.yardId) { alert('Please select a yard first'); return; }
                              if (nextStage.requiresCompany && !localModule.transportCompanyId) { alert('Please select a transport company first'); return; }
                              if (nextStage.requiresDate && !localModule.scheduledDate) { alert('Please set a scheduled date first'); return; }
                              if (nextStage.requiresShuttleDestination) {
                                const validation = validateShuttleDestination();
                                if (!validation.valid) { alert(validation.error); return; }
                              }
                              updateModuleStage(localModule.id, nextStage.id, { ...localModule, shuttleDestinationYardId });
                            }}
                            style={{ padding: '12px 20px', background: stageInfo?.color || COLORS.blue, color: COLORS.white, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
                            onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
                            onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
                          >
                            {stageInfo?.iconType && <TransportIcon type={stageInfo.iconType} color="white" />} {nextStage.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                  <button onClick={() => setSelectedModule(null)} style={{ ...styles.btn('secondary'), flex: 1 }}>Cancel</button>
                  <button 
                    onClick={handleSave} 
                    style={{ ...styles.btn('primary'), flex: 1 }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
                    onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // Add Yard Modal
      const AddYardModal = () => {
        const [newYard, setNewYard] = useState({ name: '', address: '', isAutovol: false });
        return (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: '450px' }}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: COLORS.charcoal }}>Add Staging Yard</h2>
                <button onClick={() => setShowAddYard(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Yard Name *</label>
                  <input type="text" value={newYard.name} onChange={e => setNewYard({ ...newYard, name: e.target.value })} placeholder="e.g., East Lot" style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Address</label>
                  <input type="text" value={newYard.address} onChange={e => setNewYard({ ...newYard, address: e.target.value })} placeholder="Full address..." style={styles.input} />
                </div>
                <div style={{ ...styles.fieldGroup, marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newYard.isAutovol} onChange={e => setNewYard({ ...newYard, isAutovol: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: COLORS.red }} />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Autovol Property</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowAddYard(false)} style={{ ...styles.btn('secondary'), flex: 1 }}>Cancel</button>
                  <button 
                    onClick={() => newYard.name && addYard(newYard)} 
                    style={{ ...styles.btn('primary'), flex: 1 }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
                    onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
                  >
                    Add Yard
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // Edit Yard Modal
      const EditYardModal = () => {
        const [editedYard, setEditedYard] = useState({ ...editingYard });
        return (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: '450px' }}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: COLORS.charcoal }}>Edit Yard</h2>
                <button onClick={() => setEditingYard(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Yard Name *</label>
                  <input type="text" value={editedYard.name} onChange={e => setEditedYard({ ...editedYard, name: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Address</label>
                  <input type="text" value={editedYard.address} onChange={e => setEditedYard({ ...editedYard, address: e.target.value })} style={styles.input} />
                </div>
                <div style={{ ...styles.fieldGroup, marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editedYard.isAutovol} onChange={e => setEditedYard({ ...editedYard, isAutovol: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: COLORS.red }} />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Autovol Property</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setEditingYard(null)} style={{ ...styles.btn('secondary'), flex: 1 }}>Cancel</button>
                  <button 
                    onClick={() => updateYard(editedYard.id, editedYard)} 
                    style={{ ...styles.btn('primary'), flex: 1 }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
                    onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // Add Company Modal
      const AddCompanyModal = () => {
        const [newCompany, setNewCompany] = useState({ name: '', address: '', phone: '', contact: '', contactPhone: '', email: '' });
        return (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: '560px' }}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: COLORS.charcoal }}>Add Transport Company</h2>
                <button onClick={() => setShowAddCompany(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Company Name *</label>
                  <input type="text" value={newCompany.name} onChange={e => setNewCompany({ ...newCompany, name: e.target.value })} placeholder="Company name..." style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Address</label>
                  <input type="text" value={newCompany.address} onChange={e => setNewCompany({ ...newCompany, address: e.target.value })} placeholder="Full address..." style={styles.input} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Office Phone</label>
                    <input type="tel" value={newCompany.phone} onChange={e => setNewCompany({ ...newCompany, phone: e.target.value })} placeholder="(208) 555-0000" style={styles.input} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Email</label>
                    <input type="email" value={newCompany.email} onChange={e => setNewCompany({ ...newCompany, email: e.target.value })} placeholder="dispatch@company.com" style={styles.input} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Contact Name</label>
                    <input type="text" value={newCompany.contact} onChange={e => setNewCompany({ ...newCompany, contact: e.target.value })} placeholder="Primary contact..." style={styles.input} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Contact Phone</label>
                    <input type="tel" value={newCompany.contactPhone} onChange={e => setNewCompany({ ...newCompany, contactPhone: e.target.value })} placeholder="(208) 555-0000" style={styles.input} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setShowAddCompany(false)} style={{ ...styles.btn('secondary'), flex: 1 }}>Cancel</button>
                  <button 
                    onClick={() => newCompany.name && addCompany(newCompany)} 
                    style={{ ...styles.btn('primary'), flex: 1 }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
                    onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
                  >
                    Add Company
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // Edit Company Modal
      const EditCompanyModal = () => {
        const [editedCompany, setEditedCompany] = useState({ ...editingCompany });
        return (
          <div style={styles.modal}>
            <div style={{ ...styles.modalContent, maxWidth: '560px' }}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: COLORS.charcoal }}>Edit Company</h2>
                <button onClick={() => setEditingCompany(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }}>✕</button>
              </div>
              <div style={styles.modalBody}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Company Name *</label>
                  <input type="text" value={editedCompany.name} onChange={e => setEditedCompany({ ...editedCompany, name: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Address</label>
                  <input type="text" value={editedCompany.address} onChange={e => setEditedCompany({ ...editedCompany, address: e.target.value })} style={styles.input} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Office Phone</label>
                    <input type="tel" value={editedCompany.phone} onChange={e => setEditedCompany({ ...editedCompany, phone: e.target.value })} style={styles.input} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Email</label>
                    <input type="email" value={editedCompany.email} onChange={e => setEditedCompany({ ...editedCompany, email: e.target.value })} style={styles.input} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Contact Name</label>
                    <input type="text" value={editedCompany.contact} onChange={e => setEditedCompany({ ...editedCompany, contact: e.target.value })} style={styles.input} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Contact Phone</label>
                    <input type="tel" value={editedCompany.contactPhone} onChange={e => setEditedCompany({ ...editedCompany, contactPhone: e.target.value })} style={styles.input} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button onClick={() => setEditingCompany(null)} style={{ ...styles.btn('secondary'), flex: 1 }}>Cancel</button>
                  <button 
                    onClick={() => updateCompany(editedCompany.id, editedCompany)} 
                    style={{ ...styles.btn('primary'), flex: 1 }}
                    onMouseOver={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 12px rgba(0,87,184,0.3)'; }}
                    onMouseOut={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = 'none'; }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      };

      // ============================================================================
      // MAIN RENDER
      // ============================================================================

      return (
        <div className="p-6">
          {/* Internal Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            {[
              { id: 'board', label: '🚛 Transport Board' },
              { id: 'yards', label: '🏗️ Staging Yards' },
              { id: 'companies', label: '🚚 Transport Companies' },
              { id: 'history', label: '📋 Shipment History' },
              { id: 'yardmap', label: '🗺️ Yard Map' },
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveView(tab.id)} 
                className={`px-4 py-3 font-semibold text-sm transition-all ${
                  activeView === tab.id 
                    ? 'text-white bg-autovol-red border-b-2 border-autovol-red' 
                    : 'text-autovol-navy hover:text-autovol-red'
                }`}
                style={{
                  borderBottom: activeView === tab.id ? '3px solid var(--autovol-red)' : '3px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ minHeight: activeView === 'yardmap' ? '700px' : 'auto' }}>
            {activeView === 'board' && <BoardView />}
            {activeView === 'yards' && <YardsView />}
            {activeView === 'companies' && <CompaniesView />}
            {activeView === 'history' && <HistoryView />}
            {activeView === 'yardmap' && window.YardMapComponent && <window.YardMapComponent projects={projectsList} />}
          </div>

          {/* Modals */}
          {selectedModule && <ModuleModal />}
          {showAddYard && <AddYardModal />}
          {editingYard && <EditYardModal />}
          {showAddCompany && <AddCompanyModal />}
          {editingCompany && <EditCompanyModal />}
          
          {/* Bulk Update Modal */}
          {showBulkModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: COLORS.white, borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90vw' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.navy, marginBottom: '16px' }}>
                  Stage {selectedModuleIds.size} Module{selectedModuleIds.size !== 1 ? 's' : ''} in Yard
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Select Yard</label>
                  <select 
                    id="bulk-yard-select"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  >
                    {yards.map(yard => (
                      <option key={yard.id} value={yard.id}>{yard.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>New Stage</label>
                  <select 
                    id="bulk-stage-select"
                    defaultValue="stagedInYard"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  >
                    {TRANSPORT_STAGES.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setShowBulkModal(false)} 
                    style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', background: COLORS.white, cursor: 'pointer', fontWeight: '500' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const yardId = document.getElementById('bulk-yard-select').value;
                      const stage = document.getElementById('bulk-stage-select').value;
                      bulkUpdateModules(stage, yardId);
                    }}
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', background: COLORS.teal, color: COLORS.white, cursor: 'pointer', fontWeight: '600' }}
                  >
                    Update Modules
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }


// Export for use in App.jsx
window.TransportApp = TransportApp;

