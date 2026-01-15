/**
 * Supabase Procurement Data Layer for MODA
 * 
 * Handles PostgreSQL operations for material shortages tracking.
 * Provides localStorage fallback for offline functionality.
 * Supports real-time subscriptions via Supabase Realtime.
 */

(function() {
    'use strict';

    // Check if Supabase client is available
    if (!window.MODA_SUPABASE) {
        console.warn('[Supabase Procurement] Supabase client not initialized, using localStorage only');
        window.MODA_SUPABASE_PROCUREMENT = {
            isAvailable: () => false,
            shortages: null
        };
        return;
    }

    const getClient = () => window.MODA_SUPABASE?.client;
    const isAvailable = () => {
        const initialized = window.MODA_SUPABASE?.isInitialized;
        const client = getClient();
        return initialized && client;
    };

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const SHORTAGE_STATUSES = [
        { id: 'open', label: 'Open', color: '#DC2626' },
        { id: 'ordered', label: 'Ordered', color: '#F59E0B' },
        { id: 'partial', label: 'Partial Delivery', color: '#0891B2' },
        { id: 'resolved', label: 'Resolved', color: '#10B981' },
        { id: 'cancelled', label: 'Cancelled', color: '#6B7280' }
    ];

    const PRIORITY_LEVELS = [
        { id: 'low', label: 'Low', color: '#10B981' },
        { id: 'medium', label: 'Medium', color: '#F59E0B' },
        { id: 'high', label: 'High', color: '#EA580C' },
        { id: 'critical', label: 'Critical', color: '#DC2626' }
    ];

    const UNITS_OF_MEASURE = [
        { id: 'ea', label: 'Each (ea)' },
        { id: 'ft', label: 'Feet (ft)' },
        { id: 'lf', label: 'Linear Feet (lf)' },
        { id: 'sqft', label: 'Square Feet (sqft)' },
        { id: 'lbs', label: 'Pounds (lbs)' },
        { id: 'gal', label: 'Gallons (gal)' },
        { id: 'box', label: 'Box' },
        { id: 'roll', label: 'Roll' },
        { id: 'bundle', label: 'Bundle' },
        { id: 'pallet', label: 'Pallet' },
        { id: 'set', label: 'Set' },
        { id: 'kit', label: 'Kit' }
    ];

    // ============================================================================
    // LOCAL STORAGE HELPERS
    // ============================================================================

    const STORAGE_KEY = 'moda_shortages';
    const COUNTER_KEY = 'moda_shortage_counter';

    function loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored !== 'undefined' && stored !== 'null') {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Procurement] Error loading from localStorage:', e);
        }
        return [];
    }

    function saveToLocalStorage(shortages) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shortages));
        } catch (e) {
            console.error('[Procurement] Error saving to localStorage:', e);
        }
    }

    function getNextShortageNumber() {
        const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
        const next = current + 1;
        localStorage.setItem(COUNTER_KEY, next.toString());
        return next;
    }

    function formatShortageNumber(num) {
        return `SHT-${String(num).padStart(4, '0')}`;
    }

    // ============================================================================
    // SHORTAGES API
    // ============================================================================

    const ShortagesAPI = {
        // Get all shortages with optional filters
        async getAll(filters = {}) {
            if (!isAvailable()) {
                console.log('[Procurement] Using localStorage fallback');
                let shortages = loadFromLocalStorage();
                
                // Apply filters
                if (filters.status) {
                    shortages = shortages.filter(s => s.status === filters.status);
                }
                if (filters.priority) {
                    shortages = shortages.filter(s => s.priority === filters.priority);
                }
                if (filters.projectId) {
                    shortages = shortages.filter(s => 
                        (s.projects_impacted || []).includes(filters.projectId)
                    );
                }
                if (filters.stationId) {
                    shortages = shortages.filter(s => 
                        (s.stations_impacted || []).includes(filters.stationId)
                    );
                }
                
                return shortages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            let query = getClient()
                .from('shortages')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.priority) {
                query = query.eq('priority', filters.priority);
            }
            if (filters.projectId) {
                query = query.contains('projects_impacted', [filters.projectId]);
            }
            if (filters.stationId) {
                query = query.contains('stations_impacted', [filters.stationId]);
            }

            const { data, error } = await query;
            
            if (error) {
                console.error('[Procurement] Supabase query error:', error);
                throw error;
            }
            
            // Save to localStorage as backup
            if (data) {
                saveToLocalStorage(data);
            }
            
            return data || [];
        },

        // Get single shortage by ID
        async getById(shortageId) {
            if (!isAvailable()) {
                const shortages = loadFromLocalStorage();
                return shortages.find(s => s.id === shortageId) || null;
            }

            const { data, error } = await getClient()
                .from('shortages')
                .select('*')
                .eq('id', shortageId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        // Create new shortage
        async create(shortageData) {
            const shortageNumber = getNextShortageNumber();
            const now = new Date().toISOString();
            
            const newShortage = {
                id: shortageData.id || `shortage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                shortage_number: shortageNumber,
                shortage_display_id: formatShortageNumber(shortageNumber),
                
                // Item details
                item: shortageData.item || '',
                uom: shortageData.uom || 'ea',
                qty: parseFloat(shortageData.qty) || 0,
                
                // Supplier & delivery
                supplier: shortageData.supplier || '',
                delivery_eta: shortageData.delivery_eta || null,
                
                // Impact tracking
                stations_impacted: shortageData.stations_impacted || [],
                modules_impacted: shortageData.modules_impacted || [],
                projects_impacted: shortageData.projects_impacted || [],
                
                // Status
                status: 'open',
                priority: shortageData.priority || 'medium',
                
                // Notes
                notes: shortageData.notes || '',
                
                // Audit
                reported_by: shortageData.reported_by || '',
                reported_by_id: shortageData.reported_by_id || null,
                
                // Timestamps
                created_at: now,
                updated_at: now
            };

            if (!isAvailable()) {
                const shortages = loadFromLocalStorage();
                shortages.unshift(newShortage);
                saveToLocalStorage(shortages);
                console.log('[Procurement] Created (localStorage):', newShortage.shortage_display_id);
                return newShortage;
            }

            const { data, error } = await getClient()
                .from('shortages')
                .insert(newShortage)
                .select()
                .single();

            if (error) throw error;
            
            console.log('[Procurement] Created:', data.shortage_display_id);
            
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logCreate('procurement', 'shortage', data.id, data.shortage_display_id, {
                    item: data.item,
                    qty: data.qty,
                    priority: data.priority
                });
            }
            
            return data;
        },

        // Update existing shortage
        async update(shortageId, updates) {
            const now = new Date().toISOString();
            updates.updated_at = now;

            if (!isAvailable()) {
                const shortages = loadFromLocalStorage();
                const index = shortages.findIndex(s => s.id === shortageId);
                if (index === -1) throw new Error('Shortage not found');
                
                shortages[index] = { ...shortages[index], ...updates };
                saveToLocalStorage(shortages);
                console.log('[Procurement] Updated (localStorage):', shortageId);
                return shortages[index];
            }

            const { data, error } = await getClient()
                .from('shortages')
                .update(updates)
                .eq('id', shortageId)
                .select()
                .single();

            if (error) throw error;
            
            console.log('[Procurement] Updated:', shortageId);
            
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logUpdate('procurement', 'shortage', shortageId, data.shortage_display_id, null, updates);
            }
            
            return data;
        },

        // Update shortage status
        async updateStatus(shortageId, newStatus, userId, userName, notes = '') {
            const now = new Date().toISOString();
            
            const updates = {
                status: newStatus,
                updated_at: now
            };

            // If resolving, add resolution info
            if (newStatus === 'resolved') {
                updates.resolved_at = now;
                updates.resolved_by = userName;
                updates.resolved_by_id = userId;
                if (notes) updates.resolution_notes = notes;
            }

            return this.update(shortageId, updates);
        },

        // Delete shortage
        async delete(shortageId) {
            if (!isAvailable()) {
                const shortages = loadFromLocalStorage();
                const filtered = shortages.filter(s => s.id !== shortageId);
                saveToLocalStorage(filtered);
                console.log('[Procurement] Deleted (localStorage):', shortageId);
                return true;
            }

            const { error } = await getClient()
                .from('shortages')
                .delete()
                .eq('id', shortageId);

            if (error) throw error;
            
            console.log('[Procurement] Deleted:', shortageId);
            
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logDelete('procurement', 'shortage', shortageId, `Shortage ${shortageId}`, {});
            }
            
            return true;
        },

        // Subscribe to real-time changes
        onSnapshot(callback, filters = {}) {
            // Initial load
            this.getAll(filters).then(shortages => callback(shortages)).catch(console.error);

            if (!isAvailable()) {
                console.warn('[Procurement] Supabase not available for real-time');
                return () => {};
            }

            // Subscribe to changes
            const subscription = getClient()
                .channel('shortages-changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'shortages' },
                    async (payload) => {
                        console.log('[Procurement] Real-time update:', payload.eventType);
                        const shortages = await this.getAll(filters);
                        callback(shortages);
                    }
                )
                .subscribe();

            // Return unsubscribe function
            return () => {
                subscription.unsubscribe();
            };
        },

        // Get shortage statistics
        async getStats() {
            const shortages = await this.getAll();
            const now = new Date();

            return {
                total: shortages.length,
                open: shortages.filter(s => s.status === 'open').length,
                ordered: shortages.filter(s => s.status === 'ordered').length,
                partial: shortages.filter(s => s.status === 'partial').length,
                resolved: shortages.filter(s => s.status === 'resolved').length,
                cancelled: shortages.filter(s => s.status === 'cancelled').length,
                
                // Priority breakdown (active only)
                critical: shortages.filter(s => s.priority === 'critical' && !['resolved', 'cancelled'].includes(s.status)).length,
                high: shortages.filter(s => s.priority === 'high' && !['resolved', 'cancelled'].includes(s.status)).length,
                medium: shortages.filter(s => s.priority === 'medium' && !['resolved', 'cancelled'].includes(s.status)).length,
                low: shortages.filter(s => s.priority === 'low' && !['resolved', 'cancelled'].includes(s.status)).length,
                
                // Overdue (past delivery ETA and not resolved)
                overdue: shortages.filter(s => {
                    if (!s.delivery_eta || ['resolved', 'cancelled'].includes(s.status)) return false;
                    return new Date(s.delivery_eta) < now;
                }).length
            };
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_SUPABASE_PROCUREMENT = {
        isAvailable,
        shortages: ShortagesAPI,
        SHORTAGE_STATUSES,
        PRIORITY_LEVELS,
        UNITS_OF_MEASURE,
        formatShortageNumber
    };

    console.log('[Supabase Procurement] Module initialized');

})();
