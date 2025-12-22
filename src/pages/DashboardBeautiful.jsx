import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function DashboardBeautiful(){
  const [summary, setSummary] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if(token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
      } catch(e) {
        console.error('Errore decodifica token:', e)
      }
    }
  }, [])

  useEffect(()=>{
    if(!user) return
    
    (async()=>{
      try{
        setLoading(true)
        const { data } = await api.get('/api/reports/summary')
        setSummary(data)
      }catch(e){
        console.error('Errore caricamento dati:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontSize: '18px', color: '#6b7280' }}>
          Caricamento dashboard...
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header con logo e benvenuto */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Elementi decorativi */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Logo della location */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            padding: '20px',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <LocationLogo 
              locationName={user?.location?.name || user?.username} 
              size="large"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '2.5rem',
              fontWeight: '800',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Benvenuto! 👋
            </h1>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '16px',
              opacity: 0.95
            }}>
              <div>
                <strong>Utente:</strong> {user?.username}
              </div>
              <div>
                <strong>Ruolo:</strong> {user?.role}
              </div>
              {user?.location && (
                <div>
                  <strong>Location:</strong> {user.location.name}
                </div>
              )}
            </div>
          </div>

          <div style={{
            textAlign: 'right',
            fontSize: '14px',
            opacity: 0.9
          }}>
            <div>{new Date().toLocaleDateString('it-IT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>
              {new Date().toLocaleTimeString('it-IT', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '32px',
            borderRadius: '20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.2
            }}>🚲</div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              marginBottom: '8px',
              position: 'relative',
              zIndex: 2
            }}>
              {summary.totalBikes || 0}
            </div>
            <div style={{ 
              fontSize: '14px', 
              opacity: 0.9,
              fontWeight: '600',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Bici Totali
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '32px',
            borderRadius: '20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.2
            }}>✅</div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              marginBottom: '8px',
              position: 'relative',
              zIndex: 2
            }}>
              {summary.availableBikes || 0}
            </div>
            <div style={{ 
              fontSize: '14px', 
              opacity: 0.9,
              fontWeight: '600',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Disponibili
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '32px',
            borderRadius: '20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.2
            }}>🚴</div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              marginBottom: '8px',
              position: 'relative',
              zIndex: 2
            }}>
              {summary.bikesInUse || 0}
            </div>
            <div style={{ 
              fontSize: '14px', 
              opacity: 0.9,
              fontWeight: '600',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              In Uso
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            padding: '32px',
            borderRadius: '20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.2
            }}>📋</div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              marginBottom: '8px',
              position: 'relative',
              zIndex: 2
            }}>
              {summary.activeContracts || 0}
            </div>
            <div style={{ 
              fontSize: '14px', 
              opacity: 0.9,
              fontWeight: '600',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Contratti Attivi
            </div>
          </div>
        </div>
      )}

      {/* Azioni Rapide */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <h2 style={{ 
          margin: '0 0 24px 0',
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          🎯 Azioni Rapide
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {[
            { icon: '📋', text: 'Nuovo Contratto', color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
            { icon: '🚴', text: 'Gestisci Bici', color: '#10b981', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
            { icon: '↩️', text: 'Rientri', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
            { icon: '📈', text: 'Report', color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
            { icon: '🔧', text: 'Accessori', color: '#ef4444', bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
            { icon: '📊', text: 'Statistiche', color: '#06b6d4', bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }
          ].map((action, index) => (
            <button
              key={index}
              style={{
                background: action.bg,
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
                boxShadow: `0 4px 12px ${action.color}40`,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = `0 8px 20px ${action.color}60`
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = `0 4px 12px ${action.color}40`
              }}
            >
              <span style={{ fontSize: '24px' }}>{action.icon}</span>
              {action.text}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}