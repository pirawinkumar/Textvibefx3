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
        
        // Audio variables
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioSource = null;
        this.analyser = null;
        this.dataArray = null;
        this.isPlaying = false;
        this.animationFrame = null;
        
        // Video recording variables
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.recordingStream = null;
        
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
        
        // Audio elements
        this.audioUploadArea = document.getElementById('audio-upload-area');
        this.audioInput = document.getElementById('audio-input');
        this.audioStatus = document.getElementById('audio-status');
        this.audioControls = document.querySelector('.audio-controls');
        this.playBtn = document.getElementById('play-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.visualizerIntensity = document.getElementById('visualizer-intensity');
        this.visualizerStyle = document.getElementById('visualizer-style');
        
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
        this.recordBtn = document.getElementById('record-btn');
        this.stopRecordBtn = document.getElementById('stop-record-btn');
    }
    
    bindEvents() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        
        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Audio upload events
        this.audioUploadArea.addEventListener('click', () => this.audioInput.click());
        this.audioInput.addEventListener('change', (e) => this.handleAudioSelect(e.target.files));
        this.audioUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.audioUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.audioUploadArea.addEventListener('drop', (e) => this.handleAudioDrop(e));
        
        // Audio control events
        this.playBtn.addEventListener('click', () => this.playAudio());
        this.pauseBtn.addEventListener('click', () => this.pauseAudio());
        
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
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
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
    
    handleAudioDrop(e) {
        e.preventDefault();
        this.audioUploadArea.classList.remove('dragover');
        this.handleAudioSelect(e.dataTransfer.files);
    }
    
    async handleAudioSelect(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            this.showAudioStatus('Please select a valid audio file.', 'danger');
            return;
        }
        
        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showAudioStatus('File size must be less than 10MB.', 'danger');
            return;
        }
        
        this.showAudioStatus('Loading audio...', 'warning');
        
        try {
            // Initialize audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Read the audio file
            const arrayBuffer = await file.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Set up analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.showAudioStatus(`Audio loaded successfully! Duration: ${Math.round(this.audioBuffer.duration)}s`, 'success');
            this.audioControls.style.display = 'block';
            
            // Enable recording button if we have both image and audio
            this.updateRecordingButtons();
            
        } catch (error) {
            console.error('Audio loading error:', error);
            this.showAudioStatus('Failed to load audio. Please try again.', 'danger');
        }
    }
    
    async playAudio() {
        if (!this.audioBuffer || !this.audioContext) return;
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Stop current source if playing
            if (this.audioSource) {
                this.audioSource.stop();
            }
            
            // Create new source
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            this.audioSource.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            // Set up ended event
            this.audioSource.onended = () => {
                this.isPlaying = false;
                this.playBtn.style.display = 'inline-block';
                this.pauseBtn.style.display = 'none';
                if (this.animationFrame) {
                    cancelAnimationFrame(this.animationFrame);
                }
            };
            
            this.audioSource.start();
            this.isPlaying = true;
            this.playBtn.style.display = 'none';
            this.pauseBtn.style.display = 'inline-block';
            
            // Start animation loop
            this.startVisualization();
            
        } catch (error) {
            console.error('Audio play error:', error);
            this.showAudioStatus('Failed to play audio.', 'danger');
        }
    }
    
    pauseAudio() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.isPlaying = false;
            this.playBtn.style.display = 'inline-block';
            this.pauseBtn.style.display = 'none';
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
        }
    }
    
    startVisualization() {
        const animate = () => {
            if (!this.isPlaying) return;
            
            // Get frequency data
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Force canvas redraw for recording
            if (this.isRecording) {
                this.forceCanvasUpdate();
            } else {
                this.updatePreview();
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }
    
    forceCanvasUpdate() {
        // Force a complete redraw for recording
        if (this.foregroundImage) {
            this.composeImage();
        } else {
            this.drawCanvas();
        }
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
            
            // Enable recording button if we have both image and audio
            this.updateRecordingButtons();
            
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
            
            // Enable recording button if we have both image and audio
            this.updateRecordingButtons();
            
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
        
        // Draw text with audio visualizer effect if audio is playing
        if (this.isPlaying && this.dataArray) {
            this.drawVisualizerText(text1, text2, textX, textY, fontSize);
        } else {
            this.drawStaticText(text1, text2, textX, textY, fontSize);
        }
    }
    
    drawStaticText(text1, text2, textX, textY, fontSize) {
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
    
    drawVisualizerText(text1, text2, textX, textY, fontSize) {
        const intensity = parseFloat(this.visualizerIntensity.value);
        
        // Calculate average frequency for overall intensity (with better control)
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const normalizedIntensity = Math.min((average / 255) * intensity * 0.3, 1); // Reduced intensity
        
        // Create more subtle dynamic colors
        const hue = (average / 255) * 360;
        const saturation = 50 + (normalizedIntensity * 20); // Reduced saturation
        const lightness = 40 + (normalizedIntensity * 15); // Reduced lightness
        
        // Draw subtle glow effect around text
        this.ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${normalizedIntensity * 0.6})`;
        this.ctx.shadowBlur = 8 + (normalizedIntensity * 12); // Reduced blur
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw single text layer with better visibility
        this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, 20%, 0.8)`; // Dark outline
        this.ctx.lineWidth = 6 + (normalizedIntensity * 3);
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, 85%, 0.95)`; // Light fill
        
        if (text1) {
            this.ctx.strokeText(text1, textX, textY);
            this.ctx.fillText(text1, textX, textY);
        }
        
        if (text2) {
            const line2Y = textY + fontSize + 20;
            this.ctx.strokeText(text2, textX, line2Y);
            this.ctx.fillText(text2, textX, line2Y);
        }
        
        // Draw frequency bars around text
        this.drawFrequencyBars(textX, textY, fontSize, text1, text2);
        
        // Reset effects
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    drawFrequencyBars(textX, textY, fontSize, text1, text2) {
        if (!this.dataArray) return;
        
        const style = this.visualizerStyle.value;
        
        switch (style) {
            case 'circular':
                this.drawCircularBars(textX, textY, fontSize, text1, text2);
                break;
            case 'outline':
                this.drawOutlineBars(textX, textY, fontSize, text1, text2);
                break;
            case 'radial':
                this.drawRadialBars(textX, textY, fontSize, text1, text2);
                break;
            case 'dense-crowd':
                this.drawDenseCrowdBars(textX, textY, fontSize, text1, text2);
                break;
            case 'text-shape':
                this.drawTextShapeBars(textX, textY, fontSize, text1, text2);
                break;
            case 'layered-movement':
                this.drawLayeredMovementBars(textX, textY, fontSize, text1, text2);
                break;
        }
    }
    
    drawCircularBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value) * 0.4; // Reduced overall intensity
        const barCount = 48; // Reduced bar count for cleaner look
        
        // Calculate text bounds more accurately
        const text1Width = text1 ? this.ctx.measureText(text1).width : 0;
        const text2Width = text2 ? this.ctx.measureText(text2).width : 0;
        const maxWidth = Math.max(text1Width, text2Width);
        const textHeight = fontSize * (text2 ? 2.2 : 1.2); // Account for both lines
        
        // Create spectrum-based circular visualizer
        const baseRadius = Math.max(maxWidth * 0.6, fontSize * 0.8);
        
        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            
            // Map to frequency spectrum (emphasize mid-range frequencies)
            const spectrumIndex = Math.floor((i / barCount) * this.dataArray.length * 0.7) + Math.floor(this.dataArray.length * 0.1);
            const frequencyValue = this.dataArray[Math.min(spectrumIndex, this.dataArray.length - 1)];
            
            // Calculate bar properties
            const normalizedFreq = frequencyValue / 255;
            const barLength = normalizedFreq * fontSize * intensity * 0.8;
            
            // Position bars around text perimeter
            const startRadius = baseRadius;
            const startX = textX + Math.cos(angle) * startRadius;
            const startY = textY + Math.sin(angle) * (startRadius * 0.7); // Slightly elliptical
            const endX = startX + Math.cos(angle) * barLength;
            const endY = startY + Math.sin(angle) * barLength;
            
            // Improved color mapping based on frequency and position
            const hue = (i / barCount) * 240 + 180; // Blue to purple spectrum
            const saturation = 60 + (normalizedFreq * 30);
            const lightness = 40 + (normalizedFreq * 25);
            const alpha = normalizedFreq * 0.7 + 0.1; // Minimum visibility
            
            // Draw bar with gradient effect
            const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
            gradient.addColorStop(1, `hsla(${hue + 30}, ${saturation}%, ${lightness + 20}%, ${alpha * 0.3})`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2 + (normalizedFreq * 2);
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
    }
    
    drawOutlineBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value) * 0.3; // Reduced intensity
        
        // Get text paths for outline following
        const texts = [
            { text: text1, x: textX, y: textY },
            { text: text2, x: textX, y: textY + fontSize + 20 }
        ].filter(item => item.text);
        
        texts.forEach((textItem, textIndex) => {
            const textWidth = this.ctx.measureText(textItem.text).width;
            const barCount = 24; // Reduced for cleaner look
            
            // Create smoother bars around text perimeter
            const perimeter = [];
            const steps = barCount;
            const padding = fontSize * 0.3;
            
            // Create smooth outline path
            for (let i = 0; i < steps; i++) {
                const progress = i / steps;
                const angle = progress * Math.PI * 2;
                
                // Create elliptical outline around text
                const radiusX = (textWidth / 2) + padding;
                const radiusY = (fontSize / 2) + padding;
                
                const x = textItem.x + Math.cos(angle) * radiusX;
                const y = textItem.y + Math.sin(angle) * radiusY;
                
                perimeter.push({
                    x: x,
                    y: y,
                    angle: angle + Math.PI/2 // Perpendicular to outline
                });
            }
            
            perimeter.forEach((point, i) => {
                // Map to frequency spectrum more smoothly
                const spectrumIndex = Math.floor((i / perimeter.length) * this.dataArray.length);
                const frequencyValue = this.dataArray[spectrumIndex];
                const normalizedFreq = frequencyValue / 255;
                const barLength = normalizedFreq * fontSize * intensity * 0.6;
                
                const endX = point.x + Math.cos(point.angle) * barLength;
                const endY = point.y + Math.sin(point.angle) * barLength;
                
                // Improved color scheme
                const hue = (i / perimeter.length) * 300 + (textIndex * 150) + 120; // Green to blue spectrum
                const saturation = 50 + (normalizedFreq * 25);
                const lightness = 45 + (normalizedFreq * 20);
                const alpha = normalizedFreq * 0.6 + 0.15;
                
                this.ctx.strokeStyle = `hsla(${hue % 360}, ${saturation}%, ${lightness}%, ${alpha})`;
                this.ctx.lineWidth = 1.5 + (normalizedFreq * 1.5);
                this.ctx.lineCap = 'round';
                
                this.ctx.beginPath();
                this.ctx.moveTo(point.x, point.y);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            });
        });
    }
    
    drawRadialBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value) * 0.4; // Reduced intensity
        const barCount = 36; // Reduced for cleaner look
        
        // Calculate text bounds for better positioning
        const text1Width = text1 ? this.ctx.measureText(text1).width : 0;
        const text2Width = text2 ? this.ctx.measureText(text2).width : 0;
        const maxWidth = Math.max(text1Width, text2Width);
        
        // Create radial burst effect with better spectrum mapping
        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            
            // Better frequency mapping for more responsive visualization
            const spectrumIndex = Math.floor((i / barCount) * this.dataArray.length * 0.8) + Math.floor(this.dataArray.length * 0.1);
            const frequencyValue = this.dataArray[Math.min(spectrumIndex, this.dataArray.length - 1)];
            const normalizedFreq = frequencyValue / 255;
            const barLength = normalizedFreq * fontSize * intensity * 1.2;
            
            // Start from text perimeter, burst outward
            const startRadius = Math.max(maxWidth * 0.4, fontSize * 0.4);
            const startX = textX + Math.cos(angle) * startRadius;
            const startY = textY + Math.sin(angle) * startRadius;
            const endX = startX + Math.cos(angle) * barLength;
            const endY = startY + Math.sin(angle) * barLength;
            
            // Create subtle gradient effect
            const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
            const hue = (i / barCount) * 280 + 60; // Yellow to blue spectrum
            const saturation = 55 + (normalizedFreq * 25);
            const lightness = 50 + (normalizedFreq * 20);
            const alpha = normalizedFreq * 0.7 + 0.1;
            
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
            gradient.addColorStop(1, `hsla(${(hue + 40) % 360}, ${saturation}%, ${lightness + 15}%, ${alpha * 0.2})`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2 + (normalizedFreq * 2);
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
    }

    drawDenseCrowdBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value) * 0.6;
        const barCount = 400; // Dense crowd of bars
        const time = Date.now() * 0.001; // For animation
        
        // Calculate text bounds
        const text1Width = text1 ? this.ctx.measureText(text1).width : 0;
        const text2Width = text2 ? this.ctx.measureText(text2).width : 0;
        const maxWidth = Math.max(text1Width, text2Width);
        const textHeight = fontSize * (text2 ? 2.5 : 1.5);
        
        // Create a dense field of bars around the text
        const fieldWidth = maxWidth * 2.5;
        const fieldHeight = textHeight * 2;
        const startX = textX - fieldWidth / 2;
        const startY = textY - fieldHeight / 2;
        
        for (let i = 0; i < barCount; i++) {
            // Create grid-like distribution with some randomness
            const gridX = (i % Math.sqrt(barCount)) / Math.sqrt(barCount);
            const gridY = Math.floor(i / Math.sqrt(barCount)) / Math.sqrt(barCount);
            
            // Add jitter for organic look
            const jitterX = (Math.sin(time * 2 + i * 0.1) * 0.05);
            const jitterY = (Math.cos(time * 1.5 + i * 0.15) * 0.05);
            
            const barX = startX + (gridX + jitterX) * fieldWidth;
            const barY = startY + (gridY + jitterY) * fieldHeight;
            
            // Distance from text center for intensity falloff
            const distanceFromCenter = Math.sqrt(
                Math.pow(barX - textX, 2) + Math.pow(barY - textY, 2)
            );
            const maxDistance = Math.max(fieldWidth, fieldHeight) * 0.5;
            const distanceFactor = Math.max(0, 1 - (distanceFromCenter / maxDistance));
            
            // Map to frequency spectrum
            const spectrumIndex = Math.floor((i / barCount) * this.dataArray.length);
            const frequencyValue = this.dataArray[spectrumIndex];
            const normalizedFreq = frequencyValue / 255;
            
            // Layered movement effects
            const bounce = Math.sin(time * 3 + i * 0.2) * 0.3;
            const pulse = Math.cos(time * 4 + i * 0.1) * 0.2;
            const jitter = Math.sin(time * 8 + i * 0.05) * 0.1;
            
            // Bar height with multiple layers of movement
            const baseHeight = normalizedFreq * fontSize * intensity * distanceFactor;
            const animatedHeight = baseHeight * (1 + bounce + pulse + jitter);
            
            // Skip very small bars to maintain performance
            if (animatedHeight < 2) continue;
            
            // Color gradient based on frequency and position
            const hue = 240 + (normalizedFreq * 120) + (distanceFactor * 60);
            const saturation = 60 + (normalizedFreq * 30);
            const lightness = 30 + (normalizedFreq * 40) + (distanceFactor * 20);
            const alpha = (normalizedFreq * 0.7 + 0.1) * distanceFactor;
            
            // Glow effect for intensity
            if (normalizedFreq > 0.6) {
                this.ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness + 30}%, ${alpha * 0.8})`;
                this.ctx.shadowBlur = 8 + (normalizedFreq * 12);
            }
            
            this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            this.ctx.lineWidth = 1 + (normalizedFreq * 2);
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(barX, barY);
            this.ctx.lineTo(barX, barY - animatedHeight);
            this.ctx.stroke();
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }

    drawTextShapeBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value) * 0.8;
        const time = Date.now() * 0.001;
        
        // Create bars that follow the shape of the text
        const texts = [
            { text: text1, x: textX, y: textY },
            { text: text2, x: textX, y: textY + fontSize + 20 }
        ].filter(item => item.text);
        
        texts.forEach((textItem, textIndex) => {
            const textWidth = this.ctx.measureText(textItem.text).width;
            const barDensity = 150; // Bars per text line
            
            for (let i = 0; i < barDensity; i++) {
                // Position bars along text path
                const progress = i / barDensity;
                const baseX = textItem.x - textWidth/2 + progress * textWidth;
                
                // Create multiple layers around the text shape
                for (let layer = 0; layer < 3; layer++) {
                    const layerOffset = (layer - 1) * fontSize * 0.3;
                    const barX = baseX + Math.sin(time * 2 + i * 0.1 + layer) * 5;
                    const barY = textItem.y + layerOffset;
                    
                    // Frequency mapping
                    const spectrumIndex = Math.floor((i / barDensity) * this.dataArray.length);
                    const frequencyValue = this.dataArray[spectrumIndex];
                    const normalizedFreq = frequencyValue / 255;
                    
                    // Layer-specific movement
                    const layerBounce = Math.sin(time * (3 + layer) + i * 0.15) * 0.4;
                    const layerPulse = Math.cos(time * (5 + layer * 2) + i * 0.08) * 0.3;
                    
                    const barHeight = normalizedFreq * fontSize * intensity * (0.8 - layer * 0.2) * (1 + layerBounce + layerPulse);
                    
                    if (barHeight < 1) continue;
                    
                    // Layer-specific colors
                    const baseHue = 280 + (layer * 40) + (normalizedFreq * 80);
                    const saturation = 70 + (normalizedFreq * 20);
                    const lightness = 40 + (normalizedFreq * 30) - (layer * 10);
                    const alpha = (normalizedFreq * 0.6 + 0.2) * (1 - layer * 0.2);
                    
                    this.ctx.strokeStyle = `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${alpha})`;
                    this.ctx.lineWidth = 1 + (normalizedFreq * 1.5);
                    this.ctx.lineCap = 'round';
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(barX, barY);
                    this.ctx.lineTo(barX, barY - barHeight);
                    this.ctx.stroke();
                }
            }
        });
    }

    drawLayeredMovementBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value) * 0.7;
        const time = Date.now() * 0.001;
        const barCount = 300;
        
        // Calculate text bounds
        const text1Width = text1 ? this.ctx.measureText(text1).width : 0;
        const text2Width = text2 ? this.ctx.measureText(text2).width : 0;
        const maxWidth = Math.max(text1Width, text2Width);
        const textHeight = fontSize * (text2 ? 2.5 : 1.5);
        
        // Create multiple movement layers
        const layers = [
            { speed: 1, amplitude: 1, count: 100, hueShift: 0 },
            { speed: 1.5, amplitude: 0.7, count: 100, hueShift: 60 },
            { speed: 2.2, amplitude: 0.5, count: 100, hueShift: 120 }
        ];
        
        layers.forEach((layer, layerIndex) => {
            for (let i = 0; i < layer.count; i++) {
                // Circular distribution around text
                const angle = (i / layer.count) * Math.PI * 2;
                const baseRadius = maxWidth * 0.8 + layerIndex * fontSize * 0.2;
                
                // Complex layered movement
                const primaryWave = Math.sin(time * layer.speed + i * 0.2) * layer.amplitude;
                const secondaryWave = Math.cos(time * layer.speed * 1.3 + i * 0.15) * layer.amplitude * 0.6;
                const jitterEffect = Math.sin(time * layer.speed * 3 + i * 0.05) * layer.amplitude * 0.3;
                
                const dynamicRadius = baseRadius + (primaryWave + secondaryWave + jitterEffect) * fontSize * 0.3;
                
                const barX = textX + Math.cos(angle) * dynamicRadius;
                const barY = textY + Math.sin(angle) * dynamicRadius * 0.7; // Elliptical
                
                // Frequency mapping
                const spectrumIndex = Math.floor((i / layer.count) * this.dataArray.length);
                const frequencyValue = this.dataArray[spectrumIndex];
                const normalizedFreq = frequencyValue / 255;
                
                // Multi-layered height calculation
                const bounceHeight = Math.sin(time * 4 + angle * 3) * 0.4;
                const pulseHeight = Math.cos(time * 6 + i * 0.1) * 0.3;
                const jitterHeight = Math.sin(time * 10 + angle) * 0.2;
                
                const barHeight = normalizedFreq * fontSize * intensity * layer.amplitude * 
                                (1 + bounceHeight + pulseHeight + jitterHeight);
                
                if (barHeight < 2) continue;
                
                // Direction for bar growth
                const barEndX = barX + Math.cos(angle) * barHeight;
                const barEndY = barY + Math.sin(angle) * barHeight;
                
                // Layer-specific color scheme with gradients
                const baseHue = 200 + layer.hueShift + (normalizedFreq * 60) + (angle * 30);
                const saturation = 60 + (normalizedFreq * 25) + (layerIndex * 10);
                const lightness = 35 + (normalizedFreq * 35) + (Math.sin(time + angle) * 15);
                const alpha = (normalizedFreq * 0.7 + 0.1) * (1 - layerIndex * 0.15);
                
                // Glow effect for high frequencies
                if (normalizedFreq > 0.7) {
                    this.ctx.shadowColor = `hsla(${baseHue}, ${saturation}%, ${lightness + 40}%, ${alpha * 0.6})`;
                    this.ctx.shadowBlur = 6 + (normalizedFreq * 8);
                }
                
                // Gradient stroke
                const gradient = this.ctx.createLinearGradient(barX, barY, barEndX, barEndY);
                gradient.addColorStop(0, `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${alpha})`);
                gradient.addColorStop(1, `hsla(${baseHue + 30}, ${saturation}%, ${lightness + 20}%, ${alpha * 0.3})`);
                
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 1 + (normalizedFreq * 2) + (layerIndex * 0.5);
                this.ctx.lineCap = 'round';
                
                this.ctx.beginPath();
                this.ctx.moveTo(barX, barY);
                this.ctx.lineTo(barEndX, barEndY);
                this.ctx.stroke();
                
                // Reset shadow
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
        });
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
    
    showAudioStatus(message, type = 'info') {
        this.audioStatus.innerHTML = `
            <div class="alert alert-${type} fade-in" role="alert">
                ${message}
            </div>
        `;
        
        // Clear after 5 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.audioStatus.innerHTML = '';
            }, 5000);
        }
    }
    
    updateRecordingButtons() {
        // Enable recording if we have both processed image and audio
        const canRecord = this.foregroundImage && this.audioBuffer;
        this.recordBtn.disabled = !canRecord;
        
        if (canRecord) {
            this.showPreviewInfo('Ready to record video with audio!', 'success');
        }
    }
    
    async startRecording() {
        if (!this.foregroundImage || !this.audioBuffer || this.isRecording) return;
        
        try {
            this.isRecording = true;
            
            // Ensure canvas is properly sized for recording
            this.setupCanvas();
            
            // Start high-frequency canvas updates for smooth recording
            const recordingFPS = 60;
            const canvasStream = this.canvas.captureStream(recordingFPS);
            
            // Create a dedicated audio source for recording with proper routing
            const recordingAudioSource = this.audioContext.createBufferSource();
            recordingAudioSource.buffer = this.audioBuffer;
            
            // Create media stream destination for audio recording
            const audioDestination = this.audioContext.createMediaStreamDestination();
            recordingAudioSource.connect(this.analyser);
            this.analyser.connect(audioDestination);
            // Don't connect to destination to avoid double audio playback during recording
            
            // Combine video and audio streams
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDestination.stream.getAudioTracks()
            ]);
            
            this.recordingStream = combinedStream;
            
            // MediaRecorder setup with better options
            let options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 5000000, // Higher bitrate for better quality
                audioBitsPerSecond: 128000
            };
            
            // Try different codecs if not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }
            
            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            // Update UI first
            this.recordBtn.style.display = 'none';
            this.stopRecordBtn.style.display = 'inline-block';
            this.stopRecordBtn.disabled = false;
            this.showPreviewInfo('Starting recording...', 'warning');
            
            // Start MediaRecorder
            this.mediaRecorder.start(100); // Record in 100ms chunks for smoother capture
            
            // Small delay to ensure recorder is ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Start audio playback
            recordingAudioSource.start();
            this.audioSource = recordingAudioSource; // Keep reference for stopping
            this.isPlaying = true;
            
            // Update play/pause buttons
            this.playBtn.style.display = 'none';
            this.pauseBtn.style.display = 'inline-block';
            
            // Start visualization loop
            this.startVisualization();
            
            this.showPreviewInfo('Recording video with visualizer...', 'warning');
            
            // Auto-stop when audio ends
            recordingAudioSource.onended = () => {
                this.isPlaying = false;
                this.playBtn.style.display = 'inline-block';
                this.pauseBtn.style.display = 'none';
                
                if (this.isRecording) {
                    setTimeout(() => {
                        this.stopRecording();
                    }, 500);
                }
            };
            
        } catch (error) {
            console.error('Recording start error:', error);
            this.showPreviewInfo('Failed to start recording. Please try again.', 'danger');
            this.isRecording = false;
            this.resetRecordingUI();
        }
    }
    
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        // Stop recording
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Stop audio and animation
        this.pauseAudio();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Reset UI
        this.resetRecordingUI();
        
        this.showPreviewInfo('Processing video...', 'warning');
    }
    
    resetRecordingUI() {
        this.recordBtn.style.display = 'inline-block';
        this.stopRecordBtn.style.display = 'none';
        this.stopRecordBtn.disabled = true;
    }
    
    saveRecording() {
        if (this.recordedChunks.length === 0) {
            this.showPreviewInfo('No video data recorded.', 'danger');
            return;
        }
        
        // Create blob from recorded chunks
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `text_behind_image_video_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Clean up
        this.recordedChunks = [];
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(track => track.stop());
            this.recordingStream = null;
        }
        
        this.showPreviewInfo('Video downloaded successfully!', 'success');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TextBehindImageGenerator();
});
