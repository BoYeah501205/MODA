/**
 * AdminPanel.jsx
 * Consolidated Admin tab with collapsible accordion sections grouped by category.
 * Persists expansion state to localStorage.
 */

(function() {
    'use strict';

    const { useState, useEffect, useCallback } = React;

    const STORAGE_KEY = 'moda_admin_panel_state';

    const ADMIN_SECTIONS = {
        usersAccess: {
            id: 'usersAccess',
            title: 'Users & Access',
            description: 'Manage user permissions and dashboard roles',
            sections: [
                { id: 'userPermissions', title: 'User Permissions', description: 'Manage user access and permissions' },
                { id: 'dashboardRoles', title: 'Dashboard Roles', description: 'Configure role-based access control' }
            ]
        },
        appConfig: {
            id: 'appConfig',
            title: 'App Configuration',
            description: 'Customize application settings and categories',
            sections: [
                { id: 'issueTypes', title: 'Issue Types', description: 'Manage issue types, routing, and export issues data' },
                { id: 'issueCategories', title: 'Issue Categories', description: 'Manage sub-categories within each issue type' }
            ]
        },
        system: {
            id: 'system',
            title: 'System',
            description: 'Data management and activity monitoring',
            sections: [
                { id: 'dataManagement', title: 'Data Management', description: 'Manage trash, backup and restore data' },
                { id: 'activityLog', title: 'Activity Log', description: 'View system activity and audit trail' },
                { id: 'developerTools', title: 'Developer Tools', description: 'Debug console and developer options' }
            ]
        }
    };

    function CollapsibleSection({ id, title, description, isExpanded, onToggle, children }) {
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <button
                    onClick={() => onToggle(id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    style={{ borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none' }}
                >
                    <div className="text-left">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--autovol-navy)' }}>{title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                    </div>
                    <div 
                        className="flex-shrink-0 ml-4 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </button>
                {isExpanded && (
                    <div className="p-6">
                        {children}
                    </div>
                )}
            </div>
        );
    }

    function CategoryHeader({ title, description }) {
        return (
            <div className="mb-3 mt-6 first:mt-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h2>
            </div>
        );
    }

    function DeveloperToolsSection() {
        const [erudaEnabled, setErudaEnabled] = useState(() => {
            return window.MODA_ERUDA?.isEnabled() || false;
        });

        const handleToggleEruda = useCallback(() => {
            if (window.MODA_ERUDA) {
                window.MODA_ERUDA.toggle();
                setErudaEnabled(window.MODA_ERUDA.isEnabled());
            }
        }, []);

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <h4 className="font-medium text-gray-900">Mobile Debug Console</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            Shows a floating gear icon for viewing console logs, network requests, and debugging on mobile devices.
                        </p>
                    </div>
                    <button
                        onClick={handleToggleEruda}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            erudaEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={erudaEnabled}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                erudaEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
                {erudaEnabled && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        Debug console is enabled. A gear icon will appear in the bottom-right corner. Disabling will reload the page.
                    </p>
                )}
            </div>
        );
    }

    function AdminPanel({ auth, onOpenDataManagement }) {
        const [expandedSections, setExpandedSections] = useState(() => {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (e) {
                console.warn('Failed to load admin panel state:', e);
            }
            return { userPermissions: true };
        });

        useEffect(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections));
            } catch (e) {
                console.warn('Failed to save admin panel state:', e);
            }
        }, [expandedSections]);

        const toggleSection = useCallback((sectionId) => {
            setExpandedSections(prev => ({
                ...prev,
                [sectionId]: !prev[sectionId]
            }));
        }, []);

        const renderSectionContent = (sectionId) => {
            switch (sectionId) {
                case 'userPermissions':
                    return window.UserPermissionsManager ? (
                        <window.UserPermissionsManager auth={auth} />
                    ) : (
                        <div>
                            <p className="text-gray-600 mb-4">Manage users through Supabase Dashboard or the People module.</p>
                            <a 
                                href="https://supabase.com/dashboard/project/syreuphexagezawjyjgt/auth/users" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Open Supabase Auth Dashboard
                            </a>
                        </div>
                    );

                case 'dashboardRoles':
                    return window.DashboardRoleManager ? (
                        <window.DashboardRoleManager auth={auth} />
                    ) : (
                        <p className="text-gray-500">Loading Role Manager...</p>
                    );

                case 'issueTypes':
                    return window.IssueTypesManager ? (
                        <window.IssueTypesManager auth={auth} />
                    ) : (
                        <p className="text-gray-500">Issue Types Manager not loaded.</p>
                    );

                case 'issueCategories':
                    return window.IssueCategoriesManager ? (
                        <window.IssueCategoriesManager auth={auth} />
                    ) : (
                        <p className="text-gray-500">Issue Categories Manager not loaded.</p>
                    );

                case 'dataManagement':
                    return (
                        <div className="flex items-center justify-between">
                            <p className="text-gray-600">Access trash, backup, and restore functionality.</p>
                            <button 
                                onClick={onOpenDataManagement}
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition flex items-center gap-2"
                            >
                                <span className="icon-settings" style={{width: '16px', height: '16px', display: 'inline-block'}}></span>
                                Open Data Management
                            </button>
                        </div>
                    );

                case 'activityLog':
                    return window.ActivityLogViewer ? (
                        <window.ActivityLogViewer 
                            showFilters={true}
                            showExport={true}
                            maxHeight="500px"
                        />
                    ) : (
                        <p className="text-gray-500">Activity logging module not loaded.</p>
                    );

                case 'developerTools':
                    return <DeveloperToolsSection />;

                default:
                    return <p className="text-gray-500">Section not found.</p>;
            }
        };

        return (
            <div className="space-y-2 pb-8">
                {Object.values(ADMIN_SECTIONS).map(category => (
                    <div key={category.id}>
                        <CategoryHeader title={category.title} description={category.description} />
                        <div className="space-y-2">
                            {category.sections.map(section => (
                                <CollapsibleSection
                                    key={section.id}
                                    id={section.id}
                                    title={section.title}
                                    description={section.description}
                                    isExpanded={!!expandedSections[section.id]}
                                    onToggle={toggleSection}
                                >
                                    {renderSectionContent(section.id)}
                                </CollapsibleSection>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    window.AdminPanel = AdminPanel;
})();
