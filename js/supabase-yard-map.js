// ============================================================================
// MODA YARD MAP v2.0 - SUPABASE DATA ACCESS LAYER
// ============================================================================
// Handles all Supabase operations for Yard Map including:
// - Transport status tracking
// - Module CRUD operations
// - History/audit logging
// - Real-time subscriptions

const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';

// ============================================================================
// HELPER: Get auth headers
// ============================================================================
const getAuthHeaders = () => {
  let accessToken = null;
  try {
    const storageKey = `sb-syreuphexagezawjyjgt-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken = parsed?.access_token;
    }
  } catch (e) {
    console.warn('[YardMapData] Error getting auth token:', e);
  }
  
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
  };
};

// ============================================================================
// HELPER: Supabase fetch wrapper
// ============================================================================
const supabaseFetch = async (endpoint, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
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
// YARD MAPS CRUD
// ============================================================================

const YardMapData = {
  // Get all yard maps (without PDF data for list view)
  async getYardMaps() {
    return await supabaseFetch('yard_maps?select=id,name,yard_type,created_at,updated_at&order=name');
  },
  
  // Get single yard map with PDF data
  async getYardMap(id) {
    const result = await supabaseFetch(`yard_maps?id=eq.${id}&select=*`);
    return result?.[0] || null;
  },
  
  // Create new yard map
  async createYardMap(data) {
    const result = await supabaseFetch('yard_maps?select=*', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    return result?.[0] || null;
  },
  
  // Update yard map
  async updateYardMap(id, data) {
    await supabaseFetch(`yard_maps?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
  },
  
  // Delete yard map
  async deleteYardMap(id) {
    await supabaseFetch(`yard_maps?id=eq.${id}`, { method: 'DELETE' });
  }
};

// ============================================================================
// YARD MODULES CRUD
// ============================================================================

const YardModuleData = {
  // Get modules for a yard map
  async getModules(yardMapId, includeRemoved = false) {
    let query = `yard_modules?yard_map_id=eq.${yardMapId}&select=*`;
    if (!includeRemoved) {
      query += '&status=neq.removed';
    }
    query += '&order=placed_at.desc';
    return await supabaseFetch(query);
  },
  
  // Get single module
  async getModule(id) {
    const result = await supabaseFetch(`yard_modules?id=eq.${id}&select=*`);
    return result?.[0] || null;
  },
  
  // Get module by BLM
  async getModuleByBlm(blm, yardMapId = null) {
    let query = `yard_modules?blm=eq.${encodeURIComponent(blm)}&select=*`;
    if (yardMapId) {
      query += `&yard_map_id=eq.${yardMapId}`;
    }
    const result = await supabaseFetch(query);
    return result?.[0] || null;
  },
  
  // Create new module
  async createModule(data) {
    const moduleData = {
      ...data,
      status: 'active',
      placed_at: new Date().toISOString()
    };
    
    const result = await supabaseFetch('yard_modules?select=*', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(moduleData)
    });
    
    // Log to history
    if (result?.[0]) {
      await YardHistoryData.logAction(data.blm, data.yard_map_id, 'placed', data.x, data.y);
    }
    
    return result?.[0] || null;
  },
  
  // Update module position/properties
  async updateModule(id, data) {
    await supabaseFetch(`yard_modules?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
  },
  
  // Update module with history logging
  async updateModuleWithHistory(id, data, action = 'modified') {
    const module = await this.getModule(id);
    if (!module) return;
    
    await this.updateModule(id, data);
    await YardHistoryData.logAction(module.blm, module.yard_map_id, action, data.x, data.y);
  },
  
  // Mark module as shipped (pending confirmation)
  async markShippedPending(id) {
    await supabaseFetch(`yard_modules?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'shipped_pending',
        updated_at: new Date().toISOString()
      })
    });
  },
  
  // Confirm shipped - remove from map
  async confirmShippedRemove(id) {
    const module = await this.getModule(id);
    if (!module) return;
    
    await supabaseFetch(`yard_modules?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'removed',
        removed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    
    await YardHistoryData.logAction(module.blm, module.yard_map_id, 'removed', null, null, 'Removed after shipped confirmation');
  },
  
  // Confirm shipped - keep on map
  async confirmShippedKeep(id) {
    const module = await this.getModule(id);
    if (!module) return;
    
    await supabaseFetch(`yard_modules?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'shipped_kept',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    
    await YardHistoryData.logAction(module.blm, module.yard_map_id, 'shipped', null, null, 'Kept on map after shipping');
  },
  
  // Delete module (hard delete)
  async deleteModule(id) {
    const module = await this.getModule(id);
    if (!module) return;
    
    await supabaseFetch(`yard_modules?id=eq.${id}`, { method: 'DELETE' });
    await YardHistoryData.logAction(module.blm, module.yard_map_id, 'removed', null, null, 'Manually deleted');
  },
  
  // Get stats for a yard map
  async getStats(yardMapId) {
    const modules = await this.getModules(yardMapId, false);
    
    const stats = {
      total: modules?.length || 0,
      active: 0,
      shippedKept: 0,
      byProject: {}
    };
    
    modules?.forEach(m => {
      if (m.status === 'active') stats.active++;
      if (m.status === 'shipped_kept') stats.shippedKept++;
      
      if (!stats.byProject[m.abbreviation]) {
        stats.byProject[m.abbreviation] = { active: 0, shippedKept: 0, total: 0, color: m.color };
      }
      stats.byProject[m.abbreviation].total++;
      if (m.status === 'active') stats.byProject[m.abbreviation].active++;
      if (m.status === 'shipped_kept') stats.byProject[m.abbreviation].shippedKept++;
    });
    
    return stats;
  }
};

