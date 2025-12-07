// ============================================================================
// App Providers - Combines all context providers
// ============================================================================

import React from 'react';
import { ProjectsProvider } from './ProjectsContext';
import { AuthProvider } from './AuthContext';
import { UIProvider } from './UIContext';

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ProjectsProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </ProjectsProvider>
    </AuthProvider>
  );
}
