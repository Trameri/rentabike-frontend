import React from 'react'

const LocationLogo = ({ locationName, size = 'medium', style = {} }) => {
  // Mappa i nomi delle location ai file dei loghi
  const logoMap = {
    'cancano': '/logos/Cancano.png',
    'arnoga': '/logos/Arnoga.png',
    'campo-sportivo': '/logos/campo-sportivo-new.jpg',
    'campo sportivo': '/logos/campo-sportivo-new.jpg',
    'campo': '/logos/campo-sportivo-new.jpg',
    'superadmin': '/logos/superadmin.png',
    'valdidentro': '/logos/superadmin.png'
  }

  // Normalizza il nome della location (prova prima con spazi, poi con trattini)
  const normalizedName = locationName?.toLowerCase()
  const normalizedNameWithDashes = normalizedName?.replace(/\s+/g, '-')
  const logoPath = logoMap[normalizedName] || logoMap[normalizedNameWithDashes]

  // Dimensioni basate sulla prop size
  const sizes = {
    small: { width: '40px', height: '40px' },
    medium: { width: '56px', height: '56px' },
    large: { width: '72px', height: '72px' },
    header: { width: '88px', height: '88px' },
    login: { width: '140px', height: '140px' }
  }

  const logoSize = sizes[size] || sizes.medium

  // Stili del contenitore circolare
  const containerStyle = {
    ...logoSize,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    border: '3px solid #ffffff',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    ...style
  }

  // Stili per l'immagine
  const imageStyle = {
    width: '75%',
    height: '75%',
    objectFit: 'contain',
    borderRadius: '50%',
    transition: 'transform 0.3s ease'
  }

  // Stili per il fallback emoji
  const fallbackStyle = {
    fontSize: size === 'login' ? '70px' : 
              size === 'header' ? '44px' : 
              size === 'large' ? '36px' :
              size === 'medium' ? '28px' : '20px',
    color: '#64748b',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  }

  // Se non c'è logo, mostra emoji di fallback
  if (!logoPath) {
    return (
      <div 
        style={containerStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)'
          e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        <span style={fallbackStyle}>🚲</span>
      </div>
    )
  }

  return (
    <div 
      style={containerStyle}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.05)'
        e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)'
        const img = e.target.querySelector('img')
        if (img) img.style.transform = 'scale(1.1)'
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)'
        e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
        const img = e.target.querySelector('img')
        if (img) img.style.transform = 'scale(1)'
      }}
    >
      <img 
        src={logoPath}
        alt={`Logo ${locationName}`}
        style={imageStyle}
        onError={(e) => {
          // Se l'immagine non carica, nasconde l'immagine e mostra il fallback
          e.target.style.display = 'none'
          e.target.nextElementSibling.style.display = 'flex'
        }}
      />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={fallbackStyle}>🚲</span>
      </div>
    </div>
  )
}

export default LocationLogo