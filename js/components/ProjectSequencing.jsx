// ============================================================================
// PROJECT SEQUENCING TOOL - Excel-like Table Builder
// Features: Undo/Redo, Multi-select, Fill Handle, Context Menu, Filter/Sort
// ============================================================================

window.ProjectSequencing = {};

const DEFAULT_COLUMNS = [
    { id: 'buildSequence', label: 'Build Seq', width: 80, type: 'number', required: true, sortable: true, filterable: true },
    { id: 'serialNumber', label: 'Serial #', width: 110, type: 'text', required: true, sortable: true, filterable: true },
    { id: 'widthFt', label: 'W-Ft', width: 50, type: 'number', placeholder: '11', sortable: true, filterable: true },
    { id: 'widthIn', label: 'W-In', width: 50, type: 'number', placeholder: '6', sortable: true, filterable: true },
    { id: 'lengthFt', label: 'L-Ft', width: 50, type: 'number', placeholder: '59', sortable: true, filterable: true },
    { id: 'lengthIn', label: 'L-In', width: 50, type: 'number', placeholder: '3', sortable: true, filterable: true },
    { id: 'squareFootage', label: 'SF', width: 60, type: 'number', computed: true, sortable: true, filterable: true },
    { id: 'hitchBLM', label: 'HITCH BLM', width: 100, type: 'text', required: true, sortable: true, filterable: true },
    { id: 'hitchUnit', label: 'HITCH Unit', width: 90, type: 'text', sortable: true, filterable: true },
    { id: 'hitchRoom', label: 'HITCH Room', width: 90, type: 'text', sortable: true, filterable: true },
    { id: 'hitchRoomType', label: 'HITCH Type', width: 90, type: 'text', sortable: true, filterable: true },
    { id: 'rearBLM', label: 'REAR BLM', width: 100, type: 'text', sortable: true, filterable: true },
    { id: 'rearUnit', label: 'REAR Unit', width: 90, type: 'text', sortable: true, filterable: true },
    { id: 'rearRoom', label: 'REAR Room', width: 90, type: 'text', sortable: true, filterable: true },
    { id: 'rearRoomType', label: 'REAR Type', width: 90, type: 'text', sortable: true, filterable: true },
    { id: 'sidewall', label: 'SW', width: 40, type: 'checkbox', sortable: true, filterable: true },
    { id: 'stair', label: 'Stair', width: 45, type: 'checkbox', sortable: true, filterable: true },
    { id: 'hr3Wall', label: '3HR', width: 40, type: 'checkbox', sortable: true, filterable: true },
    { id: 'short', label: 'Short', width: 45, type: 'checkbox', sortable: true, filterable: true },
    { id: 'doubleStudio', label: 'DblStu', width: 50, type: 'checkbox', sortable: true, filterable: true },
    { id: 'sawbox', label: 'Sawbox', width: 55, type: 'checkbox', sortable: true, filterable: true },
    { id: 'isPrototype', label: 'Proto', width: 45, type: 'checkbox', sortable: true, filterable: true }
];

// Get column order from localStorage or use default
function getColumnOrder() {
    const saved = localStorage.getItem('moda_sequence_column_order');
    if (saved) {
        const order = JSON.parse(saved);
        // Validate all columns exist
        if (order.length === DEFAULT_COLUMNS.length && order.every(id => DEFAULT_COLUMNS.find(c => c.id === id))) {
            return order;
        }
    }
    return DEFAULT_COLUMNS.map(c => c.id);
}

function saveColumnOrder(order) {
    localStorage.setItem('moda_sequence_column_order', JSON.stringify(order));
}

function calcSF(wFt, wIn, lFt, lIn) {
    const widthInches = (parseInt(wFt) || 0) * 12 + (parseInt(wIn) || 0);
    const lengthInches = (parseInt(lFt) || 0) * 12 + (parseInt(lIn) || 0);
    return Math.round((widthInches * lengthInches) / 144);
}

function createEmptyModule(seq, setup) {
    return {
        id: `mod_${Date.now()}_${seq}`, buildSequence: seq, serialNumber: '',
        widthFt: setup.defaultWidthFt, widthIn: setup.defaultWidthIn,
        lengthFt: setup.defaultLengthFt, lengthIn: setup.defaultLengthIn,
        squareFootage: calcSF(setup.defaultWidthFt, setup.defaultWidthIn, setup.defaultLengthFt, setup.defaultLengthIn),
        hitchBLM: '', hitchUnit: '', hitchRoom: '', hitchRoomType: '',
        rearBLM: '', rearUnit: '', rearRoom: '', rearRoomType: '',
        sidewall: false, stair: false, hr3Wall: false, short: false, doubleStudio: false, sawbox: false, isPrototype: false
    };
}

