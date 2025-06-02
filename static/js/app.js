// Import the background removal library
import { removeBackground } from 'https://cdn.skypack.dev/@imgly/background-removal';

class TextBehindImageGenerator {
    constructor() {
        this.currentImage = null;
        this.originalImage = null;
        this.backgroundImage = null;
        this.foregroundImage = null;
        this.canvas = document.getElementById('preview-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isProcessing = false;
        
        this.initializeElements();
        this.bindEvents();
        this.updateRangeValues();
    }
    
    initializeElements() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.uploadStatus = document.getElementById('upload-status');
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.previewContainer = document.getElementById('preview-container');
        this.processingOverlay = document.getElementById('processing-overlay');
        this.previewInfo = document.getElementById('preview-info');
        
        // Text controls
        this.textLine1 = document.getElementById('text-line1');
        this.textLine2 = document.getElementById('text-line2');
        this.fontFamily = document.getElementById('font-family');
        this.fontSize = document.getElementById('font-size');
        this.fontSizeValue = document.getElementById('font-size-value');
        this.textX = document.getElementById('text-x');
        this.textXValue = document.getElementById('text-x-value');
        this.textY = document.getElementById('text-y');
        this.textYValue = document.getElementById('text-y-value');
        
        // Buttons
        this.processBtn = document.getElementById('process-btn');
        this.downloadBtn = document.getElementById('download-btn');
    }
    
    bindEvents() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Range input events
        this.fontSize.addEventListener('input', () => this.updateRangeValues());
        this.textX.addEventListener('input', () => this.updateRangeValues());
        this.textY.addEventListener('input', () => this.updateRangeValues());
        
        // Text input events for live preview
        this.textLine1.addEventListener('input', () => this.updatePreview());
        this.textLine2.addEventListener('input', () => this.updatePreview());
        this.fontFamily.addEventListener('change', () => this.updatePreview());
        this.fontSize.addEventListener('input', () => this.updatePreview());
        this.textX.addEventListener('input', () => this.updatePreview());
        this.textY.addEventListener('input', () => this.updatePreview());
        
