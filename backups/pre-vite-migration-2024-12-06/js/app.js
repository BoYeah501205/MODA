// ============================================================================
// MODA MAIN APP - Optimized with Memoization
// ============================================================================

const { useState, useEffect, useMemo, useCallback, memo } = React;

// Main App Component
function App() {
    const auth = useAuth();
    
    // If not logged in, show login page
    if (!auth.currentUser) {
        return <LoginPage auth={auth} />;
    }
    
    // If logged in, show dashboard
    return <Dashboard auth={auth} />;
}

// Render App
ReactDOM.render(<App />, document.getElementById('root'));

// ============================================================================
// EMERGENCY RECOVERY FUNCTION
// ============================================================================
window.MODA_EMERGENCY_ADMIN_RESTORE = function() {
    console.log('🚨 EMERGENCY ADMIN RESTORE INITIATED');
    
    const users = MODA_STORAGE.get('autovol_users', []);
    const trevor = users.find(u => 
        u.email === 'trevor@autovol.com' || 
        (u.firstName === 'Trevor' && u.lastName === 'Fletcher')
    );
    
    if (trevor) {
        trevor.dashboardRole = 'admin';
        trevor.isProtected = true;
        MODA_STORAGE.set('autovol_users', users);
        console.log('✅ Trevor Fletcher restored as protected Admin');
        alert('✅ Admin access restored to Trevor Fletcher. Refreshing page...');
        window.location.reload();
    } else {
        console.error('❌ Trevor Fletcher not found in user records');
        alert('❌ Could not find Trevor Fletcher in user records');
    }
};

// Log system status
console.log('🛡️ MODA Dashboard Role System Loaded');
console.log('🛡️ Emergency recovery: MODA_EMERGENCY_ADMIN_RESTORE()');
console.log('🛡️ Trevor Fletcher account is protected');
console.log('✅ MODA Optimized Version 2.0 Loaded');
