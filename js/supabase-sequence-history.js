/**
 * Build Sequence History - Data Layer
 * Handles saving and retrieving build sequence snapshots for audit/restore
 */
(function() {
    'use strict';

    const getClient = () => window.MODA_SUPABASE?.client;

    /**
     * Save a snapshot of the current build sequence for a project
     * @param {string} projectId - Project UUID
     * @param {Array} modules - Array of module objects with id, serialNumber, buildSequence, hitchBLM
     * @param {string} changeType - Type of change: 'manual_edit', 'import', 'reorder', 'prototype_insert', 'restore'
     * @param {string} description - Human-readable description of the change
     * @param {object} user - Current user object with id and name
     */
    async function saveSequenceSnapshot(projectId, modules, changeType, description, user) {
        const client = getClient();
        if (!client) {
            console.warn('[SequenceHistory] Supabase not available, skipping snapshot');
            return null;
        }

        // Create minimal snapshot with only sequence-relevant fields
        const snapshot = modules.map(m => ({
            moduleId: m.id,
            serialNumber: m.serialNumber,
            buildSequence: m.buildSequence,
            hitchBLM: m.hitchBLM || m.blmId,
            isPrototype: m.isPrototype || false
        }));

        try {
            const { data, error } = await client.rpc('save_sequence_snapshot', {
                p_project_id: projectId,
                p_modules: snapshot,
                p_change_type: changeType,
                p_description: description,
                p_user_id: user?.id || null,
                p_user_name: user?.name || user?.email || 'Unknown'
            });

            if (error) {
                console.error('[SequenceHistory] Error saving snapshot:', error);
                return null;
            }

            console.log('[SequenceHistory] Saved snapshot:', data);
            return data;
        } catch (err) {
            console.error('[SequenceHistory] Exception saving snapshot:', err);
            return null;
        }
    }

    /**
     * Get sequence history for a project
     * @param {string} projectId - Project UUID
     * @param {number} limit - Max number of entries to return (default 20)
     */
    async function getSequenceHistory(projectId, limit = 20) {
        const client = getClient();
        if (!client) {
            console.warn('[SequenceHistory] Supabase not available');
            return [];
        }

        try {
            const { data, error } = await client.rpc('get_sequence_history', {
                p_project_id: projectId,
                p_limit: limit
            });

            if (error) {
                console.error('[SequenceHistory] Error fetching history:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[SequenceHistory] Exception fetching history:', err);
            return [];
        }
    }

    /**
     * Restore modules to a previous sequence snapshot
     * @param {string} projectId - Project UUID
     * @param {string} historyId - History entry UUID to restore from
     * @param {Function} setProjects - State setter for projects
     * @param {object} user - Current user for logging
     */
    async function restoreSequenceSnapshot(projectId, historyId, setProjects, user) {
        const client = getClient();
        if (!client) {
            console.warn('[SequenceHistory] Supabase not available');
            return false;
        }

        try {
            // Fetch the snapshot to restore
            const { data: historyEntry, error: fetchError } = await client
                .from('build_sequence_history')
                .select('sequence_snapshot, change_description, created_at')
                .eq('id', historyId)
                .single();

            if (fetchError || !historyEntry) {
                console.error('[SequenceHistory] Error fetching snapshot to restore:', fetchError);
                return false;
            }

            const snapshot = historyEntry.sequence_snapshot;
            const snapshotDate = new Date(historyEntry.created_at).toLocaleString();

            // Update project modules with restored sequences
            setProjects(prevProjects => prevProjects.map(project => {
                if (project.id !== projectId) return project;

                const updatedModules = (project.modules || []).map(mod => {
                    const snapshotMod = snapshot.find(s => s.moduleId === mod.id);
                    if (snapshotMod) {
                        return { ...mod, buildSequence: snapshotMod.buildSequence };
                    }
                    return mod;
                });

                return { ...project, modules: updatedModules };
            }));

            // Save a new snapshot marking this as a restore
            await saveSequenceSnapshot(
                projectId,
                snapshot,
                'restore',
                `Restored from snapshot dated ${snapshotDate}`,
                user
            );

            return true;
        } catch (err) {
            console.error('[SequenceHistory] Exception restoring snapshot:', err);
            return false;
        }
    }

    /**
     * Compare two snapshots and return differences
     * @param {Array} oldSnapshot - Previous sequence snapshot
     * @param {Array} newSnapshot - New sequence snapshot
     */
    function compareSnapshots(oldSnapshot, newSnapshot) {
        const changes = [];
        const oldMap = new Map(oldSnapshot.map(m => [m.moduleId, m]));
        const newMap = new Map(newSnapshot.map(m => [m.moduleId, m]));

        // Find changed sequences
        for (const [moduleId, newMod] of newMap) {
            const oldMod = oldMap.get(moduleId);
            if (oldMod && oldMod.buildSequence !== newMod.buildSequence) {
                changes.push({
                    moduleId,
                    serialNumber: newMod.serialNumber,
                    oldSequence: oldMod.buildSequence,
                    newSequence: newMod.buildSequence
                });
            }
        }

        // Find added modules
        for (const [moduleId, newMod] of newMap) {
            if (!oldMap.has(moduleId)) {
                changes.push({
                    moduleId,
                    serialNumber: newMod.serialNumber,
                    oldSequence: null,
                    newSequence: newMod.buildSequence,
                    isNew: true
                });
            }
        }

        // Find removed modules
        for (const [moduleId, oldMod] of oldMap) {
            if (!newMap.has(moduleId)) {
                changes.push({
                    moduleId,
                    serialNumber: oldMod.serialNumber,
                    oldSequence: oldMod.buildSequence,
                    newSequence: null,
                    isRemoved: true
                });
            }
        }

        return changes.sort((a, b) => (a.newSequence || 999) - (b.newSequence || 999));
    }

    // Export to window
    window.MODA_SEQUENCE_HISTORY = {
        saveSnapshot: saveSequenceSnapshot,
        getHistory: getSequenceHistory,
        restoreSnapshot: restoreSequenceSnapshot,
        compareSnapshots
    };

    console.log('[SequenceHistory] Build sequence history utilities initialized');
})();
