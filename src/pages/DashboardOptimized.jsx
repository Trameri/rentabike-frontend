import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function DashboardOptimized(){
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [superadminStats, setSuperadminStats] = useState(null)
  const [user, setUser] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeContracts, setActiveContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [systemInfo, setSystemInfo] = useState(null)

  // Memoized notification function
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Memoized user effect
  useEffect(() => {
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

  // Optimized data loading with error handling
  const loadData = useCallback(async () => {
    if(!user) return
    
    setLoading(true)
    const promises = []
    
    try {
      // Load data in parallel for better performance
      if(user.role === 'superadmin') {
        promises.push(
          api.get('/api/reports/superadmin-stats').then(({ data }) => {
            setSuperadminStats(data)
          }).catch(error => {
            console.error('Errore caricamento stats superadmin:', error)
            setSuperadminStats({
              totals: { revenue: 0, closedContracts: 0, activeContracts: 0, totalContracts: 0 },
              locations: []
            })
          })
        )
      } else {
        promises.push(
          api.get('/api/reports/summary').then(({ data }) => {
            setSummary(data)
          }).catch(error => {
            console.error('Errore caricamento summary:', error)
            setSummary({ total: 0, count: 0 })
          })
        )
      }

      // Load active contracts
      promises.push(
        api.get('/api/contracts', {
          params: { status: 'in-use', limit: 10 }
        }).then(response => {
          setActiveContracts(response.data || [])
        }).catch(error => {
          console.error('Errore caricamento contratti attivi:', error)
          setActiveContracts([])
        })
      )

      // Load system info
      promises.push(
        api.get('/api/system/info').then(response => {
          setSystemInfo(response.data)
        }).catch(error => {
          console.error('Errore caricamento info sistema:', error)
          setSystemInfo({
            uptime: 'N/A',
            version: '1.0.0',
            status: 'online'
          })
        })
      )

      await Promise.allSettled(promises)
      setLastUpdate(new Date())
      showNotification('✅ Dati aggiornati con successo', 'success')
    } catch(e) {
      console.error('Errore generale caricamento dati:', e)
      showNotification('❌ Errore durante il caricamento dei dati', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showNotification])

  // Load data when user changes
  useEffect(() => {
    if(user) {
      loadData()
    }
  }, [user, loadData])

  // Optimized auto-refresh with cleanup
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(loadData, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh, user, loadData])

  // Memoized keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'r':
            event.preventDefault()
            loadData()
            showNotification('🔄 Dati aggiornati manualmente', 'info')
            break
          case '1':
            event.preventDefault()
            navigate('/contracts')
            break
          case '2':
            event.preventDefault()
            navigate('/contract-manager')
            break
          case '3':
            event.preventDefault()
            navigate('/bikes')
            break
          case '4':
            event.preventDefault()
            navigate('/reports')
            break
          default:
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [navigate, loadData, showNotification])

  // Memoized quick actions
  const quickActions = useMemo(() => [
    { 
      path: '/contracts', 
      icon: '📝', 
      text: 'Nuovo Contratto', 
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      shortcut: 'Ctrl+1'
    },
    { 
      path: '/contract-manager', 
      icon: '⚙️', 
      text: 'Gestisci Contratti', 
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      shortcut: 'Ctrl+2'
    },
    { 
      path: '/bikes', 
      icon: '🚴', 
      text: 'Gestisci Bici', 
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shortcut: 'Ctrl+3'
    },
    { 
      path: '/reports', 
      icon: '📈', 
      text: 'Report', 
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      shortcut: 'Ctrl+4'
    }
  ], [])

  // Memoized stats cards for superadmin
  const superadminStatsCards = useMemo(() => {
    if (!superadminStats) return null
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="💰"
          value={`€${superadminStats.totals?.revenue?.toFixed(2) || '0.00'}`}
          label="Ricavi Totali"
          color="#10b981"
        />
        <StatCard
          icon="📋"
          value={superadminStats.totals?.totalContracts || 0}
          label="Contratti Totali"
          color="#3b82f6"
        />
        <StatCard
          icon="✅"
          value={superadminStats.totals?.closedContracts || 0}
          label="Contratti Chiusi"
          color="#8b5cf6"
        />
        <StatCard
          icon="🔄"
          value={superadminStats.totals?.activeContracts || 0}
          label="Contratti Attivi"
          color="#f59e0b"
        />
      </div>
    )
  }, [superadminStats])

  // Memoized stats cards for regular users
  const regularStatsCards = useMemo(() => {
    if (!summary) return null
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="🚲"
          value={summary.totalBikes || 0}
          label="Bici Totali"
          color="#3b82f6"
        />
        <StatCard
          icon="✅"
          value={summary.availableBikes || 0}
          label="Disponibili"
          color="#10b981"
        />
        <StatCard
          icon="🚴"
          value={summary.bikesInUse || 0}
          label="In Uso"
          color="#f59e0b"
        />
        <StatCard
          icon="📋"
          value={summary.activeContracts || 0}
          label="Contratti Attivi"
          color="#8b5cf6"
        />
      </div>
    )
  }, [summary])

  if(!user) return <LoadingSpinner text="Caricamento dashboard..." />

  return (
    <div style={{
      padding: '24px',
      background: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'success' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : notification.type === 'error'
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 10000,
          fontWeight: '600',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <HeaderSection 
        user={user}
        lastUpdate={lastUpdate}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        loading={loading}
        onRefresh={loadData}
      />

      {/* Stats Cards */}
      {user.role === 'superadmin' ? superadminStatsCards : regularStatsCards}

      {/* Quick Actions */}
      <QuickActionsSection actions={quickActions} navigate={navigate} />

      {/* Active Contracts */}
      {activeContracts.length > 0 && (
        <ActiveContractsSection contracts={activeContracts} />
      )}

      {/* System Info */}
      {systemInfo && (
        <SystemInfoSection info={systemInfo} />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Memoized components for better performance
const LoadingSpinner = React.memo(({ text }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #f3f4f6',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{color: '#6b7280'}}>{text}</p>
  </div>
))

const StatCard = React.memo(({ icon, value, label, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)'
    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
  }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{icon}</div>
    <div style={{ 
      fontSize: '2rem', 
      fontWeight: '700', 
      color: color,
      marginBottom: '4px' 
    }}>
      {value}
    </div>
    <div style={{ 
      fontSize: '14px', 
      color: '#6b7280',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label}
    </div>
  </div>
))

const HeaderSection = React.memo(({ user, lastUpdate, autoRefresh, setAutoRefresh, loading, onRefresh }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '16px'
    }}>
      <LocationLogo 
        locationName={user?.location?.name || user?.username} 
        size="header"
        style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '3px solid white'
        }}
      />
      <div style={{flex: 1}}>
        <h1 style={{
          margin: 0,
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          ⚡ Dashboard Ottimizzata
          {user.role === 'superadmin' && <span style={{fontSize: '1.5rem'}}>👑</span>}
        </h1>
        <p style={{margin: '4px 0 0 0', color: '#64748b', fontSize: '16px'}}>
          {user.role === 'superadmin' 
            ? 'Panoramica completa di tutti i punti noleggio' 
            : `Benvenuto ${user.username} - Performance ottimizzate`
          }
        </p>
        {user?.location?.name && user?.role !== 'superadmin' && (
          <div style={{
            marginTop: '8px',
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-block',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            📍 {user.location.name}
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
          {lastUpdate && (
            <>
              <div>Ultimo aggiornamento:</div>
              <div style={{fontWeight: '600'}}>{lastUpdate.toLocaleTimeString('it-IT')}</div>
            </>
          )}
        </div>
        
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: autoRefresh ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {autoRefresh ? '🔄 Auto-refresh' : '⏸️ Manuale'}
        </button>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading 
              ? '#9ca3af' 
              : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Caricamento...
            </>
          ) : (
            <>
              ⚡ Aggiorna Ora
              <span style={{
                fontSize: '10px',
                opacity: '0.7',
                marginLeft: '8px'
              }}>
                Ctrl+R
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>
))

const QuickActionsSection = React.memo(({ actions, navigate }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  }}>
    {actions.map((action, index) => (
      <button
        key={index}
        onClick={() => navigate(action.path)}
        style={{
          background: action.gradient,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '16px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: `0 4px 12px ${action.color}30`,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)'
          e.target.style.boxShadow = `0 8px 24px ${action.color}40`
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)'
          e.target.style.boxShadow = `0 4px 12px ${action.color}30`
        }}
      >
        {action.icon} {action.text}
        <span style={{
          fontSize: '10px',
          opacity: '0.7',
          marginLeft: '8px'
        }}>
          {action.shortcut}
        </span>
      </button>
    ))}
  </div>
))

const ActiveContractsSection = React.memo(({ contracts }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  }}>
    <h2 style={{
      margin: '0 0 16px 0',
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      🔄 Contratti Attivi ({contracts.length})
    </h2>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '12px'
    }}>
      {contracts.slice(0, 6).map(contract => (
        <div key={contract.id} style={{
          background: '#f8fafc',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {contract.customer?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {contract.items?.length || 0} item(i) • {contract.status}
          </div>
        </div>
      ))}
    </div>
  </div>
))

const SystemInfoSection = React.memo(({ info }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  }}>
    <h2 style={{
      margin: '0 0 16px 0',
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      🖥️ Informazioni Sistema
    </h2>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    }}>
      <div>
        <div style={{ fontWeight: '600', color: '#374151' }}>Stato</div>
        <div style={{ 
          color: info.status === 'online' ? '#10b981' : '#ef4444',
          fontWeight: '600'
        }}>
          {info.status === 'online' ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>
      <div>
        <div style={{ fontWeight: '600', color: '#374151' }}>Versione</div>
        <div style={{ color: '#6b7280' }}>{info.version}</div>
      </div>
      <div>
        <div style={{ fontWeight: '600', color: '#374151' }}>Uptime</div>
        <div style={{ color: '#6b7280' }}>{info.uptime}</div>
      </div>
    </div>
  </div>
))