from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import uuid
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global variables
model = None
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
MODEL_PATH = 'D:/plastic_detection_project/best.pt'

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

def load_model():
    """Load the trained YOLO model"""
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = YOLO(MODEL_PATH)
            print(f"✅ Model loaded successfully from {MODEL_PATH}")
            return True
        else:
            print(f"❌ Model file not found: {MODEL_PATH}")
            # Fallback to pretrained model for testing
            model = YOLO('yolov8n.pt')
            print("⚠️  Using pretrained YOLOv8n model as fallback")
            return False
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")
        return False

def process_detection_results(results):
    """Process YOLO detection results and extract information"""
    if not results or len(results) == 0:
        return {
            'detections': 0,
            'confidence': 0.0,
            'plastic_types': [],
            'bounding_boxes': [],
            'environmental_impact': {
                'severity': 'Low',
                'recommendation': 'No plastic detected'
            }
        }
    
    result = results[0]  # Get first result
    boxes = result.boxes
    
    if boxes is None or len(boxes) == 0:
        return {
            'detections': 0,
            'confidence': 0.0,
            'plastic_types': [],
            'bounding_boxes': [],
            'environmental_impact': {
                'severity': 'Low',
                'recommendation': 'No plastic detected'
            }
        }
    
    # Extract detection information
    detections = len(boxes)
    confidences = boxes.conf.cpu().numpy() if boxes.conf is not None else []
    classes = boxes.cls.cpu().numpy() if boxes.cls is not None else []
    xyxy = boxes.xyxy.cpu().numpy() if boxes.xyxy is not None else []
    
    # Calculate average confidence
    avg_confidence = float(np.mean(confidences)) if len(confidences) > 0 else 0.0
    
    # Get class names (assuming single class 'plastic' for now)
    class_names = ['plastic'] * len(classes)  # Update this based on your model classes
    
    # Create bounding boxes info
    bounding_boxes = []
    for i in range(len(xyxy)):
        box = {
            'x1': float(xyxy[i][0]),
            'y1': float(xyxy[i][1]),
            'x2': float(xyxy[i][2]),
            'y2': float(xyxy[i][3]),
            'confidence': float(confidences[i]) if i < len(confidences) else 0.0,
            'class': class_names[i] if i < len(class_names) else 'plastic'
        }
        bounding_boxes.append(box)
    
    # Determine environmental impact
    severity = 'High' if detections > 5 else 'Medium' if detections > 1 else 'Low'
    recommendations = {
        'High': 'Immediate cleanup required - High plastic pollution detected',
        'Medium': 'Cleanup recommended - Moderate plastic pollution found',
        'Low': 'Monitor area - Low level plastic pollution detected'
    }
    
    return {
        'detections': detections,
        'confidence': round(avg_confidence, 2),
        'plastic_types': list(set(class_names)),
        'bounding_boxes': bounding_boxes,
        'environmental_impact': {
            'severity': severity,
            'recommendation': recommendations[severity]
        }
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/detect', methods=['POST'])
def detect_plastic():
    """Main detection endpoint"""
    try:
        # Check if model is loaded
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        # Check if image file is provided
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save uploaded file
        file.save(filepath)
        
        # Get confidence threshold from request
        confidence_threshold = float(request.form.get('confidence', 0.25))
        
        # Run detection
        results = model.predict(
            source=filepath,
            conf=confidence_threshold,
            save=True,
            project=RESULTS_FOLDER,
            name=file_id,
            exist_ok=True
        )
        
        # Process results
        detection_data = process_detection_results(results)
        
        # Find the annotated image path
        # Find the annotated image path
        annotated_path = None
        result_dir = os.path.join(RESULTS_FOLDER, file_id)
        if os.path.exists(result_dir):
            for result_file in os.listdir(result_dir):  # ← Changed variable name
                if result_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    annotated_path = os.path.join(result_dir, result_file)
                    break
        
        # Convert annotated image to base64 if available
        annotated_image_b64 = None
        if annotated_path and os.path.exists(annotated_path):
            with open(annotated_path, 'rb') as img_file:
                annotated_image_b64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Prepare response
        response = {
            'success': True,
            'file_id': file_id,
            'filename': file.filename,
            'timestamp': datetime.now().isoformat(),
            'detection_results': detection_data,
            'annotated_image': annotated_image_b64
        }
        
        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in detection: {str(e)}")
        return jsonify({'error': f'Detection failed: {str(e)}'}), 500

@app.route('/api/download-report/<file_id>', methods=['GET'])
def download_report(file_id):
    """Download detection report as JSON"""
    try:
        # This would typically fetch from database
        # For now, return a sample report structure
        report = {
            'file_id': file_id,
            'timestamp': datetime.now().isoformat(),
            'model_version': 'plastic_detection_v1.0',
            'detection_summary': {
                'total_detections': 0,
                'confidence_threshold': 0.25,
                'processing_time': '2.1s'
            },
            'environmental_assessment': {
                'pollution_level': 'Unknown',
                'recommended_actions': []
            }
        }
        
        # Create temporary file
        report_filename = f"plastic_detection_report_{file_id}.json"
        report_path = os.path.join(RESULTS_FOLDER, report_filename)
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        return send_file(report_path, as_attachment=True, download_name=report_filename)
        
    except Exception as e:
        return jsonify({'error': f'Report generation failed: {str(e)}'}), 500

@app.route('/api/batch-detect', methods=['POST'])
def batch_detect():
    """Batch detection for multiple images"""
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        files = request.files.getlist('images')
        if not files:
            return jsonify({'error': 'No image files provided'}), 400
        
        batch_id = str(uuid.uuid4())
        batch_results = []
        
        for i, file in enumerate(files):
            if file.filename == '':
                continue
                
            # Process each image
            file_id = f"{batch_id}_{i}"
            filename = f"{file_id}.jpg"
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            # Run detection
            results = model.predict(
                source=filepath,
                conf=0.25,
                save=True,
                project=RESULTS_FOLDER,
                name=file_id,
                exist_ok=True
            )
            
            detection_data = process_detection_results(results)
            
            batch_results.append({
                'filename': file.filename,
                'file_id': file_id,
                'results': detection_data
            })
            
            # Clean up
            if os.path.exists(filepath):
                os.remove(filepath)
        
        return jsonify({
            'success': True,
            'batch_id': batch_id,
            'processed_images': len(batch_results),
            'results': batch_results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': f'Batch processing failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting Plastic Detection API Server...")
    print("=" * 50)
    
    # Load the model
    model_loaded = load_model()
    
    if model_loaded:
        print("✅ Ready to detect plastic!")
    else:
        print("⚠️  Server starting with fallback model")
    
    print("API Endpoints:")
    print("  GET  /api/health           - Health check")
    print("  POST /api/detect           - Single image detection")
    print("  POST /api/batch-detect     - Batch image detection")
    print("  GET  /api/download-report  - Download detection report")
    print("=" * 50)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)