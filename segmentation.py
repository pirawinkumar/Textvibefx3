import cv2
import numpy as np
import mediapipe as mp
from PIL import Image, ImageDraw, ImageFont
import io
import logging

# Initialize MediaPipe
mp_selfie_segmentation = mp.solutions.selfie_segmentation
segmentation_model = mp_selfie_segmentation.SelfieSegmentation(model_selection=1)

def process_image_with_text(image_bytes, text_line1, text_line2, font_family, font_size, text_x, text_y):
    """
    Process image with AI segmentation and place text behind the person
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert PIL to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Process with MediaPipe
        results = segmentation_model.process(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
        
        # Get segmentation mask
        mask = results.segmentation_mask
        
        # Convert mask to binary (person = 1, background = 0)
        binary_mask = (mask > 0.5).astype(np.uint8)
        
        # Create PIL image from mask
        mask_pil = Image.fromarray((binary_mask * 255).astype(np.uint8), mode='L')
        
        # Create text layer
        text_layer = create_text_layer(image.size, text_line1, text_line2, font_family, font_size, text_x, text_y)
        
        # Composite the layers: background, text, then person
        result = composite_layers(image, text_layer, mask_pil)
        
        return result
        
    except Exception as e:
        logging.error(f"Error in segmentation: {str(e)}")
        raise Exception(f"Segmentation failed: {str(e)}")

def create_text_layer(size, text_line1, text_line2, font_family, font_size, text_x, text_y):
    """
    Create a transparent layer with text
    """
    text_layer = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)
    
    # Try to load the specified font, fallback to default
    try:
        # Map common font names to system fonts
        font_mapping = {
            'Arial': 'arial.ttf',
            'Times': 'times.ttf',
            'Helvetica': 'helvetica.ttf',
            'Georgia': 'georgia.ttf',
            'Verdana': 'verdana.ttf'
        }
        
        font_file = font_mapping.get(font_family, font_family)
        try:
            font = ImageFont.truetype(font_file, font_size)
        except:
            # Try with .ttf extension
            font = ImageFont.truetype(f"{font_family.lower()}.ttf", font_size)
    except:
        # Fallback to default font
        try:
            font = ImageFont.load_default()
        except:
            font = None
    
    # Text color (white with slight transparency for better visibility)
    text_color = (255, 255, 255, 220)
    
    # Draw text with outline for better visibility
    if font:
        # Draw outline
        outline_color = (0, 0, 0, 180)
        for dx in [-2, -1, 0, 1, 2]:
            for dy in [-2, -1, 0, 1, 2]:
                if dx != 0 or dy != 0:
                    draw.text((text_x + dx, text_y + dy), text_line1, font=font, fill=outline_color)
                    if text_line2:
                        draw.text((text_x + dx, text_y + font_size + 10 + dy), text_line2, font=font, fill=outline_color)
        
        # Draw main text
        draw.text((text_x, text_y), text_line1, font=font, fill=text_color)
        if text_line2:
            draw.text((text_x, text_y + font_size + 10), text_line2, font=font, fill=text_color)
    else:
        # Fallback without custom font
        draw.text((text_x, text_y), text_line1, fill=text_color)
        if text_line2:
            draw.text((text_x, text_y + 20), text_line2, fill=text_color)
    
    return text_layer

def composite_layers(background, text_layer, person_mask):
    """
    Composite the layers: background, text behind person, person in front
    """
    # Convert background to RGBA
    if background.mode != 'RGBA':
        background = background.convert('RGBA')
    
    # Create inverse mask for text (where person is NOT present)
    person_mask_rgba = person_mask.convert('RGBA')
    inverse_mask = Image.new('L', person_mask.size, 255)
    inverse_mask = Image.composite(Image.new('L', person_mask.size, 0), inverse_mask, person_mask)
    
    # Apply inverse mask to text layer (text only shows where person is not)
    text_masked = Image.new('RGBA', background.size, (0, 0, 0, 0))
    text_masked.paste(text_layer, mask=inverse_mask)
    
    # Composite: background + text (behind person)
    result = Image.alpha_composite(background, text_masked)
    
    # Create person layer from original image
    person_layer = Image.new('RGBA', background.size, (0, 0, 0, 0))
    person_layer.paste(background, mask=person_mask)
    
    # Final composite: (background + text) + person
    result = Image.alpha_composite(result, person_layer)
    
    # Convert back to RGB for final output
    final_result = Image.new('RGB', result.size, (255, 255, 255))
    final_result.paste(result, mask=result.split()[-1] if result.mode == 'RGBA' else None)
    
    return final_result
