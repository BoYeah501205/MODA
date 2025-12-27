// ============================================================================
// MODA YARD MAP COMPONENT
// Visual yard mapping with PDF backgrounds and interactive module placement
// ============================================================================

const YardMapComponent = ({ projects = [] }) => {
  const [activeTab, setActiveTab] = useState('map');
  const [yardMaps, setYardMaps] = useState([]);
  const [selectedYardMap, setSelectedYardMap] = useState(null);
  const [modules, setModules] = useState([]);
  const [settings, setSettings] = useState({ defaultFontSize: 14, defaultYardMapId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Canvas state
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfImage, setPdfImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Module interaction state
  const [selectedModule, setSelectedModule] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // New module form
  const [newModuleForm, setNewModuleForm] = useState({
    projectId: '',
    blm: '',
    abbreviation: '',
    color: '#3B82F6'
  });
  const [isDrawMode, setIsDrawMode] = useState(false);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', yardType: 'front' });
  const fileInputRef = useRef(null);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Colors
  const COLORS = {
    red: '#E31B23',
    blue: '#1E3A5F',
    white: '#FFFFFF',
    lightGray: '#F5F6FA',
  };

  // Yard types
  const YARD_TYPES = [
    { id: 'front', label: 'Front Yard' },
    { id: 'back', label: 'Back Yard' },
    { id: 'staging', label: 'Staging Area' },
    { id: 'overflow', label: 'Overflow' },
    { id: 'other', label: 'Other' }
  ];

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
        // Load yard maps
        const mapsData = await supabaseFetch('yard_maps?select=id,name,yard_type,created_at,updated_at&order=name');
        setYardMaps(mapsData || []);
        
        // Load settings
        const settingsData = await supabaseFetch('yard_settings?id=eq.1');
        if (settingsData && settingsData.length > 0) {
          setSettings({
            defaultFontSize: settingsData[0].default_font_size || 14,
            defaultYardMapId: settingsData[0].default_yard_map_id
          });
          
          // Auto-select default yard map
          if (settingsData[0].default_yard_map_id) {
            const defaultMap = mapsData?.find(m => m.id === settingsData[0].default_yard_map_id);
            if (defaultMap) {
              await selectYardMap(defaultMap);
            }
          }
        }
      }
    } catch (err) {
      console.error('[YardMap] Error loading data:', err);
      setError('Failed to load yard map data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for Supabase fetch
  const supabaseFetch = async (endpoint, options = {}) => {
    const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';
    
    let accessToken = null;
    try {
      const storageKey = `sb-syreuphexagezawjyjgt-auth-token`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        accessToken = parsed?.access_token;
      }
    } catch (e) {}
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
      ...options.headers
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'Request failed');
    }
    
    const text = await response.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text);
  };

  // ============================================================================
  // YARD MAP SELECTION & PDF LOADING
  // ============================================================================

  const selectYardMap = async (yardMap) => {
    setSelectedYardMap(yardMap);
    setSelectedModule(null);
    setIsDrawMode(false);
    
    try {
      // Load full yard map with PDF data
      const fullMap = await supabaseFetch(`yard_maps?id=eq.${yardMap.id}&select=*`);
      if (fullMap && fullMap.length > 0 && fullMap[0].pdf_data) {
        await loadPdfImage(fullMap[0].pdf_data);
      } else {
        setPdfImage(null);
      }
      
      // Load modules for this yard map
      const modulesData = await supabaseFetch(`yard_modules?yard_map_id=eq.${yardMap.id}&select=*`);
      setModules(modulesData || []);
    } catch (err) {
      console.error('[YardMap] Error loading yard map:', err);
      setError('Failed to load yard map');
    }
  };

  const loadPdfImage = async (pdfData) => {
    try {
      // Check if pdf.js is available
      if (!window.pdfjsLib) {
        console.warn('[YardMap] PDF.js not loaded, showing placeholder');
        setPdfImage(null);
        return;
      }
      
      // Convert base64 to array buffer
      const base64 = pdfData.replace(/^data:application\/pdf;base64,/, '');
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Load PDF
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      
      // Render to canvas
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      // Convert to image
      const img = new Image();
      img.src = canvas.toDataURL();
      await new Promise(resolve => { img.onload = resolve; });
      
      setPdfImage(img);
    } catch (err) {
      console.error('[YardMap] Error loading PDF:', err);
      setPdfImage(null);
    }
  };

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  useEffect(() => {
    renderCanvas();
  }, [pdfImage, modules, selectedModule, zoom, pan, drawStart, drawEnd, isDrawing]);

  // Use ref to track zoom for wheel handler (avoids re-registering listener)
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Add non-passive wheel event listener to prevent scroll while zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleWheelEvent = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, zoomRef.current * delta));
      setZoom(newZoom);
    };
    
    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelEvent);
  }, []); // Empty dependency - register once on mount

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!container) return;
    
    // Set canvas size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Clear
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw PDF background
    if (pdfImage) {
      ctx.drawImage(pdfImage, 0, 0);
    } else if (selectedYardMap) {
      // Placeholder when no PDF
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No PDF uploaded for this yard map', 400, 300);
    }
    
    // Draw modules
    modules.forEach(module => {
      drawModule(ctx, module, module.id === selectedModule?.id);
    });
    
    // Draw preview while drawing
    if (isDrawing && drawStart && drawEnd) {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x);
      const height = Math.abs(drawEnd.y - drawStart.y);
      
      ctx.strokeStyle = newModuleForm.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  };

  const drawModule = (ctx, module, isSelected) => {
    const { x, y, width, height, rotation = 0, color, abbreviation, blm, text_size = 14 } = module;
    
    ctx.save();
    
    // Translate to center for rotation
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
    
    // Draw rectangle
    ctx.fillStyle = color + '40'; // 25% opacity
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(0, 0, width, height);
    
    // Draw text
    ctx.fillStyle = color;
    ctx.font = `bold ${text_size}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw abbreviation
    ctx.fillText(abbreviation, width / 2, height / 2 - 8);
    
    // Draw BLM
    ctx.font = `${text_size - 2}px Inter, sans-serif`;
    ctx.fillText(blm, width / 2, height / 2 + 10);
    
    ctx.restore();
    
    // Draw selection handles if selected
    if (isSelected) {
      drawSelectionHandles(ctx, module);
    }
  };

  const drawSelectionHandles = (ctx, module) => {
    const { x, y, width, height } = module;
    const handleSize = 8;
    
    ctx.fillStyle = COLORS.blue;
    
    // Corner handles for resize
    const corners = [
      { x: x, y: y },
      { x: x + width, y: y },
      { x: x, y: y + height },
      { x: x + width, y: y + height }
    ];
    
    corners.forEach(corner => {
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
    });
    
    // Rotation handle (top center)
    ctx.beginPath();
    ctx.arc(x + width / 2, y - 20, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Line to rotation handle
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y - 14);
    ctx.stroke();
  };

  // ============================================================================
  // MOUSE HANDLERS
  // ============================================================================

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    
    if (isDrawMode) {
      setIsDrawing(true);
      setDrawStart(coords);
      setDrawEnd(coords);
      return;
    }
    
    // Check if clicking on a module
    const clickedModule = findModuleAtPoint(coords);
    
    if (clickedModule) {
      setSelectedModule(clickedModule);
      
      // Check if clicking on rotation handle
      if (isOnRotationHandle(coords, clickedModule)) {
        setIsRotating(true);
        return;
      }
      
      // Check if clicking on resize handle
      const resizeHandle = getResizeHandle(coords, clickedModule);
      if (resizeHandle) {
        setIsResizing(resizeHandle);
        return;
      }
      
      // Start dragging
      setIsDragging(true);
      setDragOffset({
        x: coords.x - clickedModule.x,
        y: coords.y - clickedModule.y
      });
    } else {
      setSelectedModule(null);
      // Start panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    
    if (isDrawing) {
      setDrawEnd(coords);
      return;
    }
    
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }
    
    if (isDragging && selectedModule) {
      updateModule(selectedModule.id, {
        x: coords.x - dragOffset.x,
        y: coords.y - dragOffset.y
      });
      return;
    }
    
    if (isRotating && selectedModule) {
      const centerX = selectedModule.x + selectedModule.width / 2;
      const centerY = selectedModule.y + selectedModule.height / 2;
      const angle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI) + 90;
      const snappedAngle = Math.round(angle / 5) * 5; // Snap to 5 degree increments
      updateModule(selectedModule.id, { rotation: snappedAngle });
      return;
    }
    
    if (isResizing && selectedModule) {
      const newProps = calculateResize(selectedModule, coords, isResizing);
      updateModule(selectedModule.id, newProps);
      return;
    }
  };

  const handleMouseUp = async () => {
    if (isDrawing && drawStart && drawEnd) {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x);
      const height = Math.abs(drawEnd.y - drawStart.y);
      
      if (width > 20 && height > 20) {
        await createModule(x, y, width, height);
      }
      
      setIsDrawing(false);
      setDrawStart(null);
      setDrawEnd(null);
      setIsDrawMode(false);
    }
    
    // Save module position after drag/rotate/resize
    if ((isDragging || isRotating || isResizing) && selectedModule) {
      await saveModuleToSupabase(selectedModule);
    }
    
    setIsPanning(false);
    setIsDragging(false);
    setIsRotating(false);
    setIsResizing(false);
  };

  // ============================================================================
  // MODULE HELPERS
  // ============================================================================

  const findModuleAtPoint = (point) => {
    // Check in reverse order (top-most first)
    for (let i = modules.length - 1; i >= 0; i--) {
      const m = modules[i];
      if (point.x >= m.x && point.x <= m.x + m.width &&
          point.y >= m.y && point.y <= m.y + m.height) {
        return m;
      }
    }
    return null;
  };

  const isOnRotationHandle = (point, module) => {
    const handleX = module.x + module.width / 2;
    const handleY = module.y - 20;
    const distance = Math.sqrt((point.x - handleX) ** 2 + (point.y - handleY) ** 2);
    return distance < 10;
  };

  const getResizeHandle = (point, module) => {
    const handleSize = 12;
    const corners = {
      'nw': { x: module.x, y: module.y },
      'ne': { x: module.x + module.width, y: module.y },
      'sw': { x: module.x, y: module.y + module.height },
      'se': { x: module.x + module.width, y: module.y + module.height }
    };
    
    for (const [key, corner] of Object.entries(corners)) {
      if (Math.abs(point.x - corner.x) < handleSize && Math.abs(point.y - corner.y) < handleSize) {
        return key;
      }
    }
    return null;
  };

  const calculateResize = (module, point, handle) => {
    let { x, y, width, height } = module;
    
    switch (handle) {
      case 'se':
        width = Math.max(30, point.x - x);
        height = Math.max(30, point.y - y);
        break;
      case 'sw':
        width = Math.max(30, x + width - point.x);
        height = Math.max(30, point.y - y);
        x = point.x;
        break;
      case 'ne':
        width = Math.max(30, point.x - x);
        height = Math.max(30, y + height - point.y);
        y = point.y;
        break;
      case 'nw':
        width = Math.max(30, x + width - point.x);
        height = Math.max(30, y + height - point.y);
        x = point.x;
        y = point.y;
        break;
    }
    
    return { x, y, width, height };
  };

  const updateModule = (moduleId, updates) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, ...updates } : m
    ));
    if (selectedModule?.id === moduleId) {
      setSelectedModule(prev => ({ ...prev, ...updates }));
    }
  };

  // ============================================================================
  // SUPABASE OPERATIONS
  // ============================================================================

  const createModule = async (x, y, width, height) => {
    if (!selectedYardMap || !newModuleForm.blm || !newModuleForm.abbreviation) {
      alert('Please fill in BLM and abbreviation before drawing');
      return;
    }
    
    const newModule = {
      yard_map_id: selectedYardMap.id,
      blm: newModuleForm.blm,
      abbreviation: newModuleForm.abbreviation,
      color: newModuleForm.color,
      x, y, width, height,
      rotation: 0,
      text_size: settings.defaultFontSize
    };
    
    try {
      const result = await supabaseFetch('yard_modules?select=*', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(newModule)
      });
      
      if (result && result.length > 0) {
        setModules(prev => [...prev, result[0]]);
        setNewModuleForm({ projectId: '', blm: '', abbreviation: '', color: '#3B82F6' });
      }
    } catch (err) {
      console.error('[YardMap] Error creating module:', err);
      alert('Failed to create module');
    }
  };

  const saveModuleToSupabase = async (module) => {
    try {
      await supabaseFetch(`yard_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          x: module.x,
          y: module.y,
          width: module.width,
          height: module.height,
          rotation: module.rotation,
          text_size: module.text_size,
          updated_at: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('[YardMap] Error saving module:', err);
    }
  };

  const deleteSelectedModule = async () => {
    if (!selectedModule) return;
    
    if (!confirm(`Delete module ${selectedModule.blm}?`)) return;
    
    try {
      await supabaseFetch(`yard_modules?id=eq.${selectedModule.id}`, {
        method: 'DELETE'
      });
      setModules(prev => prev.filter(m => m.id !== selectedModule.id));
      setSelectedModule(null);
    } catch (err) {
      console.error('[YardMap] Error deleting module:', err);
      alert('Failed to delete module');
    }
  };

  // ============================================================================
  // YARD MAP MANAGEMENT
  // ============================================================================

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes('pdf')) {
      alert('Please select a PDF file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    if (!uploadForm.name) {
      alert('Please enter a name for the yard map');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Save to Supabase
      const result = await supabaseFetch('yard_maps?select=*', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          name: uploadForm.name,
          yard_type: uploadForm.yardType,
          pdf_data: base64
        })
      });
      
      if (result && result.length > 0) {
        setYardMaps(prev => [...prev, result[0]]);
        setUploadForm({ name: '', yardType: 'front' });
        alert('Yard map uploaded successfully!');
      }
    } catch (err) {
      console.error('[YardMap] Error uploading:', err);
      alert('Failed to upload yard map');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteYardMap = async (mapId) => {
    if (!confirm('Delete this yard map and all its modules?')) return;
    
    try {
      await supabaseFetch(`yard_maps?id=eq.${mapId}`, { method: 'DELETE' });
      setYardMaps(prev => prev.filter(m => m.id !== mapId));
      if (selectedYardMap?.id === mapId) {
        setSelectedYardMap(null);
        setModules([]);
        setPdfImage(null);
      }
    } catch (err) {
      console.error('[YardMap] Error deleting yard map:', err);
      alert('Failed to delete yard map');
    }
  };

  const setAsDefault = async (mapId) => {
    try {
      await supabaseFetch('yard_settings?id=eq.1', {
        method: 'PATCH',
        body: JSON.stringify({ default_yard_map_id: mapId })
      });
      setSettings(prev => ({ ...prev, defaultYardMapId: mapId }));
    } catch (err) {
      console.error('[YardMap] Error setting default:', err);
    }
  };

  // ============================================================================
  // STYLES
  // ============================================================================

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '600px',
      background: COLORS.white,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb',
      background: '#fafafa',
      flexWrap: 'wrap'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '14px',
      minWidth: '200px'
    },
    input: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      fontSize: '14px'
    },
    btn: (variant = 'primary') => ({
      padding: '8px 16px',
      background: variant === 'primary' ? COLORS.blue : variant === 'danger' ? COLORS.red : '#e5e7eb',
      color: variant === 'secondary' ? '#333' : COLORS.white,
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      transition: 'all 0.2s ease'
    }),
    canvasContainer: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      cursor: isDrawMode ? 'crosshair' : isPanning ? 'grabbing' : 'grab'
    },
    canvas: {
      display: 'block',
      width: '100%',
      height: '100%'
    },
    sidebar: {
      width: '280px',
      borderLeft: '1px solid #e5e7eb',
      padding: '16px',
      overflowY: 'auto',
      background: '#fafafa'
    },
    moduleForm: {
      background: COLORS.white,
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
      border: '1px solid #e5e7eb'
    },
    fieldGroup: {
      marginBottom: '12px'
    },
    label: {
      display: 'block',
      marginBottom: '4px',
      fontWeight: '600',
      fontSize: '12px',
      color: '#666'
    },
    modulesList: {
      maxHeight: '300px',
      overflowY: 'auto'
    },
    moduleItem: (isSelected) => ({
      padding: '10px 12px',
      background: isSelected ? COLORS.blue + '15' : COLORS.white,
      borderRadius: '6px',
      marginBottom: '6px',
      cursor: 'pointer',
      border: isSelected ? `2px solid ${COLORS.blue}` : '1px solid #e5e7eb',
      transition: 'all 0.2s ease'
    })
  };

  // ============================================================================
  // RENDER - MAP TAB
  // ============================================================================

  const renderMapTab = () => (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <select
            value={selectedYardMap?.id || ''}
            onChange={(e) => {
              const map = yardMaps.find(m => m.id === e.target.value);
              if (map) selectYardMap(map);
            }}
            style={styles.select}
          >
            <option value="">-- Select Yard Map --</option>
            {yardMaps.map(map => (
              <option key={map.id} value={map.id}>
                {map.name} ({map.yard_type})
                {map.id === settings.defaultYardMapId ? ' (Default)' : ''}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Zoom: {Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} style={styles.btn('secondary')}>+</button>
            <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} style={styles.btn('secondary')}>-</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={styles.btn('secondary')}>Reset</button>
          </div>
          
          {selectedModule && (
            <button onClick={deleteSelectedModule} style={styles.btn('danger')}>
              Delete Selected
            </button>
          )}
        </div>
        
        {/* Canvas */}
        <div ref={containerRef} style={styles.canvasContainer}>
          <canvas
            ref={canvasRef}
            style={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {!selectedYardMap && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.9)'
            }}>
              <div style={{ textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#128506;</div>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Yard Map Selected</div>
                <div style={{ fontSize: '14px' }}>Select a yard map from the dropdown or upload a new one in Settings</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar */}
      {selectedYardMap && (
        <div style={styles.sidebar}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: COLORS.blue }}>Add Module</h3>
          
          <div style={styles.moduleForm}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Project</label>
              <select
                value={newModuleForm.projectId}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setNewModuleForm(prev => ({
                    ...prev,
                    projectId: e.target.value,
                    abbreviation: project?.abbreviation || prev.abbreviation,
                    color: project?.color || prev.color
                  }));
                }}
                style={{ ...styles.input, width: '100%' }}
              >
                <option value="">-- Select Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.fieldGroup}>
              <label style={styles.label}>BLM Number *</label>
              <input
                type="text"
                value={newModuleForm.blm}
                onChange={(e) => setNewModuleForm(prev => ({ ...prev, blm: e.target.value }))}
                placeholder="e.g., BLM-1001"
                style={{ ...styles.input, width: '100%' }}
              />
            </div>
            
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Abbreviation *</label>
              <input
                type="text"
                value={newModuleForm.abbreviation}
                onChange={(e) => setNewModuleForm(prev => ({ ...prev, abbreviation: e.target.value }))}
                placeholder="e.g., ARA-T"
                style={{ ...styles.input, width: '100%' }}
              />
            </div>
            
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Color</label>
              <input
                type="color"
                value={newModuleForm.color}
                onChange={(e) => setNewModuleForm(prev => ({ ...prev, color: e.target.value }))}
                style={{ ...styles.input, width: '100%', height: '36px', padding: '2px' }}
              />
            </div>
            
            <button
              onClick={() => setIsDrawMode(true)}
              disabled={!newModuleForm.blm || !newModuleForm.abbreviation}
              style={{
                ...styles.btn(isDrawMode ? 'primary' : 'secondary'),
                width: '100%',
                opacity: (!newModuleForm.blm || !newModuleForm.abbreviation) ? 0.5 : 1
              }}
            >
              {isDrawMode ? 'Drawing... Click & Drag on Map' : 'Draw on Map'}
            </button>
          </div>
          
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: COLORS.blue }}>
            Modules ({modules.length})
          </h3>
          
          <div style={styles.modulesList}>
            {modules.map(module => (
              <div
                key={module.id}
                onClick={() => setSelectedModule(module)}
                style={styles.moduleItem(selectedModule?.id === module.id)}
              >
                <div style={{ fontWeight: '700', fontSize: '13px', color: module.color }}>
                  {module.abbreviation}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>{module.blm}</div>
              </div>
            ))}
            {modules.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                No modules placed yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER - SETTINGS TAB
  // ============================================================================

  const renderSettingsTab = () => (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <h2 style={{ margin: '0 0 24px 0', color: COLORS.blue }}>Yard Map Settings</h2>
      
      {/* Upload New Yard Map */}
      <div style={{ background: '#fafafa', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Upload New Yard Map</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={styles.label}>Name *</label>
            <input
              type="text"
              value={uploadForm.name}
              onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Front Yard - Main"
              style={{ ...styles.input, width: '100%' }}
            />
          </div>
          <div>
            <label style={styles.label}>Yard Type</label>
            <select
              value={uploadForm.yardType}
              onChange={(e) => setUploadForm(prev => ({ ...prev, yardType: e.target.value }))}
              style={{ ...styles.input, width: '100%' }}
            >
              {YARD_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !uploadForm.name}
            style={{
              ...styles.btn('primary'),
              opacity: (isUploading || !uploadForm.name) ? 0.5 : 1
            }}
          >
            {isUploading ? 'Uploading...' : 'Select PDF & Upload'}
          </button>
          <span style={{ fontSize: '12px', color: '#666' }}>Max 5MB, PDF only</span>
        </div>
      </div>
      
      {/* Existing Yard Maps */}
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Existing Yard Maps</h3>
      
      {yardMaps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999', background: '#fafafa', borderRadius: '8px' }}>
          No yard maps uploaded yet
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: COLORS.blue, color: COLORS.white }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Default</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {yardMaps.map((map, idx) => (
              <tr key={map.id} style={{ background: idx % 2 === 0 ? COLORS.white : '#fafafa' }}>
                <td style={{ padding: '12px', fontWeight: '600' }}>{map.name}</td>
                <td style={{ padding: '12px' }}>{YARD_TYPES.find(t => t.id === map.yard_type)?.label || map.yard_type}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {map.id === settings.defaultYardMapId ? (
                    <span style={{ color: '#10B981', fontWeight: '600' }}>Default</span>
                  ) : (
                    <button onClick={() => setAsDefault(map.id)} style={styles.btn('secondary')}>
                      Set Default
                    </button>
                  )}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <button onClick={() => deleteYardMap(map.id)} style={styles.btn('danger')}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* Font Size Setting */}
      <div style={{ marginTop: '24px', background: '#fafafa', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Default Settings</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: '600', fontSize: '14px' }}>Default Font Size:</label>
          <input
            type="number"
            value={settings.defaultFontSize}
            onChange={async (e) => {
              const size = parseInt(e.target.value) || 14;
              setSettings(prev => ({ ...prev, defaultFontSize: size }));
              try {
                await supabaseFetch('yard_settings?id=eq.1', {
                  method: 'PATCH',
                  body: JSON.stringify({ default_font_size: size })
                });
              } catch (err) {
                console.error('[YardMap] Error saving font size:', err);
              }
            }}
            min="8"
            max="32"
            style={{ ...styles.input, width: '80px' }}
          />
          <span style={{ fontSize: '12px', color: '#666' }}>px</span>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER - PROJECT LIBRARY TAB
  // ============================================================================

  const renderProjectLibraryTab = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 24px 0', color: COLORS.blue }}>Project Library</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Projects from MODA's Project Directory. Select a project when adding modules to auto-fill abbreviation and color.
      </p>
      
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999', background: '#fafafa', borderRadius: '8px' }}>
          No projects available. Add projects in the Projects module.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {projects.map(project => (
            <div
              key={project.id}
              style={{
                padding: '16px',
                background: COLORS.white,
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${project.color || '#3B82F6'}`
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{project.name}</div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                {project.abbreviation || 'No abbreviation'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: project.color || '#3B82F6'
                }} />
                <span style={{ fontSize: '12px', color: '#999' }}>{project.color || '#3B82F6'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>Loading Yard Map...</div>
        </div>
      </div>
    );
  }

  // Fullscreen container styles
  const fullscreenStyles = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: COLORS.white
  } : {};

  return (
    <div style={{ ...styles.container, ...fullscreenStyles }}>
      {/* Internal Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fafafa', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          {[
            { id: 'map', label: 'Yard Map' },
            { id: 'library', label: 'Project Library' },
            { id: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === tab.id ? COLORS.white : 'transparent',
                color: activeTab === tab.id ? COLORS.blue : '#666',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? `3px solid ${COLORS.blue}` : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            padding: '8px 16px',
            margin: '8px 16px',
            background: isFullscreen ? COLORS.red : COLORS.blue,
            color: COLORS.white,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px'
          }}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
      
      {/* Tab Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'map' && renderMapTab()}
        {activeTab === 'library' && renderProjectLibraryTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
      
      {error && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          background: COLORS.red,
          color: COLORS.white,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: '12px', background: 'none', border: 'none', color: COLORS.white, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

// Export for use in TransportModule
window.YardMapComponent = YardMapComponent;
