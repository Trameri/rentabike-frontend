import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginTest(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e){
    e.preventDefault()
    setError('')
    
    try{
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        localStorage.setItem('token', data.token)
        navigate('/dashboard')
      } else {
        setError(data.error || 'Errore di login')
      }
    }catch(err){
      console.error('Errore:', err)
      setError('Errore di connessione al server')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '300px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{textAlign: 'center', marginBottom: '20px'}}>
          🚲 Rent a Bike
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: '15px'}}>
            <label>Username:</label>
            <input 
              type="text"
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              required
            />
          </div>
          
          <div style={{marginBottom: '15px'}}>
            <label>Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              required
            />
          </div>
          
          {error && (
            <div style={{
              color: 'red',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            style={{
              width: '100%',
              padding: '10px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Accedi
          </button>
        </form>
        
        <div style={{
          marginTop: '15px',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          Test: cancano / cancano123
        </div>
      </div>
    </div>
  )
}