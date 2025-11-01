import React, { useState, useRef } from 'react';

const PlasticDetectionApp = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const detectPlastic = async (imageFile) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Starting detection...');
      
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('confidence', '0.25');
      
      // First check if Flask is reachable
      const healthCheck = async (url) => {
        try {
          const healthResponse = await fetch(url.replace('/api/detect', '/api/health'), {
            method: 'GET',
            timeout: 5000
          });
          return healthResponse.ok;
        } catch {
          return false;
        }
      };
      
      // Try both localhost variations
      const urls = [
        'http://localhost:5000/api/detect',
        'http://127.0.0.1:5000/api/detect'
      ];
      
      let response;
      let lastError;
      let serverReachable = false;
      
      for (const url of urls) {
        try {
          console.log(`Checking if server is reachable at: ${url}`);
          serverReachable = await healthCheck(url);
          
          if (!serverReachable) {
            console.log(`Server not reachable at ${url}`);
            continue;
          }
          
          console.log(`Trying detection at: ${url}`);
          response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            body: formData,
          });
          
          if (response.ok) {
            console.log(`Success with URL: ${url}`);
            break;
          } else {
            console.log(`Failed with URL: ${url}, Status: ${response.status}`);
            const errorText = await response.text();
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
          }
        } catch (fetchError) {
          console.log(`Network error with URL: ${url}`, fetchError);
          lastError = fetchError;
        }
      }
      
      if (!serverReachable) {
        throw new Error('Flask server is not running or not accessible. Please start your backend server.');
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All connection attempts failed');
      }
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setResults(data);
        console.log('Detection successful:', data.detection_results);
      } else {
        throw new Error(data.error || 'Detection failed - no success flag');
      }
      
    } catch (error) {
      console.error('Detection error:', error);
      let errorMessage = error.message || 'Detection failed';
      
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to Flask backend. Ensure "python app.py" is running in your backend directory.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error. Add CORS configuration to your Flask app.py file.';
      } else if (error.message.includes('not running')) {
        errorMessage = 'Flask server not detected. Start it with "python app.py" in your backend folder.';
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage({
          file,
          url: e.target.result,
          name: file.name
        });
        setResults(null);
        setError(null);
        detectPlastic(file);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file (JPG, PNG, etc.)');
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadReport = () => {
    if (!results || !results.detection_results) return;
    
    const reportData = {
      filename: selectedImage?.name || 'unknown',
      timestamp: results.timestamp,
      detections: results.detection_results.detections,
      confidence: results.detection_results.confidence,
      plastic_types: results.detection_results.plastic_types || [],
      environmental_impact: results.detection_results.environmental_impact,
      bounding_boxes: results.detection_results.bounding_boxes || []
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plastic_detection_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const testConnection = async () => {
    try {
      const urls = ['http://localhost:5000/api/health', 'http://127.0.0.1:5000/api/health'];
      
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log('Backend connection successful:', data);
            setError(null);
            alert(`Backend connected successfully!\nModel loaded: ${data.model_loaded}`);
            return;
          }
        } catch (e) {
          console.log(`Failed to connect to ${url}:`, e);
        }
      }
      
      throw new Error('Cannot connect to backend on any URL');
    } catch (error) {
      setError('Backend connection failed. Make sure Flask server is running.');
    }
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#2d5a27',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em' }}>
          Plastic Detection AI
        </h1>
        <p style={{ margin: '0', fontSize: '1.1em' }}>
          Advanced computer vision for environmental conservation
        </p>
        <small style={{ opacity: '0.8' }}>YOLOv8 Powered</small>
        
        {/* Connection Test Button */}
        <button
          onClick={testConnection}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '5px 10px',
            borderRadius: '5px',
            fontSize: '0.8em',
            cursor: 'pointer'
          }}
        >
          Test Connection
        </button>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr', 
        gap: '20px' 
      }}>
        
        {/* Upload Section */}
        <div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#2d5a27', marginBottom: '15px' }}>Upload Image</h2>
            
            <div style={{
              border: selectedImage ? '2px solid #2d5a27' : '2px dashed #ccc',
              borderRadius: '10px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => fileInputRef.current?.click()}
            onMouseOver={(e) => {
              if (!selectedImage) e.currentTarget.style.borderColor = '#2d5a27';
            }}
            onMouseOut={(e) => {
              if (!selectedImage) e.currentTarget.style.borderColor = '#ccc';
            }}>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files[0])}
                style={{ display: 'none' }}
              />
              
              {!selectedImage ? (
                <>
                  <div style={{ fontSize: '3em', marginBottom: '10px' }}>📷</div>
                  <h3 style={{ color: '#666', marginBottom: '10px' }}>Drop your image here</h3>
                  <p style={{ color: '#999', marginBottom: '15px' }}>Or click to browse files</p>
                  <button style={{
                    backgroundColor: '#2d5a27',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '1em'
                  }}>
                    Choose Image
                  </button>
                </>
              ) : (
                <div>
                  <img
                    src={selectedImage.url}
                    alt="Uploaded"
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px', 
                      borderRadius: '5px', 
                      marginBottom: '10px',
                      objectFit: 'contain'
                    }}
                  />
                  <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '10px' }}>
                    {selectedImage.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          {selectedImage && (
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#2d5a27', marginBottom: '10px' }}>Detection Status</h3>
              
              {isProcessing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2d5a27' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #2d5a27',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>Analyzing image for plastic waste...</span>
                </div>
              )}
              
              {error && (
                <div style={{ color: '#dc3545', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span>❌</span>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Detection Failed</div>
                    <div style={{ fontSize: '0.9em' }}>{error}</div>
                    <button
                      onClick={() => selectedImage && detectPlastic(selectedImage.file)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '0.8em',
                        marginTop: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Retry Detection
                    </button>
                  </div>
                </div>
              )}
              
              {results && results.success && !error && (
                <div style={{ color: '#28a745', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>✅</span>
                  <span>Detection completed successfully!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div>
          {results && results.success && (
            <>
              {/* Annotated Image */}
              {results.annotated_image && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  marginBottom: '20px'
                }}>
                  <h2 style={{ color: '#2d5a27', marginBottom: '15px' }}>Detection Results</h2>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={`data:image/jpeg;base64,${results.annotated_image}`}
                      alt="Detection Results"
                      style={{ 
                        width: '100%', 
                        borderRadius: '5px',
                        border: '2px solid #2d5a27'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      fontSize: '0.9em'
                    }}>
                      {results.detection_results.detections} plastic item{results.detection_results.detections !== 1 ? 's' : ''} detected
                    </div>
                  </div>
                </div>
              )}

              {/* Detection Summary */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ color: '#2d5a27', margin: '0' }}>Analysis Results</h2>
                  <button
                    onClick={downloadReport}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Export Report
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #ffebee, #ffcdd2)',
                    padding: '15px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#c62828' }}>
                      {results.detection_results.detections}
                    </div>
                    <div style={{ color: '#d32f2f', fontSize: '0.9em', fontWeight: '500' }}>
                      Plastic Items Detected
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #e8f5e8, #c8e6c9)',
                    padding: '15px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#2e7d32' }}>
                      {results.detection_results.confidence}
                    </div>
                    <div style={{ color: '#388e3c', fontSize: '0.9em', fontWeight: '500' }}>
                      Confidence Score
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ color: '#555', marginBottom: '10px' }}>Detected Plastic Types:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(results.detection_results.plastic_types || ['plastic']).map((type, index) => (
                      <span key={index} style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '5px 12px',
                        borderRadius: '15px',
                        fontSize: '0.9em',
                        fontWeight: '500'
                      }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Environmental Impact */}
              <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: '#2d5a27', marginBottom: '15px' }}>Environmental Impact</h3>
                
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>Pollution Severity:</span>
                    <span style={{
                      backgroundColor: results.detection_results.environmental_impact.severity === 'High' ? '#ffcdd2' : '#fff9c4',
                      color: results.detection_results.environmental_impact.severity === 'High' ? '#c62828' : '#f57f17',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.9em',
                      fontWeight: 'bold'
                    }}>
                      {results.detection_results.environmental_impact.severity}
                    </span>
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #bbdefb',
                  borderRadius: '8px',
                  padding: '15px'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Recommendation:</h4>
                  <p style={{ margin: '0', color: '#424242' }}>
                    {results.detection_results.environmental_impact.recommendation}
                  </p>
                </div>
              </div>

              {/* Action Items */}
              <div style={{
                background: 'linear-gradient(135deg, #2d5a27, #4caf50)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '15px' }}>Next Steps</h3>
                <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                  <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✅</span> Report location to local cleanup organizations
                  </li>
                  <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✅</span> Document and share findings
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✅</span> Plan cleanup intervention
                  </li>
                </ul>
              </div>
            </>
          )}
          
          {!selectedImage && !results && (
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4em', marginBottom: '15px' }}>🔍</div>
              <h3 style={{ color: '#666', marginBottom: '10px' }}>Ready to Detect Plastic Waste</h3>
              <p style={{ color: '#999' }}>Upload an image to start analyzing plastic pollution using your trained YOLOv8 model</p>
              
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                <small style={{ color: '#666' }}>
                  <strong>Make sure your Flask backend is running:</strong><br/>
                  Run <code style={{backgroundColor: '#e9ecef', padding: '2px 4px', borderRadius: '3px'}}>python app.py</code> in your backend directory
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginTop: '20px',
        textAlign: 'center',
        color: '#666'
      }}>
        <p style={{ margin: '0 0 5px 0' }}>Plastic Detection AI - Protecting our environment with technology</p>
        <p style={{ margin: '0', fontSize: '0.9em' }}>Built with YOLOv8 • Powered by Computer Vision</p>
      </footer>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }
          
          @media (max-width: 768px) {
            div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
          }
          
          code {
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
        `}
      </style>
    </div>
  );
};

export default PlasticDetectionApp;