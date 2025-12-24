/**
 * Photo Compression Utility for MODA On-Site Reports
 * 
 * Compresses images for optimal mobile performance
 * Max size: 1200px, Quality: 70%, Format: JPEG
 * Target: <1MB per photo for efficient storage and transfer
 */

(function() {
    'use strict';

    const DEFAULT_OPTIONS = {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7,
        outputFormat: 'jpeg'
    };

    /**
     * Compress a single image file
     * @param {File} file - Image file to compress
     * @param {Object} options - Compression options
     * @returns {Promise<string>} - Base64 encoded compressed image
     */
    async function compressImage(file, options = {}) {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('File must be an image'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const compressed = compressImageElement(img, opts);
                        resolve(compressed);
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress multiple image files
     * @param {File[]} files - Array of image files
     * @param {Object} options - Compression options
     * @returns {Promise<string[]>} - Array of base64 encoded compressed images
     */
    async function compressImages(files, options = {}) {
        return Promise.all(files.map(file => compressImage(file, options)));
    }

    /**
     * Internal function to compress an HTMLImageElement
     * @param {HTMLImageElement} img - Image element to compress
     * @param {Object} options - Compression options
     * @returns {string} - Base64 encoded compressed image
     */
    function compressImageElement(img, options) {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > options.maxWidth || height > options.maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
                width = Math.min(width, options.maxWidth);
                height = width / aspectRatio;
            } else {
                height = Math.min(height, options.maxHeight);
                width = height * aspectRatio;
            }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        // Use better image smoothing for quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const mimeType = `image/${options.outputFormat}`;
        return canvas.toDataURL(mimeType, options.quality);
    }

    /**
     * Get the size of a base64 encoded string in KB
     * @param {string} base64 - Base64 encoded string
     * @returns {number} - Size in KB
     */
    function getBase64Size(base64) {
        if (!base64) return 0;
        const base64Length = base64.length - (base64.indexOf(',') + 1);
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        const sizeInBytes = (base64Length * 3) / 4 - padding;
        return sizeInBytes / 1024; // Convert to KB
    }

    /**
     * Validate that a photo is within size limits
     * @param {string} base64 - Base64 encoded image
     * @param {number} maxSizeMB - Maximum size in MB (default 5)
     * @returns {boolean} - True if valid
     */
    function validatePhotoSize(base64, maxSizeMB = 5) {
        const sizeKB = getBase64Size(base64);
        return sizeKB < maxSizeMB * 1024;
    }

    /**
     * Compress image to target size by iteratively reducing quality
     * @param {File} file - Image file to compress
     * @param {number} targetSizeKB - Target size in KB (default 500)
     * @returns {Promise<string>} - Base64 encoded compressed image
     */
    async function compressToTargetSize(file, targetSizeKB = 500) {
        let quality = 0.9;
        let compressed = await compressImage(file, { quality });

        // Iteratively reduce quality until target size is reached
        while (getBase64Size(compressed) > targetSizeKB && quality > 0.1) {
            quality -= 0.1;
            compressed = await compressImage(file, { quality });
        }

        // If still too large, reduce dimensions
        if (getBase64Size(compressed) > targetSizeKB) {
            let maxDimension = 1000;
            while (getBase64Size(compressed) > targetSizeKB && maxDimension > 400) {
                maxDimension -= 200;
                compressed = await compressImage(file, { 
                    quality: 0.7, 
                    maxWidth: maxDimension, 
                    maxHeight: maxDimension 
                });
            }
        }

        return compressed;
    }

    /**
     * Create a thumbnail from an image file
     * @param {File} file - Image file
     * @param {number} size - Thumbnail size (default 200)
     * @returns {Promise<string>} - Base64 encoded thumbnail
     */
    async function createThumbnail(file, size = 200) {
        return compressImage(file, {
            maxWidth: size,
            maxHeight: size,
            quality: 0.8
        });
    }

    /**
     * Format file size for display
     * @param {number} sizeKB - Size in KB
     * @returns {string} - Formatted size string
     */
    function formatFileSize(sizeKB) {
        if (sizeKB < 1) {
            return `${Math.round(sizeKB * 1024)} B`;
        } else if (sizeKB < 1024) {
            return `${Math.round(sizeKB)} KB`;
        } else {
            return `${(sizeKB / 1024).toFixed(1)} MB`;
        }
    }

    // Expose global API
    window.MODA_PHOTO = {
        compressImage,
        compressImages,
        getBase64Size,
        validatePhotoSize,
        compressToTargetSize,
        createThumbnail,
        formatFileSize,
        DEFAULT_OPTIONS
    };

    console.log('[MODA Photo] Compression utility loaded');
})();
