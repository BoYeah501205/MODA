/**
 * MODA - Tesseract.js OCR Module
 * 
 * Client-side OCR processing for drawing title blocks using Tesseract.js
 * Replaces Claude Vision API to eliminate per-page costs
 * 
 * Features:
 * - PDF to image conversion (pdf-lib)
 * - OCR text extraction (Tesseract.js)
 * - Title block field parsing (regex patterns)
 * - Progress tracking
 * - Zero cost, runs entirely in browser
 */

(function() {
    'use strict';

    // ============================================================================
    // TITLE BLOCK PARSING PATTERNS
    // ============================================================================
    
    // Common sheet number patterns:
    // XS-B1L2M01-01, XE-B1L2M15-02, XM-B2L1M03-01
    const SHEET_NUMBER_PATTERN = /(?:X[AESMFP]?-)?([BT]\d+L\d+M\d+)-?(\d+)?/i;
    
    // BLM ID extraction: B1L2M01, B2L3M15
    const BLM_PATTERN = /\b([BT]\d+L\d+M\d+)\b/i;
    
    // Date patterns: 01/15/2024, 2024-01-15, Jan 15 2024
    const DATE_PATTERNS = [
        /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
        /\b(\d{4}-\d{2}-\d{2})\b/,
        /\b([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})\b/i
    ];

    // ============================================================================
    // PDF TO IMAGE CONVERSION
    // ============================================================================

    /**
     * Convert a PDF page to an image data URL
     * @param {Uint8Array} pdfBytes - PDF file bytes
     * @param {number} pageIndex - Page number (0-indexed)
     * @returns {Promise<string>} Image data URL
     */
    async function pdfPageToImage(pdfBytes, pageIndex) {
        // Load pdf-lib from CDN (already in package.json but using CDN for browser)
        const { PDFDocument } = window.pdfjsLib || await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
        
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const page = pdfDoc.getPage(pageIndex);
        
        // Create a new PDF with just this page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
        singlePagePdf.addPage(copiedPage);
        
        const singlePageBytes = await singlePagePdf.save();
        
        // Convert to blob and then to image using canvas
        const blob = new Blob([singlePageBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Use PDF.js to render to canvas
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const pdfPage = await pdf.getPage(1);
        
        const scale = 2.0; // Higher scale = better OCR accuracy
        const viewport = pdfPage.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const context = canvas.getContext('2d');
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        
        URL.revokeObjectURL(url);
        
        return canvas.toDataURL('image/png');
    }

    /**
     * Convert PDF file to array of image data URLs
     * @param {File} file - PDF file
     * @param {Function} onProgress - Progress callback (current, total)
     * @returns {Promise<string[]>} Array of image data URLs
     */
    async function pdfToImages(file, onProgress) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        
        // Load PDF to get page count
        const { PDFDocument } = window.pdfjsLib || await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        const images = [];
        for (let i = 0; i < pageCount; i++) {
            if (onProgress) onProgress(i + 1, pageCount);
            const imageUrl = await pdfPageToImage(pdfBytes, i);
            images.push(imageUrl);
        }
        
        return images;
    }

    // ============================================================================
    // TESSERACT OCR
    // ============================================================================

    /**
     * Extract text from image using Tesseract.js
     * @param {string} imageUrl - Image data URL
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<Object>} { text, confidence }
     */
    async function extractTextFromImage(imageUrl, onProgress) {
        const { createWorker } = window.Tesseract || Tesseract;
        
        const worker = await createWorker('eng', 1, {
            logger: (m) => {
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        });
        
        const { data } = await worker.recognize(imageUrl);
        await worker.terminate();
        
        return {
            text: data.text,
            confidence: data.confidence
        };
    }

    // ============================================================================
    // TITLE BLOCK PARSING
    // ============================================================================

    /**
     * Parse title block fields from OCR text
     * @param {string} text - Raw OCR text
     * @returns {Object} Parsed fields
     */
    function parseTitleBlock(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        // Extract sheet number
        let sheetNumber = null;
        let blmId = null;
        for (const line of lines) {
            const match = line.match(SHEET_NUMBER_PATTERN);
            if (match) {
                sheetNumber = match[0];
                blmId = match[1]; // Extract BLM ID from sheet number
                break;
            }
        }
        
        // If no sheet number found, try to find BLM ID directly
        if (!blmId) {
            for (const line of lines) {
                const match = line.match(BLM_PATTERN);
                if (match) {
                    blmId = match[1];
                    break;
                }
            }
        }
        
        // Extract date
        let date = null;
        for (const line of lines) {
            for (const pattern of DATE_PATTERNS) {
                const match = line.match(pattern);
                if (match) {
                    date = match[1];
                    break;
                }
            }
            if (date) break;
        }
        
        // Extract sheet title (heuristic: longest line that's not a sheet number or date)
        let sheetTitle = null;
        let maxLength = 0;
        for (const line of lines) {
            // Skip lines that look like sheet numbers or dates
            if (SHEET_NUMBER_PATTERN.test(line)) continue;
            if (DATE_PATTERNS.some(p => p.test(line))) continue;
            
            // Skip very short lines (likely labels)
            if (line.length < 10) continue;
            
            // Take the longest remaining line as the title
            if (line.length > maxLength) {
                maxLength = line.length;
                sheetTitle = line;
            }
        }
        
        return {
            sheet_number: sheetNumber,
            sheet_title: sheetTitle,
            date: date,
            blm_id: blmId,
            raw_text: text
        };
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    /**
     * Process a PDF file and extract title block data from each page
     * @param {File} file - PDF file
     * @param {Object} options - Processing options
     * @param {Function} options.onProgress - Progress callback ({ stage, current, total, percent })
     * @returns {Promise<Array>} Array of extracted sheet data
     */
    async function processPDF(file, options = {}) {
        const { onProgress } = options;
        const results = [];
        
        try {
            // Stage 1: Convert PDF to images
            if (onProgress) onProgress({ stage: 'converting', current: 0, total: 0, percent: 0 });
            
            const images = await pdfToImages(file, (current, total) => {
                if (onProgress) {
                    onProgress({
                        stage: 'converting',
                        current,
                        total,
                        percent: Math.round((current / total) * 30) // 0-30%
                    });
                }
            });
            
            // Stage 2: OCR each image
            for (let i = 0; i < images.length; i++) {
                if (onProgress) {
                    onProgress({
                        stage: 'ocr',
                        current: i + 1,
                        total: images.length,
                        percent: 30 + Math.round(((i + 1) / images.length) * 60) // 30-90%
                    });
                }
                
                const { text, confidence } = await extractTextFromImage(images[i], (ocrProgress) => {
                    if (onProgress) {
                        const basePercent = 30 + Math.round((i / images.length) * 60);
                        const ocrPercent = Math.round((ocrProgress / 100) * (60 / images.length));
                        onProgress({
                            stage: 'ocr',
                            current: i + 1,
                            total: images.length,
                            percent: basePercent + ocrPercent
                        });
                    }
                });
                
                // Stage 3: Parse title block
                const parsed = parseTitleBlock(text);
                
                results.push({
                    page_number: i + 1,
                    ...parsed,
                    ocr_confidence: confidence,
                    image_url: images[i] // Keep for debugging
                });
            }
            
            if (onProgress) onProgress({ stage: 'complete', current: images.length, total: images.length, percent: 100 });
            
            return results;
            
        } catch (error) {
            console.error('[TesseractOCR] Error processing PDF:', error);
            throw error;
        }
    }

    /**
     * Process a single image and extract title block data
     * @param {string} imageUrl - Image data URL
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<Object>} Extracted sheet data
     */
    async function processImage(imageUrl, onProgress) {
        const { text, confidence } = await extractTextFromImage(imageUrl, onProgress);
        const parsed = parseTitleBlock(text);
        
        return {
            ...parsed,
            ocr_confidence: confidence
        };
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_TESSERACT_OCR = {
        processPDF,
        processImage,
        pdfToImages,
        extractTextFromImage,
        parseTitleBlock,
        isAvailable: () => typeof Tesseract !== 'undefined'
    };

    console.log('[TesseractOCR] Module loaded');

})();
