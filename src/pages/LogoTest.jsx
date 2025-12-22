import React from 'react';
import AdminHeader from '../Components/AdminHeader.jsx';
import LocationLogo from '../Components/LocationLogo.jsx';

const LogoTest = () => {
  const locations = ['cancano', 'arnoga', 'campo', 'campo-sportivo', 'valdidentro', 'superadmin'];
  
  return (
    <div style={{
      padding: '40px',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      minHeight: '100vh'
    }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '40px',
        color: '#1e293b',
        fontSize: '2.5rem',
        fontWeight: '800'
      }}>
        🎨 Test Loghi Sistema
      </h1>

      {/* Test AdminHeader */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '24px', color: '#374151' }}>📋 AdminHeader Component</h2>
        
        {locations.map(location => (
          <div key={location} style={{
            marginBottom: '24px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {location}
            </h3>
            <AdminHeader username={location} />
          </div>
        ))}
      </div>

      {/* Test LocationLogo */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '24px', color: '#374151' }}>🏷️ LocationLogo Component</h2>
        
        {locations.map(location => (
          <div key={location} style={{
            marginBottom: '32px',
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#64748b', 
              fontSize: '16px', 
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              📍 {location.replace('-', ' ')}
            </h3>
            
            <div style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Small</div>
                <LocationLogo locationName={location} size="small" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Medium</div>
                <LocationLogo locationName={location} size="medium" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Large</div>
                <LocationLogo locationName={location} size="large" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Header</div>
                <LocationLogo locationName={location} size="header" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Login</div>
                <div style={{ 
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'inline-block'
                }}>
                  <LocationLogo 
                    locationName={location} 
                    size="login" 
                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test Nuovo Logo Campo Sportivo */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '24px', color: '#374151' }}>🏟️ Nuovo Logo Campo Sportivo</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          {/* Logo originale */}
          <div style={{
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#64748b', fontSize: '14px' }}>Logo Originale</h3>
            <img 
              src="/logos/campo-sportivo.svg" 
              alt="Logo originale"
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                borderRadius: '8px',
                background: 'white',
                padding: '8px'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div style={{ display: 'none', fontSize: '48px' }}>❌</div>
          </div>

          {/* Logo nuovo */}
          <div style={{
            padding: '24px',
            background: '#f0fdf4',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #10b981'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#059669', fontSize: '14px', fontWeight: '600' }}>✨ Logo Nuovo</h3>
            <img 
              src="/logos/campo-sportivo-new.jpg" 
              alt="Logo nuovo"
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                borderRadius: '8px',
                background: 'white',
                padding: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div style={{ display: 'none', fontSize: '48px' }}>❌</div>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          borderRadius: '12px',
          border: '1px solid #3b82f6'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1d4ed8', fontSize: '16px', fontWeight: '600' }}>
            📋 Informazioni Logo
          </h4>
          <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>File:</strong> campo-sportivo-new.jpg
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Formato:</strong> JPG (ottimizzato per web)
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Design:</strong> Moderno con ruota bici e scritta "Bike Rental"
            </p>
            <p style={{ margin: '0' }}>
              <strong>Utilizzo:</strong> Login, Header, Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Pulsante per tornare alla dashboard */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)';
          }}
        >
          🏠 Torna alla Dashboard
        </button>
      </div>
    </div>
  );
};

export default LogoTest;