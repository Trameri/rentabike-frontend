import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function SystemDiagnostic(){
  const [user, setUser] = useState(null)
  const [tests, setTests] = useState({
    auth: { status: 'pending', message: 'Test in corso...' },
    api: { status: 'pending', message: 'Test in corso...' },
    bikes: { status: 'pending', message: 'Test in corso...' },
    accessories: { status: 'pending', message: 'Test in corso...' },
    contracts: { status: 'pending', message: 'Test in corso...' },
    locations: { status: 'pending', message: 'Test in corso...' }
  })

  useEffect(() => {
    runDiagnostics()
  }, [])

  const updateTest = (testName, status, message, data = null) => {
    setTests(prev => ({
      ...prev,
      [testName]: { status, message, data }
    }))
  }

  const runDiagnostics = async () => {
    // Test 1: Autenticazione
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const decoded = jwtDecode(token)
        setUser(decoded)
        updateTest('auth', 'success', `Utente autenticato: ${decoded.username} (${decoded.role})`, decoded)
      } else {
        updateTest('auth', 'error', 'Nessun token trovato')
        return
      }
    } catch (e) {
      updateTest('auth', 'error', `Errore decodifica token: ${e.message}`)
      return
    }

    // Test 2: API Base
    try {
      const response = await api.get('/auth/me')
      updateTest('api', 'success', 'API funzionante', response)
    } catch (e) {
      updateTest('api', 'error', `Errore API: ${e.message}`)
    }

    // Test 3: Bici
    try {
      const response = await api.get('/api/bikes')
      updateTest('bikes', 'success', `${response.data.length} bici caricate`, response.data)
    } catch (e) {
      updateTest('bikes', 'error', `Errore caricamento bici: ${e.message}`)
    }

    // Test 4: Accessori
    try {
      const response = await api.get('/api/accessories')
      updateTest('accessories', 'success', `${response.data.length} accessori caricati`, response.data)
    } catch (e) {
      updateTest('accessories', 'error', `Errore caricamento accessori: ${e.message}`)
    }

    // Test 5: Contratti
    try {
      const response = await api.get('/api/contracts')
      updateTest('contracts', 'success', `${response.data.length} contratti caricati`, response.data)
    } catch (e) {
      updateTest('contracts', 'error', `Errore caricamento contratti: ${e.message}`)
    }

    // Test 6: Location (solo per superadmin)
    try {
      const response = await api.get('/api/locations')
      updateTest('locations', 'success', `${response.data.length} location caricate`, response.data)
    } catch (e) {
      updateTest('locations', 'warning', `Errore caricamento location: ${e.message}`)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'pending': return '⏳'
      default: return '❓'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'pending': return '#6b7280'
      default: return '#6b7280'
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            padding: '16px',
            backdropFilter: 'blur(10px)'
          }}>
            <LocationLogo 
              locationName={user?.location?.name || user?.username} 
              size="large"
            />
          </div>
          <div>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '2.5rem',
              fontWeight: '800'
            }}>
              🔧 Diagnostica Sistema
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Verifica dello stato di tutte le funzionalità
            </p>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div style={{
        display: 'grid',
        gap: '20px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
      }}>
        {Object.entries(tests).map(([testName, test]) => (
          <div key={testName} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: `2px solid ${getStatusColor(test.status)}20`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>
                {getStatusIcon(test.status)}
              </span>
              <h3 style={{
                margin: 0,
                color: '#374151',
                textTransform: 'capitalize'
              }}>
                {testName === 'auth' ? 'Autenticazione' :
                 testName === 'api' ? 'API Base' :
                 testName === 'bikes' ? 'Gestione Bici' :
                 testName === 'accessories' ? 'Gestione Accessori' :
                 testName === 'contracts' ? 'Gestione Contratti' :
                 testName === 'locations' ? 'Gestione Location' : testName}
              </h3>
            </div>
            
            <p style={{
              margin: '0 0 12px 0',
              color: getStatusColor(test.status),
              fontWeight: '600'
            }}>
              {test.message}
            </p>

            {test.data && (
              <details style={{ marginTop: '12px' }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  Mostra dettagli
                </summary>
                <pre style={{
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  marginTop: '8px'
                }}>
                  {JSON.stringify(test.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{
        marginTop: '32px',
        display: 'flex',
        gap: '12px',
        justifyContent: 'center'
      }}>
        <button
          onClick={runDiagnostics}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          🔄 Ripeti Test
        </button>
        
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          📊 Vai alla Dashboard
        </button>
      </div>

      {/* System Info */}
      {user && (
        <div style={{
          marginTop: '32px',
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
            ℹ️ Informazioni Sistema
          </h3>
          <div style={{
            display: 'grid',
            gap: '8px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <div><strong>Utente:</strong> {user.username}</div>
            <div><strong>Ruolo:</strong> {user.role}</div>
            <div><strong>Location:</strong> {user.location?.name || 'N/A'}</div>
            <div><strong>Frontend:</strong> http://localhost:5173</div>
            <div><strong>Backend:</strong> http://localhost:4000</div>
            <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}