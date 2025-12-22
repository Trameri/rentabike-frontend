import React, { useState, useEffect } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
        if (decoded.role !== 'superadmin') {
          alert('❌ Accesso negato. Solo i superadmin possono accedere a questa sezione.')
          return
        }
      } catch (e) {
        console.error('Errore decodifica token:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadUsers()
    }
  }, [user])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/users')
      setUsers(response.data.filter(u => u.role !== 'superadmin')) // Nascondi altri superadmin
    } catch (error) {
      console.error('Errore caricamento utenti:', error)
      alert('❌ Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      alert('❌ Inserisci entrambe le password')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('❌ Le password non coincidono')
      return
    }

    if (newPassword.length < 6) {
      alert('❌ La password deve essere di almeno 6 caratteri')
      return
    }

    try {
      await api.put(`/api/users/${editingUser._id}/password`, {
        newPassword: newPassword
      })
      
      alert('✅ Password cambiata con successo!')
      setEditingUser(null)
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
    } catch (error) {
      console.error('Errore cambio password:', error)
      alert('❌ Errore nel cambio password')
    }
  }

  const resetForm = () => {
    setEditingUser(null)
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
  }

  if (user?.role !== 'superadmin') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '64px' }}>🚫</div>
        <h2 style={{ color: '#ef4444' }}>Accesso Negato</h2>
        <p>Solo i superadmin possono accedere a questa sezione.</p>
      </div>
    )
  }

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
          Caricamento utenti...
        </p>
      </div>
    )
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
            padding: '20px',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <LocationLogo 
              locationName="superadmin"
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
              👥 Gestione Utenti
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Gestisci password e permessi degli utenti
            </p>
          </div>
        </div>
      </div>

      {/* Lista Utenti */}
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
          🔐 Utenti del Sistema
        </h2>

        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {users.map(userItem => (
            <div key={userItem._id} style={{
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                {/* Logo della location */}
                <div style={{
                  background: 'white',
                  borderRadius: '50%',
                  padding: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <LocationLogo 
                    locationName={userItem.location?.name || userItem.username}
                    size="medium"
                  />
                </div>

                <div>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    textTransform: 'capitalize'
                  }}>
                    {userItem.username}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    <span>
                      <strong>Ruolo:</strong> {userItem.role}
                    </span>
                    {userItem.location && (
                      <span>
                        <strong>Location:</strong> {userItem.location.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(userItem)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                🔑 Cambia Password
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Cambio Password */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <LocationLogo 
                locationName={editingUser.location?.name || editingUser.username}
                size="medium"
              />
              <div>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1e293b'
                }}>
                  Cambia Password
                </h3>
                <p style={{
                  margin: 0,
                  color: '#64748b',
                  textTransform: 'capitalize'
                }}>
                  Utente: {editingUser.username}
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Nuova Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Inserisci nuova password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Conferma Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Conferma nuova password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                />
                <label htmlFor="showPassword" style={{
                  fontSize: '14px',
                  color: '#64748b',
                  cursor: 'pointer'
                }}>
                  Mostra password
                </label>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px'
              }}>
                <button
                  onClick={handlePasswordChange}
                  disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                  style={{
                    flex: 1,
                    background: (!newPassword || !confirmPassword || newPassword !== confirmPassword) ? 
                      '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (!newPassword || !confirmPassword || newPassword !== confirmPassword) ? 
                      'not-allowed' : 'pointer'
                  }}
                >
                  ✅ Cambia Password
                </button>

                <button
                  onClick={resetForm}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}