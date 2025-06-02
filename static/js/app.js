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
            
            // Update preview if we have images
            this.updatePreview();
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
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
        
        // Calculate average frequency for overall intensity
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const normalizedIntensity = (average / 255) * intensity;
        
        // Create dynamic colors based on audio
        const hue = (average / 255) * 360;
        const saturation = 70 + (normalizedIntensity * 30);
        const lightness = 50 + (normalizedIntensity * 20);
        
        // Draw glowing effect around text
        this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        this.ctx.shadowBlur = 20 + (normalizedIntensity * 30);
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw multiple glow layers for stronger effect
        for (let i = 0; i < 3; i++) {
            this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.8 - i * 0.2})`;
            this.ctx.lineWidth = 8 + (i * 4) + (normalizedIntensity * 5);
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${Math.min(90, lightness + 40)}%, 0.9)`;
            
            if (text1) {
                this.ctx.strokeText(text1, textX, textY);
                this.ctx.fillText(text1, textX, textY);
            }
            
            if (text2) {
                const line2Y = textY + fontSize + 20;
                this.ctx.strokeText(text2, textX, line2Y);
                this.ctx.fillText(text2, textX, line2Y);
            }
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
        }
    }
    
    drawCircularBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value);
        const barCount = 64; // More bars for smoother circle
        
        // Calculate text bounds
        const text1Width = text1 ? this.ctx.measureText(text1).width : 0;
        const text2Width = text2 ? this.ctx.measureText(text2).width : 0;
        const maxWidth = Math.max(text1Width, text2Width);
        
        // Create multiple concentric circles
        const circles = [
            { radius: (maxWidth * 0.6) + fontSize * 0.3, barLength: 0.8 },
            { radius: (maxWidth * 0.6) + fontSize * 0.6, barLength: 1.0 },
            { radius: (maxWidth * 0.6) + fontSize * 0.9, barLength: 0.6 }
        ];
        
        circles.forEach((circle, circleIndex) => {
            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2;
                const dataIndex = Math.floor((i / barCount) * this.dataArray.length);
                const barHeight = (this.dataArray[dataIndex] / 255) * fontSize * intensity * circle.barLength;
                
                const startX = textX + Math.cos(angle) * circle.radius;
                const startY = textY + Math.sin(angle) * circle.radius;
                const endX = startX + Math.cos(angle) * barHeight;
                const endY = startY + Math.sin(angle) * barHeight;
                
                // Color variation across circles and frequency
                const hue = (i / barCount) * 360 + (circleIndex * 120);
                const saturation = 70 + (circleIndex * 10);
                const alpha = (this.dataArray[dataIndex] / 255) * (0.9 - circleIndex * 0.2);
                
                this.ctx.strokeStyle = `hsla(${hue % 360}, ${saturation}%, 60%, ${alpha})`;
                this.ctx.lineWidth = 3 - circleIndex;
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        });
    }
    
    drawOutlineBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value);
        
        // Get text paths for outline following
        const texts = [
            { text: text1, x: textX, y: textY },
            { text: text2, x: textX, y: textY + fontSize + 20 }
        ].filter(item => item.text);
        
        texts.forEach((textItem, textIndex) => {
            const textWidth = this.ctx.measureText(textItem.text).width;
            const barCount = Math.min(32, textItem.text.length * 4);
            
            // Create bars around text perimeter
            const perimeter = [
                // Top edge
                ...Array.from({length: barCount / 4}, (_, i) => ({
                    x: textItem.x - textWidth/2 + (i / (barCount/4)) * textWidth,
                    y: textItem.y - fontSize/2,
                    angle: -Math.PI/2
                })),
                // Right edge
                ...Array.from({length: barCount / 4}, (_, i) => ({
                    x: textItem.x + textWidth/2,
                    y: textItem.y - fontSize/2 + (i / (barCount/4)) * fontSize,
                    angle: 0
                })),
                // Bottom edge
                ...Array.from({length: barCount / 4}, (_, i) => ({
                    x: textItem.x + textWidth/2 - (i / (barCount/4)) * textWidth,
                    y: textItem.y + fontSize/2,
                    angle: Math.PI/2
                })),
                // Left edge
                ...Array.from({length: barCount / 4}, (_, i) => ({
                    x: textItem.x - textWidth/2,
                    y: textItem.y + fontSize/2 - (i / (barCount/4)) * fontSize,
                    angle: Math.PI
                }))
            ];
            
            perimeter.forEach((point, i) => {
                const dataIndex = Math.floor((i / perimeter.length) * this.dataArray.length);
                const barLength = (this.dataArray[dataIndex] / 255) * fontSize * intensity * 0.5;
                
                const endX = point.x + Math.cos(point.angle) * barLength;
                const endY = point.y + Math.sin(point.angle) * barLength;
                
                const hue = (i / perimeter.length) * 360 + (textIndex * 180);
                const alpha = (this.dataArray[dataIndex] / 255) * 0.8;
                
                this.ctx.strokeStyle = `hsla(${hue % 360}, 70%, 60%, ${alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(point.x, point.y);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            });
        });
    }
    
    drawRadialBars(textX, textY, fontSize, text1, text2) {
        const intensity = parseFloat(this.visualizerIntensity.value);
        const barCount = 48;
        
        // Create radial burst effect
        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const dataIndex = Math.floor((i / barCount) * this.dataArray.length);
            const barLength = (this.dataArray[dataIndex] / 255) * fontSize * intensity * 2;
            
            // Start from text center, burst outward
            const startRadius = fontSize * 0.5;
            const startX = textX + Math.cos(angle) * startRadius;
            const startY = textY + Math.sin(angle) * startRadius;
            const endX = startX + Math.cos(angle) * barLength;
            const endY = startY + Math.sin(angle) * barLength;
            
            // Create gradient effect
            const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
            const hue = (i / barCount) * 360;
            const alpha = (this.dataArray[dataIndex] / 255);
            
            gradient.addColorStop(0, `hsla(${hue}, 70%, 70%, ${alpha})`);
            gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 80%, 50%, 0)`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
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
            // Get canvas stream
            const canvasStream = this.canvas.captureStream(30); // 30 FPS
            
            // Create audio stream from audio context
            const audioDestination = this.audioContext.createMediaStreamDestination();
            this.analyser.connect(audioDestination);
            
            // Combine canvas and audio streams
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDestination.stream.getAudioTracks()
            ]);
            
            this.recordingStream = combinedStream;
            
            // Set up MediaRecorder
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            };
            
            // Fallback if webm not supported
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
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            this.recordBtn.style.display = 'none';
            this.stopRecordBtn.style.display = 'inline-block';
            this.stopRecordBtn.disabled = false;
            
            // Start audio playback for recording
            await this.playAudio();
            
            this.showPreviewInfo('Recording video... Audio will play automatically.', 'warning');
            
            // Auto-stop when audio ends
            this.audioSource.onended = () => {
                if (this.isRecording) {
                    setTimeout(() => {
                        this.stopRecording();
                    }, 500); // Small delay to ensure everything is captured
                }
            };
            
        } catch (error) {
            console.error('Recording start error:', error);
            this.showPreviewInfo('Failed to start recording. Please try again.', 'danger');
            this.resetRecordingUI();
        }
    }
    
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        // Stop recording
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Stop audio
        this.pauseAudio();
        
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
