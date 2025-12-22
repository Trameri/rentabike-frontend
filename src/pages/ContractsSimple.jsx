import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import DocumentCapture from '../Components/DocumentCapture.jsx'
import { jwtDecode } from 'jwt-decode'

export default function ContractsSimple(){
  const [bikes,setBikes] = useState([])
  const [accs,setAccs] = useState([])
  const [items,setItems] = useState([])
  const [customer,setCustomer] = useState({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' })
  const [notes,setNotes] = useState('')
  const [status,setStatus] = useState('in-use')
  const [paymentMethod,setPaymentMethod] = useState(null)
  const [insuranceFlat,setIns] = useState(0)
  const [reservationPrepaid,setPrepaid] = useState(false)
  const [q,setQ] = useState('')
  const [user, setUser] = useState(null)

  useEffect(()=>{
    // Decodifica il token per ottenere info utente
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

  async function load(){
    try {
      const [b,a] = await Promise.all([
        api.get('/api/bikes', { params:{ q } }),
        api.get('/api/accessories', { params:{ q } })
      ])
      setBikes(b.data); setAccs(a.data);
    } catch(error) {
      console.error('Errore caricamento dati:', error)
    }
  }
  useEffect(()=>{ load() }, [])

  function addItem(kind, el){
    setItems(prev => [...prev, { kind, id: el._id, name: el.name }])
  }

  async function createContract(){
    try {
      const payload = {
        customer, items: items.map(it=>({ ...it, insurance: insuranceFlat>0, insuranceFlat })),
        notes, status, paymentMethod, reservationPrepaid
      }
      const { data } = await api.post('/api/contracts', payload)
      alert('Contratto creato: ' + data._id)
      setItems([]); setCustomer({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' }); setNotes(''); setStatus('in-use'); setPaymentMethod(null); setPrepaid(false);
    } catch(error) {
      alert('Errore creazione contratto: ' + (error.response?.data?.error || error.message))
    }
  }

  return (
    <div>
      {/* Header semplice */}
      <div style={{marginBottom: '32px'}}>
        <h1 style={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1e293b'
        }}>
          📋 Nuovo Contratto
        </h1>
        <p style={{margin: '4px 0 0 0', color: '#64748b'}}>
          Crea un nuovo contratto di noleggio
        </p>
      </div>

      {/* Ricerca */}
      <div style={{marginBottom: '20px'}}>
        <input 
          placeholder="Cerca bici/accessori..." 
          value={q} 
          onChange={e=>setQ(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px'
          }}
        />
        <button onClick={load} style={{marginLeft: '8px', padding: '12px 20px'}}>
          Cerca
        </button>
      </div>

      {/* Cliente */}
      <section style={{marginBottom:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <h3>Cliente</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginBottom:16}}>
          <input placeholder="Nome e Cognome" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} />
          <input placeholder="Telefono" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} />
        </div>
        
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <DocumentCapture 
            label="📄 Documento - Fronte"
            onCapture={(imageData) => setCustomer({...customer, idFrontUrl: imageData})}
          />
          <DocumentCapture 
            label="📄 Documento - Retro"
            onCapture={(imageData) => setCustomer({...customer, idBackUrl: imageData})}
          />
        </div>
      </section>

      {/* Bici e Accessori */}
      <section style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <h3>Bici ({bikes.length})</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, maxHeight: '400px', overflowY: 'auto'}}>
            {bikes.map(b=> (
              <div key={b._id} style={{border:'1px solid #ddd', borderRadius:8, padding:8}}>
                <div style={{fontWeight:600}}>{b.name}</div>
                <div style={{fontSize:12, color: '#666'}}>{b.barcode}</div>
                <div style={{fontSize:12, color: b.status === 'available' ? '#059669' : '#dc2626'}}>
                  {b.status === 'available' ? '✅ Disponibile' : '❌ Non disponibile'}
                </div>
                <button 
                  onClick={()=>addItem('bike', b)} 
                  disabled={b.status!=='available'}
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: b.status === 'available' ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: b.status === 'available' ? 'pointer' : 'not-allowed'
                  }}
                >
                  Aggiungi
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <h3>Accessori ({accs.length})</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, maxHeight: '400px', overflowY: 'auto'}}>
            {accs.map(a=> (
              <div key={a._id} style={{border:'1px solid #ddd', borderRadius:8, padding:8}}>
                <div style={{fontWeight:600}}>{a.name}</div>
                <div style={{fontSize:12, color: '#666'}}>{a.barcode}</div>
                <div style={{fontSize:12, color: a.status === 'available' ? '#059669' : '#dc2626'}}>
                  {a.status === 'available' ? '✅ Disponibile' : '❌ Non disponibile'}
                </div>
                <button 
                  onClick={()=>addItem('accessory', a)} 
                  disabled={a.status!=='available'}
                  style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: a.status === 'available' ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: a.status === 'available' ? 'pointer' : 'not-allowed'
                  }}
                >
                  Aggiungi
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Items selezionati */}
      {items.length > 0 && (
        <section style={{marginTop:16, padding:12, border:'2px solid #10b981', borderRadius:12, background: '#f0fdf4'}}>
          <h3 style={{color: '#059669'}}>📦 Items Selezionati ({items.length})</h3>
          <div style={{display:'flex', gap:8, flexWrap: 'wrap'}}>
            {items.map((item, index) => (
              <div key={index} style={{
                background: 'white',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>{item.kind === 'bike' ? '🚲' : '🎒'}</span>
                <span style={{fontWeight: 600}}>{item.name}</span>
                <button
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Riepilogo */}
      <section style={{marginTop:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <h3>Riepilogo</h3>
        <div style={{marginBottom:8}}>Articoli: {items.length}</div>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap: 'wrap', marginBottom: 16}}>
          <label>Assicurazione flat €</label>
          <input type="number" value={insuranceFlat} onChange={e=>setIns(Number(e.target.value)||0)} style={{width:120}} />
          <label>Stato</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="in-use">In uso</option>
            <option value="reserved">Prenotata</option>
          </select>
          <label>Pagamento</label>
          <select value={paymentMethod||''} onChange={e=>setPaymentMethod(e.target.value||null)}>
            <option value="">Seleziona...</option>
            <option value="cash">Contanti</option>
            <option value="card">Carta</option>
            <option value="link">Link</option>
          </select>
          <label><input type="checkbox" checked={reservationPrepaid} onChange={e=>setPrepaid(e.target.checked)} /> Prenotazione già pagata</label>
        </div>
        <textarea placeholder="Note" value={notes} onChange={e=>setNotes(e.target.value)} style={{width:'100%', height:80, marginBottom:16}} />
        <div>
          <button 
            onClick={createContract} 
            disabled={items.length===0 || !customer.name}
            style={{
              padding: '12px 24px',
              background: items.length > 0 && customer.name ? '#10b981' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: items.length > 0 && customer.name ? 'pointer' : 'not-allowed'
            }}
          >
            Crea contratto
          </button>
        </div>
      </section>
    </div>
  )
}