window.ProjectSequencing.SequencingModal = function SequencingModal({ project, modules, onClose, onSaveToProject }) {
    const { useState } = React;
    if (!project?.id) {
        return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6"><p className="text-red-600">Error: No project</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">Close</button></div></div>);
    }
    const getSequences = () => { const s = localStorage.getItem(`moda_sequences_${project.id}`); return s ? JSON.parse(s) : { current: null, previous: [] }; };
    const [sequences, setSequences] = useState(() => getSequences());
    const [view, setView] = useState(null);
    const hasCurrent = sequences.current !== null, hasPrevious = sequences.previous?.length > 0;
    const saveSequence = (seq) => {
        const updated = { current: seq, previous: sequences.current ? [sequences.current, ...sequences.previous].slice(0, 10) : sequences.previous };
        localStorage.setItem(`moda_sequences_${project.id}`, JSON.stringify(updated));
        setSequences(updated);
    };
    if (!view) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">📋 Module Sequencing</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
                </div><p className="text-sm text-gray-500 mt-1">{project.name}</p></div>
                <div className="p-6 space-y-3">
                    <button onClick={() => setView('create')} className="w-full p-4 text-left rounded-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50">
                        <div className="flex items-center gap-3"><span className="text-2xl">➕</span><div><div className="font-semibold">Create New Sequence</div><div className="text-sm text-gray-500">Build from scratch</div></div></div></button>
                    <button onClick={() => hasCurrent && setView('edit')} disabled={!hasCurrent} className={`w-full p-4 text-left rounded-lg border-2 ${hasCurrent ? 'border-blue-200 hover:border-blue-400' : 'opacity-60'}`}>
                        <div className="flex items-center gap-3"><span className="text-2xl">📄</span><div><div className="font-semibold">View/Edit Current</div><div className="text-sm text-gray-500">{hasCurrent ? `${sequences.current.modules?.length || 0} modules` : 'None'}</div></div></div></button>
                    <button onClick={() => hasPrevious && setView('previous')} disabled={!hasPrevious} className={`w-full p-4 text-left rounded-lg border-2 ${hasPrevious ? 'border-gray-300' : 'opacity-60'}`}>
                        <div className="flex items-center gap-3"><span className="text-2xl">📚</span><div><div className="font-semibold">Previous Sequences</div><div className="text-sm text-gray-500">{hasPrevious ? `${sequences.previous.length} archived` : 'None'}</div></div></div></button>
                </div>
            </div>
        </div>
    );
    if (view === 'create') return <window.ProjectSequencing.SequenceBuilder project={project} onSave={seq => { saveSequence(seq); onSaveToProject?.(seq.modules); }} onBack={() => setView(null)} onClose={onClose} />;
    if (view === 'edit') return <window.ProjectSequencing.SequenceBuilder project={project} initialData={sequences.current} onSave={seq => { saveSequence(seq); onSaveToProject?.(seq.modules); }} onBack={() => setView(null)} onClose={onClose} />;
    if (view === 'previous') return <window.ProjectSequencing.PreviousView sequences={sequences.previous} onRestore={seq => { saveSequence(seq); setView('edit'); }} onBack={() => setView(null)} onClose={onClose} />;
    return null;
};

