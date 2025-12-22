import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'

export default function DashboardSimple(){
  const [summary, setSummary] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    // Decodifica il token per ottenere info utente
    const token = localStorage.getItem('token')
    if(token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
        console.log('User decoded:', decoded)
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
        console.log('Summary loaded:', data)
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
        fontSize: '18px'
      }}>
        Caricamento dashboard...
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
          🚲 Dashboard - Rent a Bike
        </h1>
        
        {user && (
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Benvenuto!</h3>
            <p style={{ margin: '4px 0' }}>
              <strong>Utente:</strong> {user.username}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Ruolo:</strong> {user.role}
            </p>
            {user.location && (
              <p style={{ margin: '4px 0' }}>
                <strong>Location:</strong> {user.location.name}
              </p>
            )}
          </div>
        )}
      </div>

      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
              {summary.totalBikes || 0}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              BICI TOTALI
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
              {summary.availableBikes || 0}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              DISPONIBILI
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
              {summary.bikesInUse || 0}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              IN USO
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
              {summary.activeContracts || 0}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              CONTRATTI ATTIVI
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 16px 0' }}>🎯 Azioni Rapide</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <button style={{
            padding: '12px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📋 Nuovo Contratto
          </button>
          
          <button style={{
            padding: '12px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            🚴 Gestisci Bici
          </button>
          
          <button style={{
            padding: '12px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ↩️ Rientri
          </button>
          
          <button style={{
            padding: '12px 16px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📈 Report
          </button>
        </div>
      </div>
    </div>
  )
}