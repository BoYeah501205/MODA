// ============================================================================
// UI Context - Manages UI state (tabs, modals, selections)
// ============================================================================

import React, { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext(null);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export function UIProvider({ children }) {
  // Navigation state
  const [activeTab, setActiveTab] = useState('production');
  const [productionTab, setProductionTab] = useState('weekly-board');
  
  // Selection state
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  
  // Modal state
  const [modals, setModals] = useState({
    projectForm: false,
    moduleDetail: false,
    reportIssue: false,
    employeeForm: false,
    importData: false
  });
  
  // Modal context data
  const [modalData, setModalData] = useState({});
  
  const openModal = useCallback((modalName, data = {}) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
    setModalData(prev => ({ ...prev, [modalName]: data }));
  }, []);
  
  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setModalData(prev => ({ ...prev, [modalName]: {} }));
  }, []);
  
  const closeAllModals = useCallback(() => {
    setModals({
      projectForm: false,
      moduleDetail: false,
      reportIssue: false,
      employeeForm: false,
      importData: false
    });
    setModalData({});
  }, []);
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);
  
  const value = {
    // Navigation
    activeTab,
    setActiveTab,
    productionTab,
    setProductionTab,
    
    // Selection
    selectedProject,
    setSelectedProject,
    selectedModule,
    setSelectedModule,
    
    // Modals
    modals,
    modalData,
    openModal,
    closeModal,
    closeAllModals,
    
    // Toasts
    toasts,
    showToast
  };
  
  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}