        // Button events
        this.processBtn.addEventListener('click', () => this.processImage());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
    }
    
    updateRangeValues() {
        this.fontSizeValue.textContent = `${this.fontSize.value}px`;
        this.textXValue.textContent = `${this.textX.value}%`;
        this.textYValue.textContent = `${this.textY.value}%`;
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        this.handleFileSelect(e.dataTransfer.files);
    }
    
    async handleFileSelect(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showUploadStatus('Please select a valid image file.', 'danger');
            return;
        }
        
        // Validate file size (16MB)
        if (file.size > 16 * 1024 * 1024) {
            this.showUploadStatus('File size must be less than 16MB.', 'danger');
            return;
        }
        
        this.showUploadStatus('Loading image...', 'warning');
        
        try {
            // Create image URL from file
            const imageUrl = URL.createObjectURL(file);
            
            // Load the original image
            await this.loadImage(imageUrl);
            
            this.showUploadStatus(`Image loaded successfully! (${this.originalImage.width}x${this.originalImage.height})`, 'success');
            this.processBtn.disabled = false;
            this.updatePreview();
            
            // Clean up the object URL
            URL.revokeObjectURL(imageUrl);
            
        } catch (error) {
            console.error('Image loading error:', error);
            this.showUploadStatus('Failed to load image. Please try again.', 'danger');
        }
    }
    
    async loadImage(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.setupCanvas();
                this.previewPlaceholder.style.display = 'none';
                this.canvas.style.display = 'block';
                resolve();
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }
    
    setupCanvas() {
        if (!this.currentImage) return;
        
        this.canvas.width = this.currentImage.width;
        this.canvas.height = this.currentImage.height;
        
        this.setupCanvasDisplay();
        this.drawCanvas();
    }
    
    setupCanvasDisplay() {
        if (!this.currentImage) return;
        
        const container = this.previewContainer;
        const containerWidth = container.clientWidth - 20; // Account for padding
        const containerHeight = container.clientHeight - 20;
        
        // Calculate display size while maintaining aspect ratio
        const imgAspect = this.currentImage.width / this.currentImage.height;
        const containerAspect = containerWidth / containerHeight;
        
        let displayWidth, displayHeight;
        
        if (imgAspect > containerAspect) {
            displayWidth = containerWidth;
            displayHeight = containerWidth / imgAspect;
        } else {
            displayHeight = containerHeight;
            displayWidth = containerHeight * imgAspect;
        }
        
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
    }
    
    drawCanvas() {
        if (!this.currentImage) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0);
        
        // Draw text overlay for preview
        this.drawTextOverlay();
    }
    
    drawTextOverlay() {
        const text1 = this.textLine1.value;
        const text2 = this.textLine2.value;
        
        if (!text1 && !text2) return;
        
        const fontSize = parseInt(this.fontSize.value);
        const fontFamily = this.fontFamily.value;
        const textXPercent = parseInt(this.textX.value);
        const textYPercent = parseInt(this.textY.value);
        
        // Convert percentage to pixel coordinates
        const textX = (textXPercent / 100) * this.canvas.width;
        const textY = (textYPercent / 100) * this.canvas.height;
        
        // Set font
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw text with outline for visibility (preview mode)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.lineWidth = 3;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        
        if (text1) {
            this.ctx.strokeText(text1, textX, textY);
            this.ctx.fillText(text1, textX, textY);
        }
        
        if (text2) {
            const line2Y = textY + fontSize + 10;
            this.ctx.strokeText(text2, textX, line2Y);
            this.ctx.fillText(text2, textX, line2Y);
        }
    }
    
    updatePreview() {
        if (this.currentImage && !this.isProcessing) {
            // If we have processed foreground, show composed image, otherwise show preview
            if (this.foregroundImage) {
                this.composeImage();
            } else {
                this.drawCanvas();
            }
        }
    }
    
    async processImage() {
        if (!this.originalImage || this.isProcessing) return;
        
        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.processingOverlay.style.display = 'flex';
        
        try {
            // Create a canvas to get image data for background removal
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.originalImage.width;
            tempCanvas.height = this.originalImage.height;
            tempCtx.drawImage(this.originalImage, 0, 0);
            
            // Convert to blob for background removal
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve));
            
            // Remove background using the library
            const foregroundBlob = await removeBackground(blob);
            
            // Create image from the result
            const foregroundUrl = URL.createObjectURL(foregroundBlob);
            await this.loadForegroundImage(foregroundUrl);
            
            // Generate the final composed image
            this.composeImage();
            
            this.downloadBtn.disabled = false;
            this.showPreviewInfo('Background removal complete! Text placed behind person.');
            
            // Clean up
            URL.revokeObjectURL(foregroundUrl);
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showPreviewInfo('Background removal failed. Please try again.', 'danger');
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
            this.processingOverlay.style.display = 'none';
        }
    }
    
    async loadForegroundImage(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.foregroundImage = img;
                resolve();
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }
    
    composeImage() {
        if (!this.originalImage || !this.foregroundImage) return;
        
        // Set canvas size
        this.canvas.width = this.originalImage.width;
        this.canvas.height = this.originalImage.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Draw original image as background
        this.ctx.drawImage(this.originalImage, 0, 0);
        
        // 2. Draw text layer
        this.drawTextLayer();
        
        // 3. Draw foreground (person) on top
        this.ctx.drawImage(this.foregroundImage, 0, 0);
        
        // Update display
        this.setupCanvasDisplay();
    }
    
    drawTextLayer() {
        const text1 = this.textLine1.value;
        const text2 = this.textLine2.value;
        
        if (!text1 && !text2) return;
        
        const fontSize = parseInt(this.fontSize.value);
        const fontFamily = this.fontFamily.value;
        const textXPercent = parseInt(this.textX.value);
        const textYPercent = parseInt(this.textY.value);
        
        // Convert percentage to pixel coordinates
        const textX = (textXPercent / 100) * this.canvas.width;
        const textY = (textYPercent / 100) * this.canvas.height;
        
        // Set font
        this.ctx.font = `bold ${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw text with strong outline and shadow for visibility behind person
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 4;
        this.ctx.shadowOffsetY = 4;
        
        // Draw thick outline
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.lineWidth = 8;
        this.ctx.fillStyle = 'white';
        
        if (text1) {
            this.ctx.strokeText(text1, textX, textY);
            this.ctx.fillText(text1, textX, textY);
        }
        
        if (text2) {
            const line2Y = textY + fontSize + 20;
            this.ctx.strokeText(text2, textX, line2Y);
            this.ctx.fillText(text2, textX, line2Y);
        }
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    async loadProcessedImage(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.currentImageData = imageSrc; // Update for download
                this.setupCanvas();
                resolve();
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }
    
    async downloadImage() {
        if (!this.canvas) return;
        
        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, 'image/png');
            });
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `text_behind_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showPreviewInfo('Image downloaded successfully!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showPreviewInfo('Download failed. Please try again.', 'danger');
        }
    }
    
    showUploadStatus(message, type = 'info') {
        this.uploadStatus.innerHTML = `
            <div class="alert alert-${type} fade-in" role="alert">
                ${message}
            </div>
        `;
        
        // Clear after 5 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.uploadStatus.innerHTML = '';
            }, 5000);
        }
    }
    
    showPreviewInfo(message, type = 'info') {
        const className = type === 'danger' ? 'text-danger' : 
                         type === 'success' ? 'text-success' : 'text-muted';
        
        this.previewInfo.innerHTML = `<span class="${className}">${message}</span>`;
        
        // Clear after 5 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.previewInfo.innerHTML = '';
            }, 5000);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TextBehindImageGenerator();
});
