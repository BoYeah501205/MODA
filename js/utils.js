// ============================================================================
// MODA UTILITIES - Reusable Helper Functions
// Centralized to eliminate duplication and improve maintainability
// ============================================================================

const MODA_UTILS = {
    
    // ===== DEBOUNCE UTILITY =====
    debounce: function(func, delay = MODA_CONSTANTS.DEBOUNCE_DELAY) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    // ===== THROTTLE UTILITY =====
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // ===== QR CODE GENERATION =====
    generateQRCode: function(text) {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createDataURL(4, 0);
    },
    
    // ===== URL BUILDER =====
    buildModuleUrl: function(baseUrl, projectId, serialNumber) {
        const scannerUrl = baseUrl.replace(/[^/]*$/, 'Module_Scanner.html');
        return `${scannerUrl}?project=${encodeURIComponent(projectId)}&module=${encodeURIComponent(serialNumber)}`;
    },
    
    // ===== BLM EXTRACTION =====
    // Extract Building, Level, Module from BLM ID (e.g., B1L2M52 → Building 1, Level 2, Module 52)
    extractFromBLM: function(blmId) {
        const blm = String(blmId || '').toUpperCase();
        // Pattern: B{building}L{level}M{module} e.g., B1L2M52
        const match = blm.match(/B(\d+)L(\d+)M(\d+)/);
        if (match) {
            return {
                building: `B${match[1]}`,
                level: `L${match[2]}`,
                module: `M${match[3].padStart(2, '0')}`
            };
        }
        // Fallback: Try 3-digit serial format (e.g., 313 = Building 3, Level 1, Module 3)
        const serialMatch = String(blmId).match(/^(\d)(\d)(\d+)$/);
        if (serialMatch) {
            return {
                building: `B${serialMatch[1]}`,
                level: `L${serialMatch[2]}`,
                module: `M${serialMatch[3].padStart(2, '0')}`
            };
        }
        return { building: 'OTHER', level: 'OTHER', module: 'OTHER' };
    },
    
    // ===== STACK EXTRACTION =====
    extractStack: function(serialNumber) {
        const result = this.extractFromBLM(serialNumber);
        return result.building !== 'OTHER' ? result.building : 'OTHER';
    },
    
    // ===== UNIT TYPE EXTRACTION =====
    extractUnitType: function(unitType) {
        const type = String(unitType).toUpperCase().replace(/[.\-_]/g, ' ').trim();
        const match = type.match(/^(\d*\s*B|STUDIO|STU)/i);
        return match ? match[0].replace(/\s+/g, '') : type.split(' ')[0] || 'OTHER';
    },
    
    // ===== LICENSE PLATE INDICATORS =====
    getLicensePlateIndicators: function(module) {
        const indicators = [];
        const difficulties = module.difficulties || {};
        
        if (difficulties.proto) indicators.push({ key: 'PROTO', label: 'PROTO' });
        if (difficulties.sidewall) indicators.push({ key: 'SW', label: 'SW' });
        if (difficulties.short) indicators.push({ key: 'SHORT', label: 'SHORT' });
        if (difficulties.stair) indicators.push({ key: 'STAIR', label: 'STAIR' });
        if (difficulties.hr3Wall) indicators.push({ key: '3HR', label: '3HR' });
        if (difficulties.doubleStudio) indicators.push({ key: 'DBL', label: 'DBL STUDIO' });
        if (difficulties.sawbox) indicators.push({ key: 'SAWBOX', label: 'SAWBOX' });
        
        return indicators;
    },
    
    // ===== DATE FORMATTING =====
    formatDate: function(date, format = 'short') {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        switch(format) {
            case 'short':
                return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
            case 'long':
                return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            case 'iso':
                return d.toISOString();
            default:
                return d.toLocaleDateString();
        }
    },
    
    // ===== VALIDATION =====
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validateSerialNumber: function(serial) {
        return serial && serial.trim().length > 0;
    },
    
    // ===== DATA SANITIZATION =====
    sanitizeString: function(str) {
        if (!str) return '';
        return String(str)
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    },
    
    // ===== DEEP CLONE (Optimized) =====
    deepClone: function(obj) {
        // Use native structuredClone if available (faster)
        if (typeof structuredClone !== 'undefined') {
            return structuredClone(obj);
        }
        // Fallback to JSON method
        return JSON.parse(JSON.stringify(obj));
    },
    
    // ===== ARRAY UTILITIES =====
    groupBy: function(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },
    
    sortBy: function(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    },
    
    // ===== UNIQUE ID GENERATOR =====
    generateId: function(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // ===== PROGRESS CALCULATION =====
    calculateOverallProgress: function(stageProgress) {
        if (!stageProgress) return 0;
        const values = Object.values(stageProgress);
        if (values.length === 0) return 0;
        const sum = values.reduce((acc, val) => acc + (val || 0), 0);
        return Math.round(sum / values.length);
    },
    
    // ===== FILE EXPORT UTILITIES =====
    downloadJSON: function(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    // ===== EXCEL EXPORT =====
    exportToExcel: function(data, filename, sheetName = 'Sheet1') {
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not loaded');
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filename);
    },
    
    // ===== ERROR HANDLING =====
    handleError: function(error, context = '') {
        console.error(`[MODA Error${context ? ' - ' + context : ''}]:`, error);
        
        // In production, you might want to send to error tracking service
        // e.g., Sentry.captureException(error);
        
        return {
            success: false,
            error: error.message || 'An unknown error occurred',
            context
        };
    },
    
    // ===== PERFORMANCE MONITORING =====
    measurePerformance: function(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    },
    
    // ===== MEMOIZATION HELPER =====
    memoize: function(fn) {
        const cache = new Map();
        return function(...args) {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }
};

// Freeze utilities to prevent modifications
Object.freeze(MODA_UTILS);
