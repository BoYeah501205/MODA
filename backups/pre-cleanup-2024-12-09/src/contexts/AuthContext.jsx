// ============================================================================
// Auth Context - Manages authentication and user state
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default users for development
const DEFAULT_USERS = [
  { id: 'admin', username: 'admin', password: 'admin123', firstName: 'Admin', lastName: 'User', role: 'admin', department: 'Management' },
  { id: 'trevor', username: 'trevor', password: 'trevor123', firstName: 'Trevor', lastName: 'Fletcher', role: 'admin', department: 'Engineering' },
  { id: 'user1', username: 'user', password: 'user123', firstName: 'Test', lastName: 'User', role: 'user', department: 'Production' }
];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('autovol_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('autovol_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(!!currentUser);
  
  // Persist to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('autovol_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('autovol_current_user');
    }
  }, [currentUser]);
  
  useEffect(() => {
    localStorage.setItem('autovol_users', JSON.stringify(users));
  }, [users]);
  
  const login = useCallback((username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      const { password: _, ...safeUser } = user;
      setCurrentUser(safeUser);
      setIsAuthenticated(true);
      return { success: true, user: safeUser };
    }
    return { success: false, error: 'Invalid username or password' };
  }, [users]);
  
  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);
  
  const register = useCallback((userData) => {
    const exists = users.some(u => u.username === userData.username);
    if (exists) {
      return { success: false, error: 'Username already exists' };
    }
    
    const newUser = {
      ...userData,
      id: `user-${Date.now()}`,
      role: userData.role || 'user'
    };
    
    setUsers(prev => [...prev, newUser]);
    return { success: true, user: newUser };
  }, [users]);
  
  const isAdmin = currentUser?.role === 'admin';
  
  const value = {
    currentUser,
    users,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    register,
    setCurrentUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
