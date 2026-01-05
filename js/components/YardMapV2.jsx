// ============================================================================
// MODA YARD MAP v2.0 - MAIN COMPONENT
// ============================================================================
// Integrated yard mapping with Transport workflow sync
// Workflow: WeeklyBoard → Transport → Yard Map → Shipped Confirmation

const YardMapV2 = ({ projects = [] }) => {
  // Core state
  const [activeTab, setActiveTab] = useState('map');
  const [yardMaps, setYardMaps] = useState([]);
  const [selectedYardMap, setSelectedYardMap] = useState(null);
  const [modules, setModules] = useState([]);
  const [settings, setSettings] = useState({ defaultFontSize: 14, defaultYardMapId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Transport queue
  const [transportQueue, setTransportQueue] = useState([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  
  // Canvas state
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfImage, setPdfImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Module interaction
  const [selectedModule, setSelectedModule] = useState(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawingModule, setDrawingModule] = useState(null);
  const [drawStart, setDrawStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Shipped confirmation modal
  const [shippedModule, setShippedModule] = useState(null);
  const [showShippedModal, setShowShippedModal] = useState(false);
  
  // Stats & Search
  const [stats, setStats] = useState({ total: 0, active: 0, shippedKept: 0, byProject: {} });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', yardType: 'front' });
  const fileInputRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const COLORS = {
    red: '#E31B23', blue: '#1E3A5F', white: '#FFFFFF',
    lightGray: '#F5F6FA', green: '#10B981', orange: '#F59E0B', gray: '#6B7280'
  };

  const YARD_TYPES = [
    { id: 'front', label: 'Front Yard' },
    { id: 'back', label: 'Back Yard' },
    { id: 'staging', label: 'Staging Area' },
    { id: 'overflow', label: 'Overflow' },
    { id: 'other', label: 'Other' }
  ];

  // Data loading
  useEffect(() => {
    loadData();
    return () => {
      if (window.MODA_YARD_MAP_DATA?.YardMapRealtime) {
        window.MODA_YARD_MAP_DATA.YardMapRealtime.unsubscribeAll();
      }
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = window.MODA_YARD_MAP_DATA;
      if (!data?.isAvailable?.()) throw new Error('Yard Map data layer not available');
      
      const mapsData = await data.YardMapData.getYardMaps();
      setYardMaps(mapsData || []);
      
      const settingsData = await data.YardSettingsData.get();
      setSettings({
        defaultFontSize: settingsData.default_font_size || 14,
        defaultYardMapId: settingsData.default_yard_map_id
      });
      
      const queueData = await data.TransportStatusData.getReadyForYardQueue();
      setTransportQueue(queueData || []);
      
      if (settingsData.default_yard_map_id) {
        const defaultMap = mapsData?.find(m => m.id === settingsData.default_yard_map_id);
        if (defaultMap) await selectYardMap(defaultMap);
      }
    } catch (err) {
      console.error('[YardMapV2] Error:', err);
      setError('Failed to load yard map data');
    } finally {
      setIsLoading(false);
    }
  };

  const selectYardMap = async (yardMap) => {
    setSelectedYardMap(yardMap);
    setSelectedModule(null);
    setIsDrawMode(false);
    setSelectedQueueItem(null);
    
    try {
      const data = window.MODA_YARD_MAP_DATA;
      const fullMap = await data.YardMapData.getYardMap(yardMap.id);
      if (fullMap?.pdf_data) await loadPdfImage(fullMap.pdf_data);
      else setPdfImage(null);
      
      const modulesData = await data.YardModuleData.getModules(yardMap.id);
      setModules(modulesData || []);
      
      const statsData = await data.YardModuleData.getStats(yardMap.id);
      setStats(statsData);
      
      setupRealtimeSubscription(yardMap.id);
    } catch (err) {
      console.error('[YardMapV2] Error:', err);
      setError('Failed to load yard map');
    }
  };

  const loadPdfImage = async (pdfData) => {
    try {
      if (!window.pdfjsLib) { setPdfImage(null); return; }
      
      const base64 = pdfData.replace(/^data:application\/pdf;base64,/, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      
      const img = new Image();
      img.src = canvas.toDataURL();
      await new Promise(resolve => { img.onload = resolve; });
      setPdfImage(img);
    } catch (err) {
      console.error('[YardMapV2] PDF error:', err);
      setPdfImage(null);
    }
  };

  const setupRealtimeSubscription = (yardMapId) => {
    const data = window.MODA_YARD_MAP_DATA;
    if (!data?.YardMapRealtime) return;
    
    data.YardMapRealtime.subscribeToYardModules(yardMapId, (payload) => {
      if (payload.eventType === 'INSERT') setModules(prev => [...prev, payload.new]);
      else if (payload.eventType === 'UPDATE') {
        setModules(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        if (payload.new.status === 'shipped_pending') {
          setShippedModule(payload.new);
          setShowShippedModal(true);
        }
      } else if (payload.eventType === 'DELETE') {
        setModules(prev => prev.filter(m => m.id !== payload.old.id));
      }
      refreshStats();
    });
    
    data.YardMapRealtime.subscribeToTransportStatus((payload) => {
      if (payload.new?.status === 'ready_for_yard') {
        setTransportQueue(prev => prev.find(q => q.module_blm === payload.new.module_blm) ? prev : [...prev, payload.new]);
      } else if (payload.new?.status === 'in_yard') {
        setTransportQueue(prev => prev.filter(q => q.module_blm !== payload.new.module_blm));
      } else if (payload.new?.status === 'shipped') {
        const module = modules.find(m => m.blm === payload.new.module_blm);
        if (module) { setShippedModule(module); setShowShippedModal(true); }
      }
    });
  };

  const refreshStats = async () => {
    if (!selectedYardMap) return;
    const statsData = await window.MODA_YARD_MAP_DATA.YardModuleData.getStats(selectedYardMap.id);
    setStats(statsData);
  };

  // Canvas rendering
  useEffect(() => { renderCanvas(); }, [pdfImage, modules, selectedModule, zoom, pan, isDrawMode, drawingModule]);

  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      setZoom(z => Math.max(0.1, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    if (pdfImage) ctx.drawImage(pdfImage, 0, 0);
    else if (selectedYardMap) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No PDF uploaded', 400, 300);
    }
    
    modules.filter(m => m.status !== 'removed').forEach(m => drawModule(ctx, m, m.id === selectedModule?.id));
    
    if (isDrawMode && drawingModule) {
      ctx.strokeStyle = drawingModule.color || COLORS.blue;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(drawingModule.x, drawingModule.y, drawingModule.width, drawingModule.height);
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  const drawModule = (ctx, module, isSelected) => {
    const { x, y, width, height, rotation = 0, color, abbreviation, blm, text_size = 14, status } = module;
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-width/2, -height/2);
    
    ctx.fillStyle = color + (status === 'shipped_kept' ? '40' : '60');
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = status === 'shipped_kept' ? COLORS.gray : color;
    ctx.lineWidth = isSelected ? 3 : 2;
    if (status === 'shipped_kept') ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, 0, width, height);
    ctx.setLineDash([]);
    
    ctx.fillStyle = status === 'shipped_kept' ? COLORS.gray : color;
    ctx.font = `bold ${text_size}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(abbreviation, width/2, height/2 - 8);
    ctx.font = `${text_size - 2}px Inter, sans-serif`;
    ctx.fillText(blm, width/2, height/2 + 10);
    ctx.restore();
    
    if (isSelected) {
      ctx.fillStyle = COLORS.blue;
      [[x,y],[x+width,y],[x,y+height],[x+width,y+height]].forEach(([cx,cy]) => ctx.fillRect(cx-4, cy-4, 8, 8));
      ctx.beginPath(); ctx.arc(x+width/2, y-20, 6, 0, Math.PI*2); ctx.fill();
    }
  };

  // Mouse handlers
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  };

  const findModuleAtPoint = (pt) => {
    for (let i = modules.length - 1; i >= 0; i--) {
      const m = modules[i];
      if (m.status !== 'removed' && pt.x >= m.x && pt.x <= m.x + m.width && pt.y >= m.y && pt.y <= m.y + m.height) return m;
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    if (isDrawMode && selectedQueueItem) {
      setDrawStart(coords);
      setDrawingModule({ x: coords.x, y: coords.y, width: 0, height: 0, color: selectedQueueItem.color || COLORS.blue });
      return;
    }
    const clicked = findModuleAtPoint(coords);
    if (clicked) {
      setSelectedModule(clicked);
      setIsDragging(true);
      setDragOffset({ x: coords.x - clicked.x, y: coords.y - clicked.y });
    } else {
      setSelectedModule(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    if (isDrawMode && drawStart) {
      setDrawingModule(prev => ({
        ...prev,
        x: Math.min(drawStart.x, coords.x), y: Math.min(drawStart.y, coords.y),
        width: Math.abs(coords.x - drawStart.x), height: Math.abs(coords.y - drawStart.y)
      }));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (isDragging && selectedModule) {
      setModules(prev => prev.map(m => m.id === selectedModule.id ? { ...m, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y } : m));
      setSelectedModule(prev => ({ ...prev, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }));
    }
  };

  const handleMouseUp = async () => {
    if (isDrawMode && drawStart && drawingModule?.width > 20 && drawingModule?.height > 20) {
      await createModuleFromQueue(drawingModule);
    }
    if (isDragging && selectedModule) {
      await window.MODA_YARD_MAP_DATA.YardModuleData.updateModuleWithHistory(selectedModule.id, { x: selectedModule.x, y: selectedModule.y }, 'moved');
    }
    setDrawStart(null); setDrawingModule(null); setIsDrawMode(false);
    setIsPanning(false); setIsDragging(false); setIsRotating(false); setIsResizing(false);
  };

  // Module operations
  const createModuleFromQueue = async (drawData) => {
    if (!selectedYardMap || !selectedQueueItem) return;
    const data = window.MODA_YARD_MAP_DATA;
    const project = projects.find(p => p.abbreviation === selectedQueueItem.abbreviation);
    
    try {
      const result = await data.YardModuleData.createModule({
        yard_map_id: selectedYardMap.id,
        blm: selectedQueueItem.module_blm,
        abbreviation: selectedQueueItem.abbreviation || project?.abbreviation || 'UNK',
        color: selectedQueueItem.color || project?.color || COLORS.blue,
        x: drawData.x, y: drawData.y, width: drawData.width, height: drawData.height,
        rotation: 0, text_size: settings.defaultFontSize
      });
      if (result) {
        setModules(prev => [...prev, result]);
        await data.TransportStatusData.markInYard(selectedQueueItem.module_blm, selectedYardMap.id);
        setTransportQueue(prev => prev.filter(q => q.id !== selectedQueueItem.id));
        setSelectedQueueItem(null);
        refreshStats();
      }
    } catch (err) { setError('Failed to place module'); }
  };

  const deleteSelectedModule = async () => {
    if (!selectedModule || !confirm(`Delete ${selectedModule.blm}?`)) return;
    try {
      await window.MODA_YARD_MAP_DATA.YardModuleData.deleteModule(selectedModule.id);
      setModules(prev => prev.filter(m => m.id !== selectedModule.id));
      setSelectedModule(null);
      refreshStats();
    } catch (err) { setError('Failed to delete'); }
  };

  // Shipped handlers
  const handleShippedRemove = async () => {
    if (!shippedModule) return;
    const data = window.MODA_YARD_MAP_DATA;
    await data.YardModuleData.confirmShippedRemove(shippedModule.id);
    await data.TransportStatusData.markDelivered(shippedModule.blm);
    setModules(prev => prev.filter(m => m.id !== shippedModule.id));
    setShowShippedModal(false); setShippedModule(null); refreshStats();
  };

  const handleShippedKeep = async () => {
    if (!shippedModule) return;
    await window.MODA_YARD_MAP_DATA.YardModuleData.confirmShippedKeep(shippedModule.id);
    setModules(prev => prev.map(m => m.id === shippedModule.id ? { ...m, status: 'shipped_kept' } : m));
    setShowShippedModal(false); setShippedModule(null); refreshStats();
  };

  // Yard map management
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file?.type.includes('pdf') || file.size > 5*1024*1024 || !uploadForm.name) {
      alert('Invalid file or missing name'); return;
    }
    setIsUploading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
      });
      const result = await window.MODA_YARD_MAP_DATA.YardMapData.createYardMap({
        name: uploadForm.name, yard_type: uploadForm.yardType, pdf_data: base64
      });
      if (result) { setYardMaps(prev => [...prev, result]); setUploadForm({ name: '', yardType: 'front' }); }
    } catch (err) { alert('Upload failed'); }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteYardMap = async (id) => {
    if (!confirm('Delete yard map?')) return;
    await window.MODA_YARD_MAP_DATA.YardMapData.deleteYardMap(id);
    setYardMaps(prev => prev.filter(m => m.id !== id));
    if (selectedYardMap?.id === id) { setSelectedYardMap(null); setModules([]); setPdfImage(null); }
  };

  const setAsDefault = async (id) => {
    await window.MODA_YARD_MAP_DATA.YardSettingsData.setDefaultYardMap(id);
    setSettings(prev => ({ ...prev, defaultYardMapId: id }));
  };

  // Filtered modules
  const filteredModules = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return modules.filter(m => m.status !== 'removed' && (!term || m.blm.toLowerCase().includes(term) || m.abbreviation.toLowerCase().includes(term)));
  }, [modules, searchTerm]);

  const styles = {
    btn: (v) => ({ padding: '8px 16px', background: v === 'primary' ? COLORS.blue : v === 'danger' ? COLORS.red : v === 'success' ? COLORS.green : '#e5e7eb', color: v === 'secondary' ? '#333' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }),
    input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }
  };

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}><div>Loading Yard Map...</div></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', background: '#fff', borderRadius: '12px', overflow: 'hidden', ...(isFullscreen ? { position: 'fixed', inset: 0, zIndex: 9999 } : {}) }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fafafa', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          {['map', 'settings'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '12px 24px', border: 'none', background: activeTab === t ? '#fff' : 'transparent', color: activeTab === t ? COLORS.blue : '#666', fontWeight: '600', cursor: 'pointer', borderBottom: activeTab === t ? `3px solid ${COLORS.blue}` : '3px solid transparent' }}>
              {t === 'map' ? 'Yard Map' : 'Settings'}
            </button>
          ))}
        </div>
        <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ ...styles.btn(isFullscreen ? 'danger' : 'primary'), margin: '8px 16px' }}>
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', flexWrap: 'wrap' }}>
              <select value={selectedYardMap?.id || ''} onChange={(e) => { const m = yardMaps.find(x => x.id === e.target.value); if (m) selectYardMap(m); }} style={{ ...styles.input, minWidth: '200px' }}>
                <option value="">-- Select Yard Map --</option>
                {yardMaps.map(m => <option key={m.id} value={m.id}>{m.name} ({m.yard_type}){m.id === settings.defaultYardMapId ? ' (Default)' : ''}</option>)}
              </select>
              <span style={{ fontSize: '12px', color: '#666' }}>Zoom: {Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} style={styles.btn('secondary')}>+</button>
              <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} style={styles.btn('secondary')}>-</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={styles.btn('secondary')}>Reset</button>
              {isDrawMode && <span style={{ padding: '6px 12px', background: COLORS.green + '20', borderRadius: '6px', color: COLORS.green, fontWeight: '600' }}>Draw Mode Active</span>}
              {selectedModule && <button onClick={deleteSelectedModule} style={styles.btn('danger')}>Delete Selected</button>}
            </div>
            {/* Canvas */}
            <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isDrawMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}>
              <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
              {!selectedYardMap && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.9)' }}><div style={{ textAlign: 'center', color: '#666' }}><div style={{ fontSize: '18px', fontWeight: '600' }}>No Yard Map Selected</div><div style={{ fontSize: '14px' }}>Select from dropdown or upload in Settings</div></div></div>}
            </div>
          </div>
          {/* Sidebar */}
          {selectedYardMap && (
            <div style={{ width: '320px', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fafafa', overflowY: 'auto' }}>
              {/* Queue */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span style={{ fontWeight: '700', color: COLORS.blue }}>Transport Queue</span><span style={{ background: transportQueue.length ? COLORS.green : '#e5e7eb', color: transportQueue.length ? '#fff' : '#666', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{transportQueue.length}</span></div>
                {transportQueue.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>No modules ready</div> : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {transportQueue.map(item => (
                      <div key={item.id} onClick={() => { setSelectedQueueItem(item); setIsDrawMode(true); }} style={{ padding: '10px 12px', background: selectedQueueItem?.id === item.id ? COLORS.blue + '15' : '#fff', borderRadius: '6px', marginBottom: '6px', cursor: 'pointer', border: selectedQueueItem?.id === item.id ? `2px solid ${COLORS.blue}` : '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.blue }}>{item.module_blm}</div>
                        {selectedQueueItem?.id === item.id && <div style={{ fontSize: '11px', color: COLORS.green, marginTop: '4px', fontWeight: '600' }}>Click & drag on map</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Stats */}
              <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '700', color: COLORS.blue, marginBottom: '12px' }}>Statistics</div>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Total</span><span style={{ fontWeight: '700', color: COLORS.blue }}>{stats.total}</span></div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginTop: '8px' }}>
                    <span><span style={{ color: COLORS.green }}>Active:</span> {stats.active}</span>
                    <span><span style={{ color: COLORS.gray }}>Shipped:</span> {stats.shippedKept}</span>
                  </div>
                </div>
              </div>
              {/* Module Log */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: '700', color: COLORS.blue, marginBottom: '12px' }}>Module Log</div>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...styles.input, width: '100%', marginBottom: '12px' }} />
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredModules.map(m => (
                    <div key={m.id} onClick={() => setSelectedModule(m)} style={{ padding: '10px 12px', background: selectedModule?.id === m.id ? COLORS.blue + '15' : '#fff', borderRadius: '6px', marginBottom: '6px', cursor: 'pointer', border: selectedModule?.id === m.id ? `2px solid ${COLORS.blue}` : '1px solid #e5e7eb', opacity: m.status === 'shipped_kept' ? 0.7 : 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: m.status === 'shipped_kept' ? COLORS.gray : m.color }}>{m.abbreviation}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{m.blm}</div>
                    </div>
                  ))}
                  {filteredModules.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No modules</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ padding: '24px', maxWidth: '800px', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 0 24px 0', color: COLORS.blue }}>Yard Map Settings</h2>
          <div style={{ background: '#fafafa', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Upload New Yard Map</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Name *</label><input type="text" value={uploadForm.name} onChange={(e) => setUploadForm(p => ({ ...p, name: e.target.value }))} style={{ ...styles.input, width: '100%' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px', color: '#666' }}>Type</label><select value={uploadForm.yardType} onChange={(e) => setUploadForm(p => ({ ...p, yardType: e.target.value }))} style={{ ...styles.input, width: '100%' }}>{YARD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || !uploadForm.name} style={{ ...styles.btn('primary'), opacity: (isUploading || !uploadForm.name) ? 0.5 : 1 }}>{isUploading ? 'Uploading...' : 'Select PDF & Upload'}</button>
          </div>
          <h3 style={{ margin: '0 0 16px 0' }}>Existing Yard Maps</h3>
          {yardMaps.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#999', background: '#fafafa', borderRadius: '8px' }}>No yard maps</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: COLORS.blue, color: '#fff' }}><th style={{ padding: '12px', textAlign: 'left' }}>Name</th><th style={{ padding: '12px', textAlign: 'left' }}>Type</th><th style={{ padding: '12px', textAlign: 'center' }}>Default</th><th style={{ padding: '12px', textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>{yardMaps.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{m.name}</td>
                  <td style={{ padding: '12px' }}>{YARD_TYPES.find(t => t.id === m.yard_type)?.label || m.yard_type}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{m.id === settings.defaultYardMapId ? <span style={{ color: COLORS.green, fontWeight: '600' }}>Default</span> : <button onClick={() => setAsDefault(m.id)} style={styles.btn('secondary')}>Set Default</button>}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}><button onClick={() => deleteYardMap(m.id)} style={styles.btn('danger')}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* Shipped Modal */}
      {showShippedModal && shippedModule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ margin: '0 0 16px 0', color: COLORS.blue }}>Module Marked Shipped</h3>
            <div style={{ background: '#f0f0f0', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '700', color: shippedModule.color }}>{shippedModule.abbreviation}</div>
              <div style={{ color: '#666' }}>{shippedModule.blm}</div>
            </div>
            <p style={{ color: '#666', marginBottom: '20px' }}>Remove from yard map?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleShippedRemove} style={{ ...styles.btn('success'), flex: 1 }}>Yes, Remove</button>
              <button onClick={handleShippedKeep} style={{ ...styles.btn('secondary'), flex: 1 }}>No, Keep</button>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '12px 20px', background: COLORS.red, color: '#fff', borderRadius: '8px' }}>{error}<button onClick={() => setError(null)} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button></div>}
    </div>
  );
};

window.YardMapV2 = YardMapV2;
