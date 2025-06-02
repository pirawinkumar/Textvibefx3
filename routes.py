import os
import base64
import logging
from flask import render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from PIL import Image
import io
import uuid
from app import app
from segmentation import process_image_with_text

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload PNG, JPG, JPEG, GIF, BMP, or WEBP files.'}), 400
        
        # Read image data
        image_data = file.read()
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large (max 1024px on longest side)
        max_size = 1024
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert back to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # Convert to base64 for frontend
        img_base64 = base64.b64encode(img_byte_arr).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'width': image.size[0],
            'height': image.size[1]
        })
        
    except Exception as e:
        logging.error(f"Error uploading image: {str(e)}")
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

@app.route('/process', methods=['POST'])
def process_image():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Extract parameters
        image_data = data['image']
        text_line1 = data.get('textLine1', '')
        text_line2 = data.get('textLine2', '')
        font_family = data.get('fontFamily', 'Arial')
        font_size = int(data.get('fontSize', 48))
        text_x = int(data.get('textX', 50))
        text_y = int(data.get('textY', 50))
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        img_bytes = base64.b64decode(image_data)
        
        # Process image with segmentation and text
        result_image = process_image_with_text(
            img_bytes, text_line1, text_line2, 
            font_family, font_size, text_x, text_y
        )
        
        # Convert result to base64
        img_byte_arr = io.BytesIO()
        result_image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        result_base64 = base64.b64encode(img_byte_arr).decode('utf-8')
        
        return jsonify({
            'success': True,
            'processedImage': f'data:image/png;base64,{result_base64}'
        })
        
    except Exception as e:
        logging.error(f"Error processing image: {str(e)}")
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

@app.route('/download', methods=['POST'])
def download_image():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Extract image data
        image_data = data['image']
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        img_bytes = base64.b64decode(image_data)
        
        # Create a unique filename
        filename = f'text_behind_image_{uuid.uuid4().hex[:8]}.png'
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save the image
        with open(filepath, 'wb') as f:
            f.write(img_bytes)
        
        return send_file(filepath, as_attachment=True, download_name=filename)
        
    except Exception as e:
        logging.error(f"Error downloading image: {str(e)}")
        return jsonify({'error': f'Error preparing download: {str(e)}'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413
