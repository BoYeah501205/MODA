// ============================================================================
// MODA App - Main Application Component
// Bridge between new Vite module system and existing components
// ============================================================================

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useProjects } from '../contexts/ProjectsContext';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';

// Re-export React hooks for legacy code compatibility
window.React = React;
window.useState = useState;
window.useEffect = useEffect;
window.useMemo = useMemo;
window.useRef = useRef;
window.useCallback = useCallback;

// ===== AUTOVOL LOGO =====
const AUTOVOL_LOGO = "/autovol-logo.png";

// ===== LICENSE PLATE UTILITIES =====
const generateQRCode = (text) => {
    if (typeof qrcode === 'undefined') {
        console.warn('QR code library not loaded');
        return '';
    }
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(4, 0);
};

const buildModuleUrl = (baseUrl, projectId, serialNumber) => {
    const scannerUrl = baseUrl.replace(/[^/]*$/, 'Module_Scanner.html');
    return `${scannerUrl}?project=${encodeURIComponent(projectId)}&module=${encodeURIComponent(serialNumber)}`;
};

const extractFromBLM = (blmId) => {
    const blm = String(blmId || '').toUpperCase();
    const match = blm.match(/B(\d+)L(\d+)M(\d+)/);
    if (match) {
        return {
            building: `B${match[1]}`,
            level: `L${match[2]}`,
            module: `M${match[3].padStart(2, '0')}`
        };
    }
    const serialMatch = String(blmId).match(/^(\d)(\d)(\d+)$/);
    if (serialMatch) {
        return {
            building: `B${serialMatch[1]}`,
            level: `L${serialMatch[2]}`,
            module: `M${serialMatch[3].padStart(2, '0')}`
        };
    }
    return { building: 'OTHER', level: 'OTHER', module: 'OTHER' };
};

const extractStack = (serialNumber) => {
    const result = extractFromBLM(serialNumber);
    return result.building !== 'OTHER' ? result.building : 'OTHER';
};

const extractUnitType = (unitType) => {
    const type = String(unitType).toUpperCase().replace(/[.\-_]/g, ' ').trim();
    const match = type.match(/^(\d*\s*B|STUDIO|STU)/i);
    return match ? match[0].replace(/\s+/g, '') : type.split(' ')[0] || 'OTHER';
};

const getLicensePlateIndicators = (module) => {
    const indicators = [];
    const difficulties = module.difficulties || {};
    
    if (difficulties.sidewall) indicators.push({ key: 'SW', label: 'SW' });
    if (difficulties.short) indicators.push({ key: 'SHORT', label: 'SHORT' });
    if (difficulties.stair) indicators.push({ key: 'STAIR', label: 'STAIR' });
    if (difficulties.hr3Wall) indicators.push({ key: '3HR', label: '3HR' });
    if (difficulties.doubleStudio) indicators.push({ key: 'DBL', label: 'DBL STUDIO' });
    if (difficulties.sawbox) indicators.push({ key: 'SAWBOX', label: 'SAWBOX' });
    if (difficulties.proto) indicators.push({ key: 'PROTO', label: 'PROTO' });
    
    return indicators;
};

// ===== LOADING SCREEN =====
function LoadingScreen() {
    return (
        <div className="min-h-screen bg-autovol-light flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-autovol-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-autovol-navy">Loading MODA...</h2>
                <p className="text-gray-500 mt-2">Initializing dashboard</p>
            </div>
        </div>
    );
}

// ===== LOGIN PAGE =====
function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const result = login(username, password);
        
        if (!result.success) {
            setError(result.error);
        }
        setIsLoading(false);
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-autovol-navy to-blue-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <img src={AUTOVOL_LOGO} alt="Autovol" className="h-16 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-autovol-navy">MODA Dashboard</h1>
                    <p className="text-gray-500">Modular Operations Dashboard Application</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="form-input"
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3 disabled:opacity-50"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Default credentials:</p>
                    <p className="font-mono text-xs mt-1">admin / admin123</p>
                </div>
            </div>
        </div>
    );
}

