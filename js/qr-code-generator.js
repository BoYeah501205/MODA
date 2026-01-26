/**
 * QR Code Generator Utility for MODA
 * 
 * Generates QR codes for module license plates that link to shop drawing packages.
 * Uses qrcode.js library (lightweight, no dependencies).
 */

(function() {
    'use strict';

    // ============================================================================
    // QR CODE GENERATION
    // ============================================================================

    /**
     * Generate QR code as Data URL
     * @param {string} serialNumber - Module serial number (e.g., "25-0962")
     * @param {Object} options - QR code options
     * @param {number} options.size - QR code size in pixels (default: 200)
     * @param {string} options.errorCorrectionLevel - L, M, Q, H (default: M)
     * @returns {Promise<string>} Data URL of QR code image
     */
    async function generateModuleQRCode(serialNumber, options = {}) {
        if (!serialNumber) {
            throw new Error('Serial number is required');
        }

        // Check if QRCode library is loaded
        if (typeof QRCode === 'undefined') {
            throw new Error('QRCode library not loaded. Include qrcode.min.js in your HTML.');
        }

        const size = options.size || 200;
        const errorCorrectionLevel = options.errorCorrectionLevel || 'M';
        
        // Generate URL for module drawings viewer
        const baseUrl = window.location.origin;
        const qrUrl = `${baseUrl}/drawings/module/${encodeURIComponent(serialNumber)}`;
        
        console.log('[QRCode] Generating QR code for:', qrUrl);

        try {
            // Generate QR code as data URL
            const dataUrl = await QRCode.toDataURL(qrUrl, {
                width: size,
                margin: 1,
                errorCorrectionLevel: errorCorrectionLevel,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return dataUrl;
        } catch (error) {
            console.error('[QRCode] Generation error:', error);
            throw new Error('Failed to generate QR code: ' + error.message);
        }
    }

    /**
     * Generate QR code as Canvas element
     * @param {string} serialNumber - Module serial number
     * @param {HTMLCanvasElement} canvas - Canvas element to render to
     * @param {Object} options - QR code options
     * @returns {Promise<void>}
     */
    async function generateModuleQRCodeToCanvas(serialNumber, canvas, options = {}) {
        if (!serialNumber) {
            throw new Error('Serial number is required');
        }
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Valid canvas element is required');
        }

        if (typeof QRCode === 'undefined') {
            throw new Error('QRCode library not loaded');
        }

        const size = options.size || 200;
        const errorCorrectionLevel = options.errorCorrectionLevel || 'M';
        
        const baseUrl = window.location.origin;
        const qrUrl = `${baseUrl}/drawings/module/${encodeURIComponent(serialNumber)}`;

        try {
            await QRCode.toCanvas(canvas, qrUrl, {
                width: size,
                margin: 1,
                errorCorrectionLevel: errorCorrectionLevel,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } catch (error) {
            console.error('[QRCode] Canvas generation error:', error);
            throw new Error('Failed to generate QR code to canvas: ' + error.message);
        }
    }

    /**
     * Download QR code as PNG image
     * @param {string} serialNumber - Module serial number
     * @param {string} fileName - File name for download (default: "module-{serial}-qr.png")
     * @param {Object} options - QR code options
     */
    async function downloadModuleQRCode(serialNumber, fileName = null, options = {}) {
        const dataUrl = await generateModuleQRCode(serialNumber, options);
        
        const downloadName = fileName || `module-${serialNumber}-qr.png`;
        
        // Create download link
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('[QRCode] Downloaded:', downloadName);
    }

    /**
     * Get QR code URL for a module
     * @param {string} serialNumber - Module serial number
     * @returns {string} Full URL to module drawings viewer
     */
    function getModuleDrawingsUrl(serialNumber) {
        if (!serialNumber) return null;
        const baseUrl = window.location.origin;
        return `${baseUrl}/drawings/module/${encodeURIComponent(serialNumber)}`;
    }

    /**
     * Check if QRCode library is available
     * @returns {boolean}
     */
    function isQRCodeLibraryAvailable() {
        return typeof QRCode !== 'undefined';
    }

    // ============================================================================
    // PDF INTEGRATION
    // ============================================================================

    /**
     * Add QR code to PDF document (for license plate generation)
     * Requires pdf-lib to be loaded
     * @param {PDFDocument} pdfDoc - pdf-lib PDFDocument instance
     * @param {PDFPage} page - pdf-lib PDFPage instance
     * @param {string} serialNumber - Module serial number
     * @param {Object} position - QR code position {x, y, size}
     * @returns {Promise<void>}
     */
    async function addQRCodeToPDF(pdfDoc, page, serialNumber, position = {}) {
        if (!pdfDoc || !page) {
            throw new Error('PDF document and page are required');
        }

        // Default position: bottom-right corner
        const x = position.x !== undefined ? position.x : page.getWidth() - 85;
        const y = position.y !== undefined ? position.y : 15;
        const size = position.size || 70; // 70 points ≈ 1 inch at 72 DPI

        // Generate QR code as data URL
        const qrDataUrl = await generateModuleQRCode(serialNumber, { 
            size: size * 2, // Higher resolution for PDF
            errorCorrectionLevel: 'M'
        });

        // Convert data URL to bytes
        const qrImageBytes = await fetch(qrDataUrl).then(res => res.arrayBuffer());

        // Embed image in PDF
        const qrImage = await pdfDoc.embedPng(qrImageBytes);

        // Draw QR code on page
        page.drawImage(qrImage, {
            x: x,
            y: y,
            width: size,
            height: size
        });

        console.log('[QRCode] Added to PDF at position:', { x, y, size });
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_QR_CODE = {
        // Generation
        generateModuleQRCode,
        generateModuleQRCodeToCanvas,
        downloadModuleQRCode,
        
        // URL utilities
        getModuleDrawingsUrl,
        
        // PDF integration
        addQRCodeToPDF,
        
        // Utilities
        isQRCodeLibraryAvailable
    };

    if (window.MODA_DEBUG) console.log('[QRCode] Module loaded');

})();
