import React, { useState } from 'react';

const ImageUploader = ({ onImageUpload, label = "Carica Immagine", accept = "image/*" }) => {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Converti il file in base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setPreview(base64);
        onImageUpload(base64);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Errore upload:', error);
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview(null);
    onImageUpload(null);
  };

  return (
    <div style={{
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      background: '#f9fafb'
    }}>
      <input
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        id={`file-upload-${Math.random()}`}
      />
      
      {!preview ? (
        <label 
          htmlFor={`file-upload-${Math.random()}`}
          style={{
            cursor: 'pointer',
            display: 'block'
          }}
        >
          <div style={{
            fontSize: '3rem',
            marginBottom: '12px',
            color: '#9ca3af'
          }}>
            📁
          </div>
          
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            {label}
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Clicca per selezionare un file
          </div>
          
          {uploading && (
            <div style={{
              marginTop: '12px',
              color: '#3b82f6'
            }}>
              Caricamento in corso...
            </div>
          )}
        </label>
      ) : (
        <div>
          <img 
            src={preview} 
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              borderRadius: '8px',
              marginBottom: '12px'
            }}
          />
          
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <label 
              htmlFor={`file-upload-${Math.random()}`}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cambia
            </label>
            
            <button
              onClick={removeImage}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Rimuovi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;