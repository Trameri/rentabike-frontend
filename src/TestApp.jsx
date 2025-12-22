import React from 'react'

export default function TestApp(){
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1>🚲 Rent a Bike</h1>
        <p>Sistema funzionante!</p>
        <p style={{fontSize: '16px', color: '#666'}}>
          Se vedi questo messaggio, React funziona correttamente.
        </p>
      </div>
    </div>
  )
}