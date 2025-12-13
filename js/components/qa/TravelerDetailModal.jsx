// ============================================================================
// TRAVELER DETAIL MODAL - Full module information from Weekly Board
// Shows: Serial Number, BLM IDs, Units, Rooms, Dimensions, Difficulty Indicators
// Stop Station Approvals with Pass/Fail, Notes, and Photo Gallery
// ============================================================================

// Stop Stations constant (shared with QAModule)
const STOP_STATIONS_MODAL = ['Mezzanine', 'Prior to Drywall-Back Panel', 'Prior to Module Sign-Off'];

function TravelerDetailModal({ traveler, module, updateTraveler, addDeviation, onClose, QA, canEdit, currentUser }) {
    const [localTraveler, setLocalTraveler] = React.useState(traveler);
    const [expandedStation, setExpandedStation] = React.useState(null);
    const [newComment, setNewComment] = React.useState('');
    const [commentPhotos, setCommentPhotos] = React.useState([]); // Photos to attach to current comment
    const [selectedPhotos, setSelectedPhotos] = React.useState([]);
    const [showPhotoViewer, setShowPhotoViewer] = React.useState(null);
    
    // Save changes
    const saveChanges = () => {
        updateTraveler(traveler.id, localTraveler);
    };
    
    // Update local state
    const updateLocal = (updates) => {
        setLocalTraveler(prev => ({ ...prev, ...updates }));
    };
    
    // Handle Stop Station Pass/Fail
    const handleStopStationResult = (station, result) => {
        const approvals = { ...localTraveler.stopStationApprovals };
        approvals[station] = {
            ...approvals[station],
            result: result, // 'PASS' or 'FAIL'
            inspectedBy: currentUser?.name || 'QA Inspector',
            inspectedAt: new Date().toISOString(),
            comments: approvals[station]?.comments || [],
            photos: approvals[station]?.photos || []
        };
        updateLocal({ stopStationApprovals: approvals });
    };
    
    // Add comment to stop station (with optional attached photos)
    const addStationComment = (station) => {
        if (!newComment.trim() && commentPhotos.length === 0) return;
        
        const approvals = { ...localTraveler.stopStationApprovals };
        const stationData = approvals[station] || { comments: [], photos: [] };
        
        stationData.comments = [
            ...(stationData.comments || []),
            {
                id: Date.now(),
                text: newComment.trim(),
                author: currentUser?.name || 'QA Inspector',
                timestamp: new Date().toISOString(),
                photos: commentPhotos // Attach photos to this comment
            }
        ];
        
        approvals[station] = stationData;
        updateLocal({ stopStationApprovals: approvals });
        setNewComment('');
        setCommentPhotos([]); // Clear pending photos
    };
    
    // Handle photo upload for comment attachment
    const handleCommentPhotoUpload = (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setCommentPhotos(prev => [
                    ...prev,
                    {
                        id: Date.now() + Math.random(),
                        data: e.target.result,
                        name: file.name
                    }
                ]);
            };
            reader.readAsDataURL(file);
        });
        // Reset input so same file can be selected again
        event.target.value = '';
    };
    
    // Remove pending photo from comment
    const removeCommentPhoto = (photoId) => {
        setCommentPhotos(prev => prev.filter(p => p.id !== photoId));
    };
    
    // Handle photo upload
    const handlePhotoUpload = (station, event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        // Convert files to base64 for storage
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const approvals = { ...localTraveler.stopStationApprovals };
                const stationData = approvals[station] || { comments: [], photos: [] };
                
                stationData.photos = [
                    ...(stationData.photos || []),
                    {
                        id: Date.now() + Math.random(),
                        data: e.target.result,
                        name: file.name,
                        uploadedBy: currentUser?.name || 'QA Inspector',
                        uploadedAt: new Date().toISOString()
                    }
                ];
                
                approvals[station] = stationData;
                updateLocal({ stopStationApprovals: approvals });
            };
            reader.readAsDataURL(file);
        });
    };
    
    // Delete photo
    const deletePhoto = (station, photoId) => {
        const approvals = { ...localTraveler.stopStationApprovals };
        const stationData = approvals[station];
        if (stationData?.photos) {
            stationData.photos = stationData.photos.filter(p => p.id !== photoId);
            approvals[station] = stationData;
            updateLocal({ stopStationApprovals: approvals });
        }
    };
    
    // Production stages in order (matches App.jsx)
    const PRODUCTION_STAGES = [
        { id: 'auto-fc', name: 'Auto-FC' },
        { id: 'auto-walls', name: 'Auto-Walls' },
        { id: 'mezzanine', name: 'Mezzanine' },
        { id: 'elec-ceiling', name: 'Elec-Ceiling' },
        { id: 'wall-set', name: 'Wall Set' },
        { id: 'ceiling-set', name: 'Ceiling Set' },
        { id: 'soffits', name: 'Soffits' },
        { id: 'mech-rough', name: 'Mech Rough' },
        { id: 'elec-rough', name: 'Elec Rough' },
        { id: 'plumb-rough', name: 'Plumb Rough' },
        { id: 'exteriors', name: 'Exteriors' },
        { id: 'drywall-bp', name: 'Drywall-BP' },
        { id: 'drywall-ttp', name: 'Drywall-TTP' },
        { id: 'roofing', name: 'Roofing' },
        { id: 'pre-finish', name: 'Pre-Finish' },
        { id: 'mech-trim', name: 'Mech Trim' },
        { id: 'elec-trim', name: 'Elec Trim' },
        { id: 'plumb-trim', name: 'Plumb Trim' },
        { id: 'final-finish', name: 'Final Finish' },
        { id: 'sign-off', name: 'Sign-Off' },
        { id: 'close-up', name: 'Close-Up' }
    ];
    
    // Get current station from module stageProgress
    const getCurrentStation = () => {
        const stageProgress = module?.stageProgress || {};
        // Find the last stage with progress > 0 but < 100 (in progress)
        for (let i = PRODUCTION_STAGES.length - 1; i >= 0; i--) {
            const stage = PRODUCTION_STAGES[i];
            if (stageProgress[stage.id] > 0 && stageProgress[stage.id] < 100) {
                return stage.name;
            }
        }
        // If close-up is 100, module is complete
        if (stageProgress['close-up'] === 100) return 'Complete';
        // Find the last completed stage
        for (let i = PRODUCTION_STAGES.length - 1; i >= 0; i--) {
            const stage = PRODUCTION_STAGES[i];
            if (stageProgress[stage.id] === 100) {
                if (i < PRODUCTION_STAGES.length - 1) {
                    return PRODUCTION_STAGES[i + 1].name;
                }
                return 'Complete';
            }
        }
        return 'Auto-FC';
    };
    
    const currentStation = getCurrentStation();
    const isAtStopStation = STOP_STATIONS_MODAL.includes(currentStation);
    
    // Get inspection progress
    const getProgress = () => {
        let total = 0, completed = 0;
        (localTraveler.departmentChecklists || []).forEach(dept => {
            (dept.items || []).forEach(item => {
                total++;
                if (item.conformance) completed++;
            });
        });
        return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    };
    
    const progress = getProgress();
    
    // Get module data (prefer from module prop, fallback to traveler)
    const serialNumber = module?.serialNumber || localTraveler.serialNumber || '-';
    const projectName = module?.projectName || localTraveler.projectName || '-';
    const buildSequence = module?.buildSequence || localTraveler.buildSequence;
    const hitchBLM = module?.hitchBLM || module?.specs?.blmHitch || localTraveler.hitchBLM || '-';
    const rearBLM = module?.rearBLM || module?.specs?.blmRear || localTraveler.rearBLM || '-';
    const hitchUnit = module?.hitchUnit || module?.specs?.hitchUnit || localTraveler.hitchUnit || '-';
    const rearUnit = module?.rearUnit || module?.specs?.rearUnit || localTraveler.rearUnit || '-';
    const hitchRoom = module?.hitchRoom || localTraveler.hitchRoom || '-';
    const rearRoom = module?.rearRoom || localTraveler.rearRoom || '-';
    const hitchRoomType = module?.hitchRoomType || localTraveler.hitchRoomType || '-';
    const rearRoomType = module?.rearRoomType || localTraveler.rearRoomType || '-';
    const width = module?.width || module?.specs?.width || localTraveler.width || '-';
    const length = module?.length || module?.specs?.length || localTraveler.length || '-';
    const squareFootage = module?.squareFootage || module?.specs?.squareFootage || localTraveler.squareFootage || '-';
    const difficultyIndicators = module?.difficultyIndicators || localTraveler.difficultyIndicators || [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between" 
                     style={{ backgroundColor: localTraveler.qaHold ? '#DC2626' : 'var(--autovol-navy)' }}>
                    <div>
                        <h3 className="text-xl font-bold text-white">{serialNumber}</h3>
                        <p className="text-sm text-gray-300">
                            {projectName}
                            {buildSequence && <span className="ml-2">Build Sequence: {buildSequence}</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Module Information - Dimensions */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>Module Information</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 block">Width</span>
                                <span className="font-medium text-lg">{width}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Length</span>
                                <span className="font-medium text-lg">{length}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Square Footage</span>
                                <span className="font-medium text-lg">{squareFootage}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* HITCH Side */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>HITCH Side</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 block">BLM ID</span>
                                <span className="font-medium font-mono">{hitchBLM}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Unit</span>
                                <span className="font-medium">{hitchUnit}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Room</span>
                                <span className="font-medium">{hitchRoom}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Room Type</span>
                                <span className="font-medium">{hitchRoomType}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* REAR Side */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>REAR Side</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 block">BLM ID</span>
                                <span className="font-medium font-mono">{rearBLM}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Unit</span>
                                <span className="font-medium">{rearUnit}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Room</span>
                                <span className="font-medium">{rearRoom}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Room Type</span>
                                <span className="font-medium">{rearRoomType}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Difficulty Indicators */}
                    {difficultyIndicators.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>Difficulty Indicators</h4>
                            <div className="flex flex-wrap gap-2">
                                {difficultyIndicators.map((indicator, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                        {indicator}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Timeline - from Weekly Board */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>
                            Timeline
                            <span className="text-xs font-normal text-gray-400 ml-2">(from Weekly Board)</span>
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 block">On-Line Date</span>
                                <span className="font-medium">
                                    {localTraveler.onLineDate ? new Date(localTraveler.onLineDate).toLocaleDateString() : '-'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Current Station</span>
                                <span className="font-medium" style={{ color: isAtStopStation ? '#D97706' : 'var(--autovol-navy)' }}>
                                    {currentStation}
                                    {isAtStopStation && <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">STOP</span>}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Off-Line Date</span>
                                <span className="font-medium">
                                    {localTraveler.offLineDate ? new Date(localTraveler.offLineDate).toLocaleDateString() : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Inspection Progress */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>Inspection Progress</h4>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" 
                                        style={{ width: `${progress.percent}%`, backgroundColor: progress.percent === 100 ? '#43A047' : 'var(--autovol-teal)' }}>
                                    </div>
                                </div>
                            </div>
                            <span className="font-medium text-sm" style={{ color: progress.percent === 100 ? '#43A047' : 'var(--autovol-teal)' }}>
                                {progress.completed}/{progress.total} ({progress.percent}%)
                            </span>
                        </div>
                    </div>
                    
                    {/* Stop Station Approvals - Enhanced with Pass/Fail, Comments, Photos */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3" style={{ color: 'var(--autovol-navy)' }}>
                            Stop Station Approvals
                            <span className="text-xs font-normal text-gray-400 ml-2">QC/QA Inspection Points</span>
                        </h4>
                        <div className="space-y-3">
                            {STOP_STATIONS_MODAL.map((station, idx) => {
                                const approval = localTraveler.stopStationApprovals?.[station] || {};
                                const isCurrent = currentStation === station || currentStation === 'Mezzanine' && station === 'Mezzanine';
                                const isExpanded = expandedStation === station;
                                const hasResult = approval.result;
                                const isPassed = approval.result === 'PASS';
                                const isFailed = approval.result === 'FAIL';
                                const commentCount = (approval.comments || []).length;
                                const photoCount = (approval.photos || []).length;
                                
                                return (
                                    <div key={station} className={`rounded-lg border overflow-hidden ${
                                        isFailed ? 'border-red-300 bg-red-50' :
                                        isPassed ? 'border-green-300 bg-green-50' : 
                                        isCurrent ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
                                    }`}>
                                        {/* Station Header - Always Visible */}
                                        <div 
                                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-80"
                                            onClick={() => setExpandedStation(isExpanded ? null : station)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                                    isFailed ? 'bg-red-500' :
                                                    isPassed ? 'bg-green-500' : 
                                                    isCurrent ? 'bg-yellow-500' : 'bg-gray-300'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-sm">{station}</span>
                                                    {hasResult && (
                                                        <div className="text-xs text-gray-500">
                                                            {approval.result} by {approval.inspectedBy} - {new Date(approval.inspectedAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Status badges */}
                                                {commentCount > 0 && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                                        {commentCount} note{commentCount !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {photoCount > 0 && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                                        {photoCount} photo{photoCount !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {/* Result badge */}
                                                {isPassed && <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white font-medium">PASS</span>}
                                                {isFailed && <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white font-medium">FAIL</span>}
                                                {!hasResult && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">Pending</span>}
                                                {/* Expand indicator */}
                                                <span className="text-gray-400 text-lg">{isExpanded ? '-' : '+'}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="border-t p-4 space-y-4 bg-white">
                                                {/* Pass/Fail Buttons */}
                                                {canEdit && (
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => handleStopStationResult(station, 'PASS')}
                                                            className={`flex-1 py-3 rounded-lg font-medium text-sm transition ${
                                                                isPassed 
                                                                    ? 'bg-green-600 text-white' 
                                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                        >
                                                            PASS Inspection
                                                        </button>
                                                        <button
                                                            onClick={() => handleStopStationResult(station, 'FAIL')}
                                                            className={`flex-1 py-3 rounded-lg font-medium text-sm transition ${
                                                                isFailed 
                                                                    ? 'bg-red-600 text-white' 
                                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            }`}
                                                        >
                                                            FAIL Inspection
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Comments Section */}
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                        Inspection Notes
                                                        <span className="text-xs font-normal text-gray-400 ml-1">(visible to all inspectors)</span>
                                                    </h5>
                                                    
                                                    {/* Existing comments */}
                                                    {(approval.comments || []).length > 0 && (
                                                        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                                                            {approval.comments.map(comment => (
                                                                <div key={comment.id} className="bg-gray-50 rounded p-2 text-sm">
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="font-medium text-gray-700">{comment.author}</span>
                                                                        <span className="text-xs text-gray-400">
                                                                            {new Date(comment.timestamp).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    {comment.text && <p className="text-gray-600 mt-1">{comment.text}</p>}
                                                                    
                                                                    {/* Comment attached photos */}
                                                                    {(comment.photos || []).length > 0 && (
                                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                                            {comment.photos.map(photo => (
                                                                                <img 
                                                                                    key={photo.id}
                                                                                    src={photo.data} 
                                                                                    alt={photo.name}
                                                                                    className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                                    onClick={() => setShowPhotoViewer(photo)}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Add new comment with photo attachment */}
                                                    {canEdit && (
                                                        <div className="space-y-2">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={newComment}
                                                                    onChange={(e) => setNewComment(e.target.value)}
                                                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addStationComment(station)}
                                                                    placeholder="Add inspection note..."
                                                                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                                                />
                                                                <label className="px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 flex items-center gap-1 text-gray-600" title="Attach photos">
                                                                    <span className="text-lg">📷</span>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        multiple
                                                                        className="hidden"
                                                                        onChange={handleCommentPhotoUpload}
                                                                    />
                                                                </label>
                                                                <button
                                                                    onClick={() => addStationComment(station)}
                                                                    className="px-4 py-2 rounded-lg text-white text-sm"
                                                                    style={{ backgroundColor: 'var(--autovol-teal)' }}
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                            
                                                            {/* Pending photos preview */}
                                                            {commentPhotos.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                                                                    <span className="text-xs text-gray-500 w-full mb-1">Attached photos ({commentPhotos.length}):</span>
                                                                    {commentPhotos.map(photo => (
                                                                        <div key={photo.id} className="relative group">
                                                                            <img 
                                                                                src={photo.data} 
                                                                                alt={photo.name}
                                                                                className="w-16 h-16 object-cover rounded border"
                                                                            />
                                                                            <button
                                                                                onClick={() => removeCommentPhoto(photo.id)}
                                                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Photo Gallery */}
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                        Inspection Photos
                                                    </h5>
                                                    
                                                    {/* Photo grid */}
                                                    {(approval.photos || []).length > 0 && (
                                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                                            {approval.photos.map(photo => (
                                                                <div key={photo.id} className="relative group">
                                                                    <img 
                                                                        src={photo.data} 
                                                                        alt={photo.name}
                                                                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                                                        onClick={() => setShowPhotoViewer(photo)}
                                                                    />
                                                                    {canEdit && (
                                                                        <button
                                                                            onClick={() => deletePhoto(station, photo.id)}
                                                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
                                                                        >
                                                                            x
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Upload button */}
                                                    {canEdit && (
                                                        <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
                                                            <span>+ Add Photos</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => handlePhotoUpload(station, e)}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Photo Viewer Modal */}
                    {showPhotoViewer && (
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4"
                            style={{ zIndex: 10000 }}
                            onClick={() => setShowPhotoViewer(null)}
                        >
                            <div className="max-w-4xl max-h-full">
                                <img 
                                    src={showPhotoViewer.data} 
                                    alt={showPhotoViewer.name}
                                    className="max-w-full max-h-[80vh] object-contain"
                                />
                                <div className="text-white text-center mt-4">
                                    <p className="text-sm">{showPhotoViewer.name}</p>
                                    <p className="text-xs text-gray-400">
                                        Uploaded by {showPhotoViewer.uploadedBy} on {new Date(showPhotoViewer.uploadedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* QA Hold Status */}
                    <div className={`rounded-lg p-4 ${localTraveler.qaHold ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <h4 className="font-semibold mb-3" style={{ color: localTraveler.qaHold ? '#DC2626' : 'var(--autovol-navy)' }}>
                            QA Hold Status
                        </h4>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={localTraveler.qaHold || false}
                                    onChange={(e) => updateLocal({ qaHold: e.target.checked, qaHoldReason: e.target.checked ? localTraveler.qaHoldReason : null })}
                                    className="w-5 h-5" 
                                    disabled={!canEdit} 
                                />
                                <span className={`text-sm font-medium ${localTraveler.qaHold ? 'text-red-600' : 'text-gray-600'}`}>
                                    Place on QA Hold
                                </span>
                            </label>
                        </div>
                        {localTraveler.qaHold && (
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hold Reason</label>
                                <input 
                                    type="text" 
                                    value={localTraveler.qaHoldReason || ''}
                                    onChange={(e) => updateLocal({ qaHoldReason: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg border-red-300" 
                                    placeholder="Enter reason for hold..."
                                    disabled={!canEdit} 
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Move to Pending Approval */}
                    {canEdit && localTraveler.status === 'active' && progress.percent === 100 && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <h4 className="font-semibold mb-2 text-green-700">Ready for Completion</h4>
                            <p className="text-sm text-green-600 mb-3">
                                All inspections complete. Move this traveler to Pending Approval for QA Manager sign-off.
                            </p>
                            <button
                                onClick={() => {
                                    updateLocal({ status: 'pending_approval' });
                                    saveChanges();
                                }}
                                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                                style={{ backgroundColor: '#43A047' }}>
                                Move to Pending Approval
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                    <div className="text-xs text-gray-400">
                        Created: {new Date(localTraveler.createdAt).toLocaleDateString()}
                        {localTraveler.lastUpdated && ` | Updated: ${new Date(localTraveler.lastUpdated).toLocaleDateString()}`}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Close</button>
                        {canEdit && (
                            <button onClick={() => { saveChanges(); onClose(); }}
                                className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--autovol-teal)' }}>
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

window.TravelerDetailModal = TravelerDetailModal;
