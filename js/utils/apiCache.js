/**
 * MODA API Cache Utility
 * 
 * Simple in-memory cache for API responses to reduce redundant Supabase calls.
 * Caches are invalidated after a configurable TTL (time-to-live).
 */

(function() {
    'use strict';

    // Cache storage
    const cache = new Map();
    
    // Default TTL: 5 minutes
    const DEFAULT_TTL = 5 * 60 * 1000;
    
    /**
     * Get cached data or fetch fresh data
     * @param {string} key - Unique cache key
     * @param {Function} fetchFn - Async function to fetch data if cache miss
     * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
     * @returns {Promise<any>} Cached or fresh data
     */
    async function getOrFetch(key, fetchFn, ttl = DEFAULT_TTL) {
        const cached = cache.get(key);
        const now = Date.now();
        
        // Return cached data if still valid
        if (cached && (now - cached.timestamp) < ttl) {
            if (window.MODA_DEBUG) console.log(`[APICache] Hit: ${key}`);
            return cached.data;
        }
        
        // Fetch fresh data
        if (window.MODA_DEBUG) console.log(`[APICache] Miss: ${key}`);
        const data = await fetchFn();
        
        // Store in cache
        cache.set(key, {
            data,
            timestamp: now
        });
        
        return data;
    }
    
    /**
     * Invalidate a specific cache entry
     * @param {string} key - Cache key to invalidate
     */
    function invalidate(key) {
        cache.delete(key);
        if (window.MODA_DEBUG) console.log(`[APICache] Invalidated: ${key}`);
    }
    
    /**
     * Invalidate all cache entries matching a prefix
     * @param {string} prefix - Key prefix to match
     */
    function invalidatePrefix(prefix) {
        let count = 0;
        for (const key of cache.keys()) {
            if (key.startsWith(prefix)) {
                cache.delete(key);
                count++;
            }
        }
        if (window.MODA_DEBUG) console.log(`[APICache] Invalidated ${count} entries with prefix: ${prefix}`);
    }
    
    /**
     * Clear all cache entries
     */
    function clear() {
        const size = cache.size;
        cache.clear();
        if (window.MODA_DEBUG) console.log(`[APICache] Cleared ${size} entries`);
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    function getStats() {
        return {
            size: cache.size,
            keys: Array.from(cache.keys())
        };
    }
    
    // Export to window
    window.MODA_API_CACHE = {
        getOrFetch,
        invalidate,
        invalidatePrefix,
        clear,
        getStats,
        DEFAULT_TTL
    };
    
    if (window.MODA_DEBUG) console.log('[APICache] Module loaded');
})();
