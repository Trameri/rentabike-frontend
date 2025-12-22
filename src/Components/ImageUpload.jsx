import React, { useState, useRef } from 'react';

const ImageUpload = ({ 
  value, 
  onChange, 
  placeholder = "Carica immagine...", 
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  style = {},
  showPreview = true,
  previewSize = 100
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    setError('');
    setUploading(true);

    try {
      // Validazione tipo file
      if (!acceptedTypes.includes(file.type)) {
        throw new Error(`Tipo file non supportato. Usa: ${acceptedTypes.join(', ')}`);
      }

      // Validazione dimensione
      if (file.size > maxSize) {
        throw new Error(`File troppo grande. Massimo ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Converti in base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        onChange(base64);
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Errore nella lettura del file');
        setUploading(false);
      };
      reader.readAsDataURL(file);

    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearImage = () => {
    onChange('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      {/* Area di upload */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? '#3b82f6' : error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#eff6ff' : error ? '#fef2f2' : '#f9fafb',
          transition: 'all 0.2s ease',
          minHeight: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {uploading ? (
          <>
            <div style={{ fontSize: '24px' }}>⏳</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Caricamento in corso...
            </div>
          </>
        ) : value ? (
          <>
            <div style={{ fontSize: '24px', color: '#10b981' }}>✅</div>
            <div style={{ fontSize: '14px', color: '#059669', fontWeight: '500' }}>
              Immagine caricata
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️ Rimuovi
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '24px', color: '#6b7280' }}>📷</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {placeholder}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Clicca o trascina qui il file
            </div>
          </>
        )}
      </div>

      {/* Input file nascosto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Messaggio di errore */}
      {error && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Anteprima immagine */}
      {showPreview && value && !uploading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px'
        }}>
          <img
            src={value}
            alt="Anteprima"
            style={{
              width: `${previewSize}px`,
              height: `${previewSize}px`,
              objectFit: 'cover',
              borderRadius: '6px',
              border: '2px solid #e5e7eb'
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#059669' }}>
              ✅ Immagine pronta
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              Dimensioni: {previewSize}x{previewSize}px
            </div>
          </div>
        </div>
      )}

      {/* Info sui formati supportati */}
      <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center' }}>
        Formati supportati: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • 
        Max {Math.round(maxSize / 1024 / 1024)}MB
      </div>
    </div>
  );
};

export default ImageUpload;