// ============================================================================
// TRANSPORT STATUS CRUD
// ============================================================================

const TransportStatusData = {
  // Get all transport statuses
  async getAll() {
    return await supabaseFetch('transport_status?select=*&order=updated_at.desc');
  },
  
  // Get ready-for-yard queue
  async getReadyForYardQueue() {
    return await supabaseFetch('transport_status?status=eq.ready_for_yard&select=*&order=updated_at.asc');
  },
  
  // Get status by BLM
  async getByBlm(blm) {
    const result = await supabaseFetch(`transport_status?module_blm=eq.${encodeURIComponent(blm)}&select=*`);
    return result?.[0] || null;
  },
  
  // Create or update transport status
  async upsert(blm, status, yardMapId = null) {
    const data = {
      module_blm: blm,
      status: status,
      updated_at: new Date().toISOString()
    };
    
    if (yardMapId) data.yard_map_id = yardMapId;
    if (status === 'in_yard') data.placed_in_yard_at = new Date().toISOString();
    if (status === 'shipped') data.marked_shipped_at = new Date().toISOString();
    if (status === 'delivered') data.removed_from_yard_at = new Date().toISOString();
    
    // Try to update first
    const existing = await this.getByBlm(blm);
    if (existing) {
      await supabaseFetch(`transport_status?id=eq.${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return { ...existing, ...data };
    }
    
    // Create new
    const result = await supabaseFetch('transport_status?select=*', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ ...data, created_at: new Date().toISOString() })
    });
    return result?.[0] || null;
  },
  
  // Mark as ready for yard (from WeeklyBoard/Transport)
  async markReadyForYard(blm) {
    return await this.upsert(blm, 'ready_for_yard');
  },
  
  // Mark as in yard (when placed on map)
  async markInYard(blm, yardMapId) {
    return await this.upsert(blm, 'in_yard', yardMapId);
  },
  
  // Mark as shipped (from Transport Board)
  async markShipped(blm) {
    return await this.upsert(blm, 'shipped');
  },
  
  // Mark as delivered (removed from yard)
  async markDelivered(blm) {
    return await this.upsert(blm, 'delivered');
  }
};

// ============================================================================
// YARD MODULE HISTORY
// ============================================================================

const YardHistoryData = {
  // Get history for a module
  async getByBlm(blm, limit = 50) {
    return await supabaseFetch(`yard_module_history?module_blm=eq.${encodeURIComponent(blm)}&select=*&order=created_at.desc&limit=${limit}`);
  },
  
  // Get history for a yard map
  async getByYardMap(yardMapId, limit = 100) {
    return await supabaseFetch(`yard_module_history?yard_map_id=eq.${yardMapId}&select=*&order=created_at.desc&limit=${limit}`);
  },
  
  // Log an action
  async logAction(blm, yardMapId, action, x = null, y = null, notes = null) {
    const data = {
      module_blm: blm,
      yard_map_id: yardMapId,
      action: action,
      created_at: new Date().toISOString()
    };
    
    if (x !== null) data.x = x;
    if (y !== null) data.y = y;
    if (notes) data.notes = notes;
    
    // Try to get current user ID
    try {
      const storageKey = `sb-syreuphexagezawjyjgt-auth-token`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.id) {
          data.created_by = parsed.user.id;
        }
      }
    } catch (e) {}
    
    await supabaseFetch('yard_module_history', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

// ============================================================================
// YARD SETTINGS
// ============================================================================

const YardSettingsData = {
  // Get settings
  async get() {
    const result = await supabaseFetch('yard_settings?id=eq.1&select=*');
    return result?.[0] || { default_font_size: 14, default_yard_map_id: null };
  },
  
  // Update settings
  async update(data) {
    await supabaseFetch('yard_settings?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
  },
  
  // Set default yard map
  async setDefaultYardMap(yardMapId) {
    await this.update({ default_yard_map_id: yardMapId });
  },
  
  // Set default font size
  async setDefaultFontSize(size) {
    await this.update({ default_font_size: size });
  }
};

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

const YardMapRealtime = {
  subscriptions: new Map(),
  
  // Subscribe to transport status changes
  subscribeToTransportStatus(callback) {
    const channelName = 'transport_status_changes';
    
    // Use Supabase client if available
    if (window.supabase?.channel) {
      const channel = window.supabase.channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transport_status'
        }, (payload) => {
          callback(payload);
        })
        .subscribe();
      
      this.subscriptions.set(channelName, channel);
      return () => {
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      };
    }
    
    // Fallback: polling
    console.warn('[YardMapRealtime] Supabase client not available, using polling');
    let lastCheck = new Date().toISOString();
    const interval = setInterval(async () => {
      try {
        const updates = await supabaseFetch(`transport_status?updated_at=gt.${lastCheck}&select=*`);
        if (updates?.length > 0) {
          updates.forEach(u => callback({ eventType: 'UPDATE', new: u }));
          lastCheck = new Date().toISOString();
        }
      } catch (e) {
        console.error('[YardMapRealtime] Polling error:', e);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  },
  
  // Subscribe to yard module changes for a specific yard map
  subscribeToYardModules(yardMapId, callback) {
    const channelName = `yard_modules_${yardMapId}`;
    
    if (window.supabase?.channel) {
      const channel = window.supabase.channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'yard_modules',
          filter: `yard_map_id=eq.${yardMapId}`
        }, (payload) => {
          callback(payload);
        })
        .subscribe();
      
      this.subscriptions.set(channelName, channel);
      return () => {
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      };
    }
    
    // Fallback: polling
    let lastCheck = new Date().toISOString();
    const interval = setInterval(async () => {
      try {
        const updates = await supabaseFetch(`yard_modules?yard_map_id=eq.${yardMapId}&updated_at=gt.${lastCheck}&select=*`);
        if (updates?.length > 0) {
          updates.forEach(u => callback({ eventType: 'UPDATE', new: u }));
          lastCheck = new Date().toISOString();
        }
      } catch (e) {
        console.error('[YardMapRealtime] Polling error:', e);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  },
  
  // Unsubscribe all
  unsubscribeAll() {
    this.subscriptions.forEach((channel, name) => {
      if (channel.unsubscribe) {
        channel.unsubscribe();
      }
    });
    this.subscriptions.clear();
  }
};

// ============================================================================
// EXPORT
// ============================================================================

window.MODA_YARD_MAP_DATA = {
  YardMapData,
  YardModuleData,
  TransportStatusData,
  YardHistoryData,
  YardSettingsData,
  YardMapRealtime,
  
  // Convenience method to check if available
  isAvailable: () => true
};

if (window.MODA_DEBUG) console.log('[YardMapData] MODA Yard Map v2.0 data layer loaded');
