class TextBehindImageGenerator {
    constructor() {
        this.currentImage = null;
        this.currentImageData = null;
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
        
        this.showUploadStatus('Uploading image...', 'warning');
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentImageData = result.image;
                await this.loadImage(result.image);
                this.showUploadStatus(`Image uploaded successfully! (${result.width}x${result.height})`, 'success');
                this.processBtn.disabled = false;
                this.updatePreview();
            } else {
                this.showUploadStatus(result.error || 'Upload failed', 'danger');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadStatus('Upload failed. Please try again.', 'danger');
        }
    }
    
    async loadImage(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
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
        
        this.canvas.width = this.currentImage.width;
        this.canvas.height = this.currentImage.height;
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        
        this.drawCanvas();
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
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Draw text with outline for visibility
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
            this.drawCanvas();
        }
    }
    
    async processImage() {
        if (!this.currentImageData || this.isProcessing) return;
        
        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.processingOverlay.style.display = 'flex';
        
        try {
            const requestData = {
                image: this.currentImageData,
                textLine1: this.textLine1.value,
                textLine2: this.textLine2.value,
                fontFamily: this.fontFamily.value,
                fontSize: this.fontSize.value,
                textX: this.textX.value,
                textY: this.textY.value
            };
            
            const response = await fetch('/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                await this.loadProcessedImage(result.processedImage);
                this.downloadBtn.disabled = false;
                this.showPreviewInfo('AI processing complete! Text placed behind person.');
            } else {
                this.showPreviewInfo(`Processing failed: ${result.error}`, 'danger');
            }
        } catch (error) {
            console.error('Processing error:', error);
            this.showPreviewInfo('Processing failed. Please try again.', 'danger');
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
            this.processingOverlay.style.display = 'none';
        }
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
        if (!this.currentImageData) return;
        
        try {
            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: this.currentImageData
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `text_behind_image_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showPreviewInfo('Image downloaded successfully!', 'success');
            } else {
                this.showPreviewInfo('Download failed. Please try again.', 'danger');
            }
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
