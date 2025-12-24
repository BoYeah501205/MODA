/**
 * PhotoCapture Component for MODA On-Site Reports
 * 
 * Mobile-optimized photo capture with:
 * - Camera capture (rear camera by default)
 * - Gallery selection
 * - Automatic compression (<1MB per photo)
 * - Preview modal
 * - Delete functionality
 * - Touch-friendly 44px minimum targets
 */

const { useState, useRef } = React;

function PhotoCapture({ 
    photos = [], 
    onPhotosChange, 
    maxPhotos = 5,
    maxSizeKB = 1024,
    disabled = false,
    showSizeInfo = true
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [previewIndex, setPreviewIndex] = useState(null);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handlePhotoUpload = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        const newPhotos = [...photos];

        try {
            for (const file of files) {
                if (newPhotos.length >= maxPhotos) {
                    alert(`Maximum ${maxPhotos} photos allowed`);
                    break;
                }

                // Use MODA_PHOTO compression utility
                const compressed = await window.MODA_PHOTO.compressImage(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.7
                });

                const sizeKB = window.MODA_PHOTO.getBase64Size(compressed);
                if (sizeKB > maxSizeKB) {
                    // Try harder compression
                    const recompressed = await window.MODA_PHOTO.compressToTargetSize(file, maxSizeKB);
                    newPhotos.push(recompressed);
                } else {
                    newPhotos.push(compressed);
                }
            }

            onPhotosChange(newPhotos);
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Error processing photos. Please try again.');
        } finally {
            setIsUploading(false);
            // Reset input to allow selecting same file again
            if (event.target) event.target.value = '';
        }
    };

    const deletePhoto = (index) => {
        if (disabled) return;
        if (confirm('Delete this photo?')) {
            const updated = photos.filter((_, i) => i !== index);
            onPhotosChange(updated);
            // Close preview if deleting the previewed photo
            if (previewIndex === index) {
                setPreviewPhoto(null);
                setPreviewIndex(null);
            }
        }
    };

    const openPreview = (photo, index) => {
        setPreviewPhoto(photo);
        setPreviewIndex(index);
    };

    const closePreview = () => {
        setPreviewPhoto(null);
        setPreviewIndex(null);
    };

    const formatSize = (base64) => {
        if (!window.MODA_PHOTO) return '';
        const sizeKB = window.MODA_PHOTO.getBase64Size(base64);
        return window.MODA_PHOTO.formatFileSize(sizeKB);
    };

    return (
        <div className="photo-capture-container">
            {/* Photo Grid */}
            {photos.length > 0 && (
                <div className="photo-grid">
                    {photos.map((photo, idx) => (
                        <div 
                            key={idx} 
                            className="photo-item"
                            onClick={() => openPreview(photo, idx)}
                        >
                            <img
                                src={photo}
                                alt={`Photo ${idx + 1}`}
                                className="photo-thumbnail"
                            />
                            
                            {/* Photo number badge */}
                            <div className="photo-number">{idx + 1}</div>
                            
                            {/* Delete button */}
                            {!disabled && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deletePhoto(idx);
                                    }}
                                    className="photo-delete-btn"
                                    type="button"
                                    aria-label="Delete photo"
                                >
                                    <span className="icon-close" style={{ width: '16px', height: '16px', display: 'block', filter: 'brightness(0) invert(1)' }}></span>
                                </button>
                            )}
                            
                            {/* Size indicator */}
                            {showSizeInfo && (
                                <div className="photo-size">{formatSize(photo)}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Capture Buttons */}
            {!disabled && photos.length < maxPhotos && (
                <div className="photo-capture-buttons">
                    <button
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isUploading}
                        className="photo-btn photo-btn-camera"
                        type="button"
                    >
                        <span className="icon-camera" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></span>
                        {isUploading ? 'Processing...' : 'Take Photo'}
                    </button>
                    
                    <button
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={isUploading}
                        className="photo-btn photo-btn-gallery"
                        type="button"
                    >
                        <span className="icon-image" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></span>
                        {isUploading ? 'Processing...' : 'Add Photo'}
                    </button>
                </div>
            )}

            {/* Photo count */}
            <p className="photo-count">
                {photos.length} of {maxPhotos} photos
            </p>

            {/* Hidden file inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden-input"
                onChange={handlePhotoUpload}
                disabled={disabled || isUploading}
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden-input"
                onChange={handlePhotoUpload}
                disabled={disabled || isUploading}
            />

            {/* Preview Modal */}
            {previewPhoto && (
                <div 
                    className="photo-preview-overlay"
                    onClick={closePreview}
                >
                    <button
                        onClick={closePreview}
                        className="preview-close-btn"
                        type="button"
                        aria-label="Close preview"
                    >
                        <span className="icon-close" style={{ width: '24px', height: '24px', display: 'block', filter: 'brightness(0) invert(1)' }}></span>
                    </button>
                    
                    <img
                        src={previewPhoto}
                        alt="Preview"
                        className="preview-image"
                        onClick={(e) => e.stopPropagation()}
                    />
                    
                    {/* Preview actions */}
                    {!disabled && (
                        <div className="preview-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => {
                                    deletePhoto(previewIndex);
                                }}
                                className="preview-delete-btn"
                                type="button"
                            >
                                <span className="icon-delete" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></span>
                                Delete Photo
                            </button>
                        </div>
                    )}
                    
                    {/* Photo info */}
                    <div className="preview-info">
                        Photo {previewIndex + 1} of {photos.length}
                        {showSizeInfo && ` • ${formatSize(previewPhoto)}`}
                    </div>
                </div>
            )}

            <style>{`
                .photo-capture-container {
                    width: 100%;
                }

                .photo-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .photo-item {
                    position: relative;
                    aspect-ratio: 1;
                    cursor: pointer;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 2px solid #e5e7eb;
                    transition: border-color 0.2s, transform 0.2s;
                }

                .photo-item:hover {
                    border-color: #0057B8;
                    transform: scale(1.02);
                }

                .photo-thumbnail {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .photo-number {
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    background: #0057B8;
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .photo-delete-btn {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: #DC2626;
                    border: none;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.2s;
                    padding: 0;
                }

                .photo-delete-btn:hover {
                    background: #B91C1C;
                    transform: scale(1.1);
                }

                .photo-size {
                    position: absolute;
                    bottom: 4px;
                    right: 4px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .photo-capture-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .photo-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 14px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: 48px;
                    border: 2px solid;
                }

                .photo-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .photo-btn-camera {
                    background: #0057B8;
                    color: white;
                    border-color: #0057B8;
                }

                .photo-btn-camera:hover:not(:disabled) {
                    background: #004494;
                    border-color: #004494;
                }

                .photo-btn-camera .icon-camera {
                    filter: brightness(0) invert(1);
                }

                .photo-btn-gallery {
                    background: white;
                    color: #374151;
                    border-color: #d1d5db;
                }

                .photo-btn-gallery:hover:not(:disabled) {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }

                .photo-count {
                    text-align: center;
                    font-size: 13px;
                    color: #6b7280;
                    margin: 0;
                }

                .hidden-input {
                    display: none;
                }

                /* Preview Modal */
                .photo-preview-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }

                .preview-close-btn {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 50%;
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.2s;
                    padding: 0;
                }

                .preview-close-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .preview-image {
                    max-width: 100%;
                    max-height: calc(100vh - 160px);
                    object-fit: contain;
                    border-radius: 8px;
                }

                .preview-actions {
                    margin-top: 16px;
                }

                .preview-delete-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px 24px;
                    background: #DC2626;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                    min-height: 44px;
                }

                .preview-delete-btn:hover {
                    background: #B91C1C;
                }

                .preview-delete-btn .icon-delete {
                    filter: brightness(0) invert(1);
                }

                .preview-info {
                    position: absolute;
                    bottom: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    font-size: 13px;
                    padding: 8px 16px;
                    border-radius: 20px;
                }

                /* Mobile optimizations */
                @media (max-width: 640px) {
                    .photo-grid {
                        gap: 8px;
                    }

                    .photo-btn {
                        padding: 12px;
                        font-size: 13px;
                    }

                    .photo-delete-btn {
                        width: 32px;
                        height: 32px;
                    }
                }
            `}</style>
        </div>
    );
}

// Make component available globally
window.PhotoCapture = PhotoCapture;