// ===== MAIN DASHBOARD SHELL =====
function DashboardShell() {
    const { currentUser, logout, isAdmin } = useAuth();
    const { projects, loading: projectsLoading } = useProjects();
    const { activeTab, setActiveTab } = useUI();
    
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    // Available tabs based on role
    const availableTabs = [
        { id: 'production', label: 'Production', icon: '🏭' },
        { id: 'projects', label: 'Projects', icon: '📋' },
        { id: 'people', label: 'People', icon: '👥' },
        { id: 'transport', label: 'Transport', icon: '🚛' },
        ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '⚙️' }] : [])
    ];
    
    if (projectsLoading) {
        return <LoadingScreen />;
    }
    
    return (
        <div className="min-h-screen bg-autovol-light flex">
            {/* Sidebar */}
            <aside className={`bg-autovol-navy text-white transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col`}>
                {/* Logo */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <img src={AUTOVOL_LOGO} alt="Autovol" className="h-8" />
                        {!sidebarCollapsed && <span className="font-bold text-lg">MODA</span>}
                    </div>
                </div>
                
                {/* Navigation */}
                <nav className="flex-1 p-2">
                    {availableTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                                activeTab === tab.id 
                                    ? 'bg-autovol-teal text-white' 
                                    : 'text-white/70 hover:bg-white/10'
                            }`}
                        >
                            <span className="text-xl">{tab.icon}</span>
                            {!sidebarCollapsed && <span>{tab.label}</span>}
                        </button>
                    ))}
                </nav>
                
                {/* User section */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-autovol-teal rounded-full flex items-center justify-center text-sm font-bold">
                            {currentUser?.firstName?.[0] || 'U'}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {currentUser?.firstName} {currentUser?.lastName}
                                </div>
                                <div className="text-xs text-white/50 truncate">{currentUser?.role}</div>
                            </div>
                        )}
                    </div>
                    {!sidebarCollapsed && (
                        <button
                            onClick={logout}
                            className="w-full mt-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            Sign Out
                        </button>
                    )}
                </div>
                
                {/* Collapse toggle */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 text-white/50 hover:text-white border-t border-white/10"
                >
                    {sidebarCollapsed ? '→' : '←'}
                </button>
            </aside>
            
            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    <DashboardContent activeTab={activeTab} />
                </div>
            </main>
        </div>
    );
}

// ===== DASHBOARD CONTENT =====
function DashboardContent({ activeTab }) {
    const { projects, activeProjects, updateModuleProgress } = useProjects();
    
    switch (activeTab) {
        case 'production':
            return <ProductionTab projects={projects} activeProjects={activeProjects} updateModuleProgress={updateModuleProgress} />;
        case 'projects':
            return <ProjectsTab projects={projects} />;
        case 'people':
            return <PeopleTab />;
        case 'transport':
            return <TransportTab />;
        case 'admin':
            return <AdminTab />;
        default:
            return <ProductionTab projects={projects} activeProjects={activeProjects} updateModuleProgress={updateModuleProgress} />;
    }
}

// ===== TAB PLACEHOLDERS (will be expanded) =====
function ProductionTab({ projects, activeProjects, updateModuleProgress }) {
    const [selectedProjectId, setSelectedProjectId] = useState(activeProjects[0]?.id || null);
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-autovol-navy">Production Dashboard</h1>
                <select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="form-input w-64"
                >
                    {activeProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            
            {selectedProject ? (
                <div className="card">
                    <h2 className="card-header">{selectedProject.name}</h2>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-blue-600">{selectedProject.modules?.length || 0}</div>
                            <div className="text-sm text-gray-600">Total Modules</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-yellow-600">
                                {selectedProject.modules?.filter(m => {
                                    const progress = m.stageProgress || {};
                                    return Object.values(progress).some(p => p > 0 && p < 100);
                                }).length || 0}
                            </div>
                            <div className="text-sm text-gray-600">In Progress</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-3xl font-bold text-green-600">
                                {selectedProject.modules?.filter(m => {
                                    const progress = m.stageProgress || {};
                                    return progress['close-up'] === 100;
                                }).length || 0}
                            </div>
                            <div className="text-sm text-gray-600">Complete</div>
                        </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                        Full production board coming soon. Data is syncing with backend.
                    </div>
                </div>
            ) : (
                <div className="card text-center py-12 text-gray-500">
                    No active projects. Create a project to get started.
                </div>
            )}
        </div>
    );
}

function ProjectsTab({ projects }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-autovol-navy">Projects</h1>
                <button className="btn-primary">+ New Project</button>
            </div>
            
            <div className="grid gap-4">
                {projects.map(project => (
                    <div key={project.id} className="card flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <p className="text-sm text-gray-500">{project.client} • {project.location}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                                project.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {project.status}
                            </span>
                            <span className="text-sm text-gray-500">{project.modules?.length || 0} modules</span>
                        </div>
                    </div>
                ))}
                
                {projects.length === 0 && (
                    <div className="card text-center py-12 text-gray-500">
                        No projects yet. Click "New Project" to create one.
                    </div>
                )}
            </div>
        </div>
    );
}

function PeopleTab() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-autovol-navy">People</h1>
            <div className="card text-center py-12 text-gray-500">
                Employee management coming soon.
            </div>
        </div>
    );
}

function TransportTab() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-autovol-navy">Transport</h1>
            <div className="card text-center py-12 text-gray-500">
                Transport tracking coming soon.
            </div>
        </div>
    );
}

function AdminTab() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-autovol-navy">Admin</h1>
            <div className="card text-center py-12 text-gray-500">
                Admin settings coming soon.
            </div>
        </div>
    );
}

// ===== MAIN APP COMPONENT =====
export function MODAApp() {
    const { isAuthenticated, currentUser } = useAuth();
    const { loading } = useProjects();
    
    // Show loading while checking auth/loading data
    if (loading && !currentUser) {
        return <LoadingScreen />;
    }
    
    // Show login if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }
    
    // Show dashboard
    return <DashboardShell />;
}

export default MODAApp;