window.ProjectSequencing.SequenceBuilder = function SequenceBuilder({ project, initialData, onSave, onBack, onClose }) {
    const { useState, useRef, useEffect, useCallback } = React;
    const [showSetup, setShowSetup] = useState(!initialData);
    const [setup, setSetup] = useState({ buildings: 1, levels: 5, moduleStacks: 29, startingLevel: 2, defaultWidthFt: 11, defaultWidthIn: 6, defaultLengthFt: 59, defaultLengthIn: 3 });
    const [seqName, setSeqName] = useState(initialData?.name || '');
    const [modules, setModules] = useState(initialData?.modules || []);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [selectedCells, setSelectedCells] = useState(new Set());
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [selectedCols, setSelectedCols] = useState(new Set());
    const [anchorCell, setAnchorCell] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [rowContextMenu, setRowContextMenu] = useState(null);
    const [headerContextMenu, setHeaderContextMenu] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
    const [columnFilters, setColumnFilters] = useState({});
    const [bulkUpdateModal, setBulkUpdateModal] = useState(null);
    const [columnOrder, setColumnOrder] = useState(() => getColumnOrder());
    const [draggedCol, setDraggedCol] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const tableRef = useRef(null);
    
    // Get columns in current order
    const SEQUENCE_COLUMNS = columnOrder.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean);
    
    const cellKey = (r, c) => `${r}|${c}`;
    const parseKey = k => { const [r, c] = k.split('|'); return { row: +r, col: +c }; };
    
    const pushHistory = useCallback((mods) => {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(mods))].slice(-50));
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [historyIndex]);
    
    const updateModules = useCallback((fn) => {
        setModules(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; pushHistory(next); return next; });
    }, [pushHistory]);
    
    const undo = useCallback(() => { if (historyIndex > 0) { setHistoryIndex(i => i - 1); setModules(JSON.parse(JSON.stringify(history[historyIndex - 1]))); } }, [history, historyIndex]);
    const redo = useCallback(() => { if (historyIndex < history.length - 1) { setHistoryIndex(i => i + 1); setModules(JSON.parse(JSON.stringify(history[historyIndex + 1]))); } }, [history, historyIndex]);
    
    useEffect(() => {
        const handler = (e) => {
            if (showSetup) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
            if (e.key === 'Escape') { setSelectedCells(new Set()); setSelectedRows(new Set()); setSelectedCols(new Set()); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showSetup, undo, redo]);
    
    useEffect(() => {
        const handler = () => { setContextMenu(null); setRowContextMenu(null); setHeaderContextMenu(null); };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);
    
    useEffect(() => { if (modules.length > 0 && history.length === 0) { setHistory([JSON.parse(JSON.stringify(modules))]); setHistoryIndex(0); } }, [modules, history.length]);
    
    const generateModules = () => {
        const mods = [];
        let seq = 1;
        const { buildings, levels, moduleStacks, startingLevel, defaultWidthFt, defaultWidthIn, defaultLengthFt, defaultLengthIn } = setup;
        for (let b = 1; b <= buildings; b++) {
            for (let l = startingLevel; l < startingLevel + levels; l++) {
                for (let m = 1; m <= moduleStacks; m++) {
                    mods.push({ ...createEmptyModule(seq, setup), hitchBLM: `B${b}L${l}M${String(m).padStart(2, '0')}` });
                    seq++;
                }
            }
        }
        setModules(mods);
        setHistory([JSON.parse(JSON.stringify(mods))]);
        setHistoryIndex(0);
        setShowSetup(false);
    };
    
    const updateCell = (row, col, val) => {
        updateModules(prev => {
            const updated = [...prev];
            const colDef = SEQUENCE_COLUMNS[col];
            updated[row] = { ...updated[row], [colDef.id]: val };
            if (['widthFt', 'widthIn', 'lengthFt', 'lengthIn'].includes(colDef.id)) {
                updated[row].squareFootage = calcSF(updated[row].widthFt, updated[row].widthIn, updated[row].lengthFt, updated[row].lengthIn);
            }
            return updated;
        });
    };
    
    const handleCellClick = (e, row, col) => {
        setSelectedRows(new Set()); setSelectedCols(new Set());
        const key = cellKey(row, col);
        if (e.ctrlKey || e.metaKey) {
            setSelectedCells(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
        } else if (e.shiftKey && anchorCell) {
            const [r1, r2] = [Math.min(anchorCell.row, row), Math.max(anchorCell.row, row)];
            const [c1, c2] = [Math.min(anchorCell.col, col), Math.max(anchorCell.col, col)];
            const sel = new Set();
            for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) sel.add(cellKey(r, c));
            setSelectedCells(sel);
        } else {
            setSelectedCells(new Set([key]));
        }
        setAnchorCell({ row, col });
    };
    
    const handleColumnClick = (e, col) => {
        setSelectedRows(new Set()); setSelectedCells(new Set());
        if (e.ctrlKey) { setSelectedCols(prev => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; }); }
        else { setSelectedCols(new Set([col])); }
    };
    
    const handleRowClick = (e, row) => {
        setSelectedCols(new Set()); setSelectedCells(new Set());
        if (e.ctrlKey) { setSelectedRows(prev => { const n = new Set(prev); n.has(row) ? n.delete(row) : n.add(row); return n; }); }
        else if (e.shiftKey && selectedRows.size > 0) {
            const anchor = Math.min(...selectedRows);
            const sel = new Set();
            for (let r = Math.min(anchor, row); r <= Math.max(anchor, row); r++) sel.add(r);
            setSelectedRows(sel);
        } else { setSelectedRows(new Set([row])); }
    };
    
    const handleContextMenu = (e, row, col) => { e.preventDefault(); if (!selectedCells.has(cellKey(row, col))) { setSelectedCells(new Set([cellKey(row, col)])); setAnchorCell({ row, col }); } setContextMenu({ x: e.clientX, y: e.clientY, row, col }); };
    const handleRowContextMenu = (e, row) => { e.preventDefault(); if (!selectedRows.has(row)) setSelectedRows(new Set([row])); setRowContextMenu({ x: e.clientX, y: e.clientY, row }); };
    const handleHeaderContextMenu = (e, col) => { e.preventDefault(); if (!selectedCols.has(col)) setSelectedCols(new Set([col])); setHeaderContextMenu({ x: e.clientX, y: e.clientY, col }); };
    
    // Column drag handlers
    const handleColDragStart = (e, colIdx) => { setDraggedCol(colIdx); e.dataTransfer.effectAllowed = 'move'; };
    const handleColDragOver = (e, colIdx) => { e.preventDefault(); if (draggedCol !== null && draggedCol !== colIdx) setDragOverCol(colIdx); };
    const handleColDragLeave = () => setDragOverCol(null);
    const handleColDrop = (e, colIdx) => {
        e.preventDefault();
        if (draggedCol !== null && draggedCol !== colIdx) {
            const newOrder = [...columnOrder];
            const [moved] = newOrder.splice(draggedCol, 1);
            newOrder.splice(colIdx, 0, moved);
            setColumnOrder(newOrder);
            saveColumnOrder(newOrder);
        }
        setDraggedCol(null);
        setDragOverCol(null);
    };
    const handleColDragEnd = () => { setDraggedCol(null); setDragOverCol(null); };
    
    // Move column left/right via context menu
    const moveColumnLeft = (colIdx) => {
        if (colIdx <= 0) return;
        const newOrder = [...columnOrder];
        [newOrder[colIdx - 1], newOrder[colIdx]] = [newOrder[colIdx], newOrder[colIdx - 1]];
        setColumnOrder(newOrder);
        saveColumnOrder(newOrder);
        setHeaderContextMenu(null);
    };
    const moveColumnRight = (colIdx) => {
        if (colIdx >= columnOrder.length - 1) return;
        const newOrder = [...columnOrder];
        [newOrder[colIdx], newOrder[colIdx + 1]] = [newOrder[colIdx + 1], newOrder[colIdx]];
        setColumnOrder(newOrder);
        saveColumnOrder(newOrder);
        setHeaderContextMenu(null);
    };
    const resetColumnOrder = () => {
        const defaultOrder = DEFAULT_COLUMNS.map(c => c.id);
        setColumnOrder(defaultOrder);
        saveColumnOrder(defaultOrder);
        setHeaderContextMenu(null);
    };
    
    const addRow = () => updateModules(prev => [...prev, createEmptyModule(prev.length + 1, setup)]);
    const addRowAt = (idx) => { updateModules(prev => { const arr = [...prev]; arr.splice(idx, 0, createEmptyModule(idx + 1, setup)); return arr.map((m, i) => ({ ...m, buildSequence: i + 1 })); }); setRowContextMenu(null); };
    const deleteRow = (idx) => updateModules(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, buildSequence: i + 1 })));
    const deleteSelectedRows = () => { updateModules(prev => prev.filter((_, i) => !selectedRows.has(i)).map((m, i) => ({ ...m, buildSequence: i + 1 }))); setSelectedRows(new Set()); setRowContextMenu(null); };
    const moveRow = (idx, dir) => {
        if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === modules.length - 1)) return;
        updateModules(prev => { const arr = [...prev]; const t = dir === 'up' ? idx - 1 : idx + 1; [arr[idx], arr[t]] = [arr[t], arr[idx]]; return arr.map((m, i) => ({ ...m, buildSequence: i + 1 })); });
    };
    const renumber = () => updateModules(prev => prev.map((m, i) => ({ ...m, buildSequence: i + 1 })));
    
    const fillColumn = () => {
        if (selectedCells.size === 0) return;
        const cells = Array.from(selectedCells).map(parseKey).sort((a, b) => a.row - b.row);
        const { row, col } = cells[0];
        const colDef = SEQUENCE_COLUMNS[col];
        const src = modules[row][colDef.id];
        const match = (colDef.id === 'serialNumber' || colDef.id === 'buildSequence') && src ? String(src).match(/^(.*)(\d+)$/) : null;
        updateModules(prev => {
            const arr = [...prev];
            for (let r = row; r < arr.length; r++) {
                arr[r] = { ...arr[r], [colDef.id]: match ? match[1] + String(+match[2] + r - row).padStart(match[2].length, '0') : src };
            }
            return arr;
        });
        setContextMenu(null);
    };
    
    const fillSelection = () => {
        if (selectedCells.size === 0) return;
        const cells = Array.from(selectedCells).map(parseKey);
        const byCol = {};
        cells.forEach(c => { if (!byCol[c.col]) byCol[c.col] = []; byCol[c.col].push(c.row); });
        updateModules(prev => {
            const arr = [...prev];
            Object.entries(byCol).forEach(([colStr, rows]) => {
                const col = +colStr, colDef = SEQUENCE_COLUMNS[col];
                const sorted = rows.sort((a, b) => a - b);
                const src = arr[sorted[0]][colDef.id];
                const match = (colDef.id === 'serialNumber' || colDef.id === 'buildSequence') && src ? String(src).match(/^(.*)(\d+)$/) : null;
                sorted.forEach((r, i) => { if (i > 0) arr[r] = { ...arr[r], [colDef.id]: match ? match[1] + String(+match[2] + i).padStart(match[2].length, '0') : src }; });
            });
            return arr;
        });
        setContextMenu(null);
    };
    
    const applyBulkUpdate = (val) => {
        const cells = Array.from(selectedCells).map(parseKey);
        updateModules(prev => {
            const arr = [...prev];
            cells.forEach(({ row, col }) => {
                const colDef = SEQUENCE_COLUMNS[col];
                arr[row] = { ...arr[row], [colDef.id]: colDef.type === 'checkbox' ? (val === true || val === 'true') : val };
                if (['widthFt', 'widthIn', 'lengthFt', 'lengthIn'].includes(colDef.id)) arr[row].squareFootage = calcSF(arr[row].widthFt, arr[row].widthIn, arr[row].lengthFt, arr[row].lengthIn);
            });
            return arr;
        });
        setBulkUpdateModal(null); setContextMenu(null);
    };
    
    const handleSort = (colId) => setSortConfig(prev => ({ column: colId, direction: prev.column === colId && prev.direction === 'asc' ? 'desc' : 'asc' }));
    const handleFilter = (colId, val) => setColumnFilters(prev => ({ ...prev, [colId]: val }));
    
    const getDisplayModules = () => {
        let result = [...modules];
        if (searchTerm) { const t = (searchTerm || '').toLowerCase(); result = result.filter(m => Object.values(m).some(v => String(v || '').toLowerCase().includes(t))); }
        Object.entries(columnFilters).forEach(([colId, fv]) => {
            if (fv !== '' && fv !== undefined) {
                const col = SEQUENCE_COLUMNS.find(c => c.id === colId);
                if (col?.type === 'checkbox') {
                    if (fv === 'checked') result = result.filter(m => m[colId] === true);
                    else if (fv === 'unchecked') result = result.filter(m => m[colId] === false);
                } else { result = result.filter(m => String(m[colId] || '').toLowerCase().includes((fv || '').toLowerCase())); }
            }
        });
        if (sortConfig.column) result.sort((a, b) => { const av = a[sortConfig.column], bv = b[sortConfig.column]; return (av < bv ? -1 : av > bv ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1); });
        return result;
    };
    
    const exportToExcel = () => {
        const headers = ['Build Seq', 'Serial #', 'W-Ft', 'W-In', 'L-Ft', 'L-In', 'SF', 'HITCH BLM', 'HITCH Unit', 'HITCH Room', 'HITCH Type', 'REAR BLM', 'REAR Unit', 'REAR Room', 'REAR Type', 'SW', 'Stair', '3HR', 'Short', 'DblStu', 'Sawbox', 'Proto'];
        const rows = modules.map(m => [m.buildSequence, m.serialNumber, m.widthFt, m.widthIn, m.lengthFt, m.lengthIn, m.squareFootage, m.hitchBLM, m.hitchUnit, m.hitchRoom, m.hitchRoomType, m.rearBLM, m.rearUnit, m.rearRoom, m.rearRoomType, m.sidewall ? 'X' : '', m.stair ? 'X' : '', m.hr3Wall ? 'X' : '', m.short ? 'X' : '', m.doubleStudio ? 'X' : '', m.sawbox ? 'X' : '', m.isPrototype ? 'X' : '']);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Sequence.csv`; link.click();
    };
    
    const handleSave = () => {
        onSave({ id: initialData?.id || `seq_${Date.now()}`, name: seqName || `Sequence ${new Date().toLocaleDateString()}`, createdAt: initialData?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), setupConfig: setup, modules });
        onBack();
    };
    
    const displayModules = getDisplayModules();
    const isRowSelected = r => selectedRows.has(r);
    const isColSelected = c => selectedCols.has(c);
    const isCellSelected = (r, c) => selectedCells.has(cellKey(r, c)) || isRowSelected(r) || isColSelected(c);

    if (showSetup) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                <div className="p-6 border-b"><h2 className="text-xl font-bold">🏗️ Project Setup Wizard</h2></div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium mb-1">Buildings</label><input type="number" min="1" value={setup.buildings} onChange={e => setSetup(p => ({ ...p, buildings: +e.target.value || 1 }))} className="w-full px-3 py-2 border rounded-lg text-center" /></div>
                        <div><label className="block text-sm font-medium mb-1">Levels</label><input type="number" min="1" value={setup.levels} onChange={e => setSetup(p => ({ ...p, levels: +e.target.value || 1 }))} className="w-full px-3 py-2 border rounded-lg text-center" /></div>
                        <div><label className="block text-sm font-medium mb-1">Module Stacks</label><input type="number" min="1" value={setup.moduleStacks} onChange={e => setSetup(p => ({ ...p, moduleStacks: +e.target.value || 1 }))} className="w-full px-3 py-2 border rounded-lg text-center" /></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-1">Starting Level</label><input type="number" min="1" value={setup.startingLevel} onChange={e => setSetup(p => ({ ...p, startingLevel: +e.target.value || 1 }))} className="w-full px-3 py-2 border rounded-lg text-center" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium mb-1">Default Width</label><div className="flex gap-1"><input type="number" value={setup.defaultWidthFt} onChange={e => setSetup(p => ({ ...p, defaultWidthFt: +e.target.value || 0 }))} className="w-full px-2 py-2 border rounded-lg text-center" /><span>'</span><input type="number" value={setup.defaultWidthIn} onChange={e => setSetup(p => ({ ...p, defaultWidthIn: +e.target.value || 0 }))} className="w-full px-2 py-2 border rounded-lg text-center" /><span>"</span></div></div>
                        <div><label className="block text-sm font-medium mb-1">Default Length</label><div className="flex gap-1"><input type="number" value={setup.defaultLengthFt} onChange={e => setSetup(p => ({ ...p, defaultLengthFt: +e.target.value || 0 }))} className="w-full px-2 py-2 border rounded-lg text-center" /><span>'</span><input type="number" value={setup.defaultLengthIn} onChange={e => setSetup(p => ({ ...p, defaultLengthIn: +e.target.value || 0 }))} className="w-full px-2 py-2 border rounded-lg text-center" /><span>"</span></div></div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-blue-800">Preview: <strong>{setup.buildings * setup.levels * setup.moduleStacks}</strong> modules</div>
                        <div className="text-xs text-blue-600 font-mono">B1L{setup.startingLevel}M01 → B{setup.buildings}L{setup.startingLevel + setup.levels - 1}M{String(setup.moduleStacks).padStart(2, '0')}</div>
                        <div className="text-xs text-blue-600">SF: {calcSF(setup.defaultWidthFt, setup.defaultWidthIn, setup.defaultLengthFt, setup.defaultLengthIn)}</div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-between">
                    <button onClick={() => { setModules([]); setShowSetup(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Start Empty</button>
                    <div className="flex gap-2"><button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button><button onClick={generateModules} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Generate</button></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">← Back</button>
                    <div><h1 className="text-lg font-bold">📋 Sequence Builder</h1><p className="text-sm text-gray-500">{project.name}</p></div>
                </div>
                <div className="flex items-center gap-3">
                    <input type="text" value={seqName} onChange={e => setSeqName(e.target.value)} placeholder="Sequence Name" className="px-3 py-1.5 border rounded-lg text-sm w-48" />
                    <span className="text-sm text-gray-500">{modules.length} modules</span>
                    <button onClick={() => setShowSetup(true)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">🏗️ Setup</button>
                    <button onClick={handleSave} className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium">💾 Save</button>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                </div>
            </div>
            <div className="bg-white border-b px-4 py-2 flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button onClick={undo} disabled={historyIndex <= 0} className={`px-3 py-1.5 text-sm rounded ${historyIndex > 0 ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400'}`}>↩ Undo</button>
                <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`px-3 py-1.5 text-sm rounded ${historyIndex < history.length - 1 ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400'}`}>↪ Redo</button>
                <div className="border-l mx-2 h-6"></div>
                <button onClick={addRow} className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">+ Add Row</button>
                <button onClick={renumber} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">🔢 Renumber</button>
                <button onClick={exportToExcel} className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">📥 Export</button>
                <div className="border-l mx-2 h-6"></div>
                <span className="text-gray-500">🔍</span>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="px-3 py-1.5 border rounded-lg text-sm w-48" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-400">✕</button>}
                <div className="border-l mx-2 h-6"></div>
                <span className="text-xs text-gray-500">Ctrl+Z/Y: Undo/Redo • Enter: Move down • Click # or header to select row/col</span>
            </div>
            <div className="flex-1 overflow-auto" ref={tableRef}>
                <table className="w-max border-collapse" style={{ minWidth: '100%' }}>
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-800 text-white">
                            <th className="px-2 py-2 text-xs font-semibold border-r border-gray-700 sticky left-0 bg-gray-800 z-20 cursor-pointer" style={{ width: 60 }}>#</th>
                            {SEQUENCE_COLUMNS.map((col, ci) => (
                                <th key={col.id} 
                                    className={`px-2 py-1 text-xs font-semibold border-r border-gray-700 cursor-grab select-none transition-all ${isColSelected(ci) ? 'bg-blue-600' : ''} ${draggedCol === ci ? 'opacity-50' : ''} ${dragOverCol === ci ? 'bg-blue-500 border-l-2 border-l-yellow-400' : ''}`} 
                                    style={{ width: col.width }} 
                                    draggable 
                                    onDragStart={e => handleColDragStart(e, ci)} 
                                    onDragOver={e => handleColDragOver(e, ci)} 
                                    onDragLeave={handleColDragLeave} 
                                    onDrop={e => handleColDrop(e, ci)} 
                                    onDragEnd={handleColDragEnd}
                                    onClick={e => handleColumnClick(e, ci)} 
                                    onContextMenu={e => handleHeaderContextMenu(e, ci)}>
                                    <div className="flex items-center justify-between">
                                        <span>{col.label}{col.required && <span className="text-red-400">*</span>}</span>
                                        {col.sortable && <button onClick={e => { e.stopPropagation(); handleSort(col.id); }} className="ml-1 text-gray-400 hover:text-white">{sortConfig.column === col.id ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</button>}
                                    </div>
                                </th>
                            ))}
                            <th className="px-2 py-2 text-xs" style={{ width: 50 }}>Del</th>
                        </tr>
                        <tr className="bg-gray-700">
                            <th className="px-1 py-1 sticky left-0 bg-gray-700 z-20"></th>
                            {SEQUENCE_COLUMNS.map(col => (
                                <th key={`f-${col.id}`} className="px-1 py-1 border-r border-gray-600">
                                    {col.filterable && (col.type === 'checkbox' ? 
                                        <select value={columnFilters[col.id] || ''} onChange={e => handleFilter(col.id, e.target.value)} className="w-full px-1 py-0.5 text-xs rounded bg-gray-600 text-white border-0"><option value="">All</option><option value="checked">✓</option><option value="unchecked">✗</option></select> :
                                        <input type="text" value={columnFilters[col.id] || ''} onChange={e => handleFilter(col.id, e.target.value)} placeholder="Filter" className="w-full px-1 py-0.5 text-xs rounded bg-gray-600 text-white placeholder-gray-400 border-0" />
                                    )}
                                </th>
                            ))}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayModules.length === 0 ? <tr><td colSpan={SEQUENCE_COLUMNS.length + 2} className="text-center py-12 text-gray-500">No modules. Add rows or use Setup.</td></tr> :
                        displayModules.map((mod, di) => {
                            const ri = modules.findIndex(m => m.id === mod.id);
                            const rowSel = isRowSelected(ri);
                            return (
                                <tr key={mod.id} className={`${rowSel ? 'bg-blue-100' : di % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                    <td className={`px-1 py-1 text-center border-r border-gray-200 sticky left-0 z-10 cursor-pointer select-none ${rowSel ? 'bg-blue-200' : 'bg-inherit'}`} onClick={e => handleRowClick(e, ri)} onContextMenu={e => handleRowContextMenu(e, ri)}>
                                        <div className="flex items-center justify-center gap-1">
                                            <div className="flex flex-col">
                                                <button onClick={e => { e.stopPropagation(); moveRow(ri, 'up'); }} disabled={ri === 0} className={`text-xs ${ri === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>▲</button>
                                                <button onClick={e => { e.stopPropagation(); moveRow(ri, 'down'); }} disabled={ri === modules.length - 1} className={`text-xs ${ri === modules.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>▼</button>
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono">{ri + 1}</span>
                                        </div>
                                    </td>
                                    {SEQUENCE_COLUMNS.map((col, ci) => {
                                        const cellSel = isCellSelected(ri, ci);
                                        return (
                                            <td key={col.id} className={`border-r border-gray-200 ${cellSel ? 'ring-2 ring-blue-500 ring-inset bg-blue-100' : ''}`} onClick={e => handleCellClick(e, ri, ci)} onContextMenu={e => handleContextMenu(e, ri, ci)}>
                                                {col.type === 'checkbox' ? <div className="flex items-center justify-center py-1"><input type="checkbox" checked={mod[col.id] || false} onChange={e => updateCell(ri, ci, e.target.checked)} className="w-4 h-4 cursor-pointer" style={{ accentColor: '#7C3AED' }} /></div> :
                                                col.computed ? <div className="px-2 py-1 text-sm text-gray-600 bg-gray-100 text-center font-mono">{mod[col.id]}</div> :
                                                <input type={col.type === 'number' ? 'number' : 'text'} value={mod[col.id] ?? ''} onChange={e => updateCell(ri, ci, col.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && ri < modules.length - 1) { e.preventDefault(); setTimeout(() => tableRef.current?.querySelector(`tr:nth-child(${di + 2}) td:nth-child(${ci + 2}) input`)?.focus(), 0); } }} placeholder={col.placeholder || ''} className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono" style={{ minWidth: col.width - 16 }} />}
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-1 text-center"><button onClick={() => deleteRow(ri)} className="text-red-500 hover:text-red-700 text-sm">🗑️</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {contextMenu && <div className="fixed bg-white rounded-lg shadow-xl border py-1 z-50" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
                <button onClick={fillColumn} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">📊 Fill Column (to end)</button>
                <button onClick={fillSelection} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">📋 Fill Selection</button>
                <hr className="my-1" />
                <button onClick={() => { setBulkUpdateModal(true); setContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">✏️ Bulk Update ({selectedCells.size})</button>
            </div>}
            {headerContextMenu && <div className="fixed bg-white rounded-lg shadow-xl border py-1 z-50" style={{ left: headerContextMenu.x, top: headerContextMenu.y }} onClick={e => e.stopPropagation()}>
                <button onClick={() => moveColumnLeft(headerContextMenu.col)} disabled={headerContextMenu.col === 0} className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${headerContextMenu.col === 0 ? 'text-gray-400' : ''}`}>← Move Left</button>
                <button onClick={() => moveColumnRight(headerContextMenu.col)} disabled={headerContextMenu.col === SEQUENCE_COLUMNS.length - 1} className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${headerContextMenu.col === SEQUENCE_COLUMNS.length - 1 ? 'text-gray-400' : ''}`}>→ Move Right</button>
                <hr className="my-1" />
                <button onClick={() => { handleSort(SEQUENCE_COLUMNS[headerContextMenu.col].id); setHeaderContextMenu(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">↕ Sort Column</button>
                <hr className="my-1" />
                <button onClick={resetColumnOrder} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-gray-500">↺ Reset Column Order</button>
            </div>}
            {rowContextMenu && <div className="fixed bg-white rounded-lg shadow-xl border py-1 z-50" style={{ left: rowContextMenu.x, top: rowContextMenu.y }} onClick={e => e.stopPropagation()}>
                <button onClick={() => addRowAt(rowContextMenu.row)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">➕ Insert Above</button>
                <button onClick={() => addRowAt(rowContextMenu.row + 1)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">➕ Insert Below</button>
                <hr className="my-1" />
                <button onClick={deleteSelectedRows} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600">🗑️ Delete ({selectedRows.size})</button>
            </div>}
            {bulkUpdateModal && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
                    <h3 className="text-lg font-bold mb-4">Bulk Update {selectedCells.size} Cells</h3>
                    {(() => {
                        const cells = Array.from(selectedCells).map(parseKey);
                        const col = cells[0]?.col;
                        const colDef = SEQUENCE_COLUMNS[col];
                        const sameCol = cells.every(c => c.col === col);
                        if (!sameCol) return <p className="text-gray-500 mb-4">Select cells from same column.</p>;
                        if (colDef?.type === 'checkbox') return <div className="space-y-2 mb-4"><button onClick={() => applyBulkUpdate(true)} className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg">Set All ✓</button><button onClick={() => applyBulkUpdate(false)} className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg">Set All ✗</button></div>;
                        return <div className="mb-4"><label className="block text-sm font-medium mb-1">Value for {colDef?.label}</label><input type={colDef?.type === 'number' ? 'number' : 'text'} id="bulkVal" className="w-full px-3 py-2 border rounded-lg" autoFocus /><button onClick={() => applyBulkUpdate(document.getElementById('bulkVal').value)} className="mt-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg">Apply</button></div>;
                    })()}
                    <button onClick={() => setBulkUpdateModal(null)} className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
            </div>}
            <div className="bg-white border-t px-4 py-2 flex items-center justify-between text-sm text-gray-600 flex-shrink-0">
                <div>{modules.length} modules • {selectedCells.size + selectedRows.size * SEQUENCE_COLUMNS.length + selectedCols.size * modules.length} selected</div>
                <div>{searchTerm && `Showing ${displayModules.length} of ${modules.length}`}</div>
            </div>
        </div>
    );
};

window.ProjectSequencing.PreviousView = function PreviousView({ sequences, onRestore, onBack, onClose }) {
    const { useState } = React;
    const [selected, setSelected] = useState(null);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">←</button><div><h2 className="text-xl font-bold">📚 Previous Sequences</h2><p className="text-sm text-gray-500">{sequences.length} archived</p></div></div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {sequences.map(seq => (
                        <div key={seq.id} className={`p-4 border rounded-lg cursor-pointer mb-2 ${selected?.id === seq.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`} onClick={() => setSelected(seq)}>
                            <div className="font-semibold">{seq.name}</div>
                            <div className="text-sm text-gray-500">{new Date(seq.createdAt).toLocaleDateString()} • {seq.modules?.length || 0} modules</div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t flex justify-between">
                    <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Back</button>
                    <button onClick={() => selected && onRestore(selected)} disabled={!selected} className={`px-4 py-2 rounded-lg ${selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>Restore</button>
                </div>
            </div>
        </div>
    );
};

console.log('[ProjectSequencing] Full Excel-like builder loaded');
