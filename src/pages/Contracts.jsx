import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import DocumentCapture from '../Components/DocumentCapture.jsx'
import DocumentCaptureWithOCR from '../Components/DocumentCaptureWithOCR.jsx'
import DocumentScanner from '../Components/DocumentScanner.jsx'
import BarcodeScanner from '../Components/BarcodeScanner.jsx'
import BarcodeGenerator from '../Components/BarcodeGenerator.jsx'
import PriceCalculator from '../Components/PriceCalculator.jsx'
import ContractMirror from '../Components/ContractMirror.jsx'
import BikeSwapper from '../Components/BikeSwapper.jsx'
import BikeReturn from '../Components/BikeReturn.jsx'
import ContractClosure from '../Components/ContractClosure.jsx'
import PaymentModal from '../Components/PaymentModal.jsx'
import LocationLogo from '../Components/LocationLogo.jsx'
import { jwtDecode } from 'jwt-decode'

export default function Contracts(){
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

  const [showPriceCalculator, setShowPriceCalculator] = useState(true)
  const [showContractMirror, setShowContractMirror] = useState(true)
  const [selectedContract, setSelectedContract] = useState(null)
  const [showBikeSwapper, setShowBikeSwapper] = useState(false)
  const [showBikeReturn, setShowBikeReturn] = useState(false)
  const [showContractClosure, setShowContractClosure] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16))
  const [endDate, setEndDate] = useState('')
  const [calculatedPrice, setCalculatedPrice] = useState(null)
  
  // Stati per gestione contratti esistenti
  const [existingContracts, setExistingContracts] = useState([])
  const [showExistingContracts, setShowExistingContracts] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedContractForPayment, setSelectedContractForPayment] = useState(null)
  const [paymentMethodSelected, setPaymentMethodSelected] = useState('cash')
  const [paymentNotesInput, setPaymentNotesInput] = useState('')
  const [finalAmountInput, setFinalAmountInput] = useState('')

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
    const [b,a] = await Promise.all([
      api.get('/api/bikes', { params:{ q } }),
      api.get('/api/accessories', { params:{ q } })
    ])
    setBikes(b.data); setAccs(a.data);
  }
  useEffect(()=>{ load() }, [])

  async function createContract(){
    try {
      // Calcola assicurazione totale dalle singole bici
      const totalInsurance = items.reduce((sum, item) => {
        return sum + (item.insurance ? (item.insuranceFlat || 5) : 0);
      }, 0);
      
      const payload = {
        customer, 
        items: items.map(it => ({ 
          ...it, 
          insurance: it.insurance || false, 
          insuranceFlat: it.insurance ? (it.insuranceFlat || 5) : 0 
        })),
        notes, 
        status, 
        paymentMethod, 
        reservationPrepaid,
        startAt: startDate,
        endAt: endDate || null,
        calculatedPrice: calculatedPrice,
        totalInsurance: totalInsurance
      }
      
      console.log('Creazione contratto:', payload);
      const { data } = await api.post('/api/contracts', payload)
      alert('✅ Contratto creato con successo!\nID: ' + data._id + '\nAssicurazione totale: €' + totalInsurance)
      
      // Reset form
      setItems([]); 
      setCustomer({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' }); 
      setNotes(''); 
      setStatus('in-use'); 
      setPaymentMethod(null); 
      setPrepaid(false);
      setStartDate(new Date().toISOString().slice(0, 16)); 
      setEndDate(''); 
      setCalculatedPrice(null);
      
      // Ricarica dati
      await load();
      
    } catch (error) {
      console.error('Errore creazione contratto:', error);
      alert('❌ Errore nella creazione del contratto: ' + (error.response?.data?.error || error.message));
    }
  }

  // Gestione scansione barcode per aggiungere bici/accessori
  // Funzione per aggiungere item al contratto
  const addItem = (kind, item) => {
    // Controlla se l'item è già presente
    const exists = items.find(i => i.id === item._id && i.kind === kind);
    if (exists) {
      alert('Item già aggiunto al contratto');
      return;
    }
    
    // Aggiungi l'item alla lista con prezzi originali salvati
    setItems(prev => [...prev, {
      id: item._id,
      kind: kind,
      name: item.name,
      barcode: item.barcode,
      priceHourly: item.priceHourly,
      priceDaily: item.priceDaily,
      originalPriceHourly: item.priceHourly, // Salva prezzo originale
      originalPriceDaily: item.priceDaily,   // Salva prezzo originale
      insurance: false,
      insuranceFlat: 0
    }]);
  };

  // Funzione per rimuovere item dal contratto
  const removeItem = (itemId, kind) => {
    setItems(prev => prev.filter(item => !(item.id === itemId && item.kind === kind)));
  };

  // Funzioni per gestire contratti esistenti
  const loadExistingContracts = async () => {
    try {
      const response = await api.get('/api/contracts');
      setExistingContracts(response.data);
    } catch (error) {
      console.error('Errore caricamento contratti:', error);
    }
  };

  // Funzione per calcolare il prezzo del contratto con NUOVA LOGICA TARIFFE
  const calculateBill = (contract) => {
    if (!contract || !contract.items) return { finalTotal: 0, items: [] };
    
    const startDate = new Date(contract.startAt || contract.createdAt);
    const endDate = new Date(contract.endAt || new Date());
    const durationMs = endDate - startDate;
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    const durationDays = Math.max(1, Math.ceil(durationHours / 24));
    
    let totalAmount = 0;
    const billItems = [];
    
    // NUOVA LOGICA: Contratti prenotati vs contratti nuovi
    const isReservation = contract.status === 'reserved' || contract.isReservation;
    
    contract.items.forEach(item => {
      if (item.kind === 'bike' || item.kind === 'accessory') {
        let itemTotal = 0;
        let duration = '';
        let pricingLogic = '';
        
        const priceHourly = parseFloat(item.priceHourly) || 0;
        const priceDaily = parseFloat(item.priceDaily) || 0;
        
        if (isReservation) {
          // LOGICA PRENOTAZIONI: Tariffa sommativa di tutte le tariffe giornaliere (BLOCCATA)
          itemTotal = priceDaily * durationDays;
          duration = `${durationDays} giorni (PRENOTAZIONE - Tariffa giornaliera bloccata)`;
          pricingLogic = 'reservation_daily_locked';
        } else {
          // LOGICA CONTRATTI NUOVI: Inizia oraria, si blocca quando raggiunge giornaliera
          const hourlyTotal = priceHourly * durationHours;
          const dailyTotal = priceDaily * durationDays;
          
          if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
            // Quando il costo orario raggiunge o supera quello giornaliero, si blocca sulla tariffa giornaliera
            itemTotal = dailyTotal;
            duration = `${durationDays} giorni (Bloccato su tariffa giornaliera)`;
            pricingLogic = 'new_contract_daily_capped';
          } else if (priceHourly > 0) {
            // Continua con tariffa oraria
            itemTotal = hourlyTotal;
            duration = `${durationHours} ore (Tariffa oraria)`;
            pricingLogic = 'new_contract_hourly';
          } else {
            // Fallback su tariffa giornaliera se non c'è oraria
            itemTotal = dailyTotal;
            duration = `${durationDays} giorni (Solo tariffa giornaliera disponibile)`;
            pricingLogic = 'fallback_daily';
          }
        }
        
        // Aggiungi assicurazione se presente
        if (item.insurance) {
          itemTotal += item.insuranceFlat || 5;
        }
        
        totalAmount += itemTotal;
        billItems.push({
          name: item.name,
          duration,
          total: itemTotal,
          insurance: item.insurance,
          pricingLogic: pricingLogic,
          isReservation: isReservation
        });
      }
    });
    
    // Aggiungi assicurazione flat del contratto se presente
    if (contract.insuranceFlat) {
      totalAmount += contract.insuranceFlat;
      billItems.push({
        name: 'Assicurazione Contratto',
        duration: 'Flat',
        total: contract.insuranceFlat,
        insurance: true
      });
    }
    
    return {
      finalTotal: totalAmount,
      items: billItems,
      duration: { hours: durationHours, days: durationDays },
      isReservation: isReservation,
      pricingStrategy: isReservation ? 'reservation_daily_locked' : 'new_contract_flexible'
    };
  };

  const openPaymentModal = (contract) => {
    setSelectedContractForPayment(contract);
    setPaymentMethodSelected(contract.paymentMethod || 'cash');
    setPaymentNotesInput('');
    
    // Usa il prezzo finale calcolato al rientro, altrimenti calcola ora
    let suggestedAmount = 0;
    if (contract.finalAmount !== undefined && contract.finalAmount !== null) {
      suggestedAmount = contract.finalAmount;
    } else {
      const bill = calculateBill(contract);
      suggestedAmount = bill.finalTotal;
    }
    
    setFinalAmountInput(suggestedAmount.toString());
    setShowPaymentModal(true);
  };

  const handleCompletePayment = async () => {
    if (!selectedContractForPayment) return;
    
    try {
      const finalAmount = finalAmountInput ? parseFloat(finalAmountInput) : null;
      
      await api.post(`/api/contracts/${selectedContractForPayment._id}/complete-payment`, {
        paymentMethod: paymentMethodSelected,
        paymentNotes: paymentNotesInput,
        finalAmount: finalAmount
      });
      
      alert('✅ Pagamento completato con successo!');
      
      // Chiudi il modal e ricarica contratti
      setShowPaymentModal(false);
      setSelectedContractForPayment(null);
      setPaymentMethodSelected('cash');
      setPaymentNotesInput('');
      setFinalAmountInput('');
      
      if (showExistingContracts) {
        loadExistingContracts();
      }
      
    } catch (error) {
      console.error('Errore completamento pagamento:', error);
      alert('❌ Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      // Cerca prima nelle bici
      const bikeResponse = await api.get(`/api/bikes/barcode/${barcode}`);
      if (bikeResponse.data && bikeResponse.data.status === 'available') {
        addItem('bike', bikeResponse.data);
        alert(`✅ Bici aggiunta: ${bikeResponse.data.name}`);
        return;
      }
    } catch (error) {
      // Se non è una bici, prova con gli accessori
      try {
        const accResponse = await api.get(`/api/accessories/barcode/${barcode}`);
        if (accResponse.data && accResponse.data.status === 'available') {
          addItem('accessory', accResponse.data);
          alert(`✅ Accessorio aggiunto: ${accResponse.data.name}`);
          return;
        }
      } catch (error2) {
        alert('❌ Barcode non trovato o item non disponibile');
      }
    }
  };

  // Gestione OCR per auto-compilare dati cliente
  const handleOCRResult = (ocrData) => {
    setCustomer(prev => ({
      ...prev,
      name: ocrData.name || prev.name,
      phone: ocrData.phone || prev.phone,
      documentNumber: ocrData.documentNumber || prev.documentNumber,
      birthDate: ocrData.birthDate || prev.birthDate,
      address: ocrData.address || prev.address
    }));
  };

  // Gestione selezione contratto dallo specchietto
  const handleContractSelect = (contract) => {
    setSelectedContract(contract);
  };

  // Gestione completamento sostituzione bici
  const handleSwapComplete = () => {
    setShowBikeSwapper(false);
    setSelectedContract(null);
    // Ricarica i dati se necessario
  };

  return (
    <div>
      {/* Header con logo */}
      <div style={{marginBottom: '32px'}}>
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
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              📋 Nuovo Contratto
            </h1>
            <p style={{margin: '4px 0 0 0', color: '#64748b'}}>
              {user?.role === 'superadmin' ? 'Crea contratti per tutte le location' : `Crea un nuovo contratto per ${user?.username}`}
            </p>
            {user?.location?.name && user?.role !== 'superadmin' && (
              <div style={{
                marginTop: '8px',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
        </div>
      </div>

      {/* Barra controlli */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <h4 style={{ margin: 0, color: '#374151' }}>🛠️ Strumenti:</h4>
        
        <button
          onClick={() => setShowContractMirror(!showContractMirror)}
          style={{
            padding: '8px 16px',
            background: showContractMirror ? 
              'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6',
            color: showContractMirror ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🔍 Specchietto Contratti
        </button>



        <button
          onClick={() => setShowPriceCalculator(!showPriceCalculator)}
          style={{
            padding: '8px 16px',
            background: showPriceCalculator ? 
              'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f3f4f6',
            color: showPriceCalculator ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          💰 Calcolatore Prezzi
        </button>

        <button
          onClick={() => setShowBikeReturn(true)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          📥 Gestione Rientri
        </button>

        {selectedContract && (
          <>
            <button
              onClick={() => setShowBikeSwapper(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              🔄 Sostituisci Bici
            </button>
            
            <button
              onClick={() => setShowContractClosure(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              💰 Chiudi Contratto
            </button>
          </>
        )}
      </div>

      {/* Scanner barcode per aggiungere items - Sempre visibile */}
      <div style={{
        marginBottom: '16px',
        padding: '16px',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          color: '#1e40af',
          fontSize: '18px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🚲 Scansiona Articoli
        </h3>
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          placeholder="Inserisci o scansiona barcode"
        />
      </div>

      {/* Specchietto contratti e scanner */}
      {showContractMirror && (
        <ContractMirror
          onContractSelect={handleContractSelect}
          onBikeScanned={(scan) => console.log('Bici scansionata:', scan)}
        />
      )}

      {/* Calcolatore prezzi */}
      {showPriceCalculator && items.length > 0 && (
        <PriceCalculator
          items={items.map(item => {
            // Trova i dati completi dell'item
            const fullItem = item.kind === 'bike' 
              ? bikes.find(b => b._id === item.id)
              : accs.find(a => a._id === item.id);
            return fullItem || item;
          })}
          startDate={startDate}
          endDate={endDate}
          onPriceChange={setCalculatedPrice}
        />
      )}

      {/* Date e durata contratto */}
      <section style={{marginBottom:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <h3>📅 Durata Contratto</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, marginBottom:16}}>
          <div>
            <label style={{display:'block', marginBottom:'4px', fontWeight:'600', color:'#374151'}}>
              🕐 Data/Ora Inizio
            </label>
            <input 
              type="datetime-local" 
              value={startDate} 
              onChange={e=>setStartDate(e.target.value)}
              style={{
                width:'100%', 
                padding:'8px 12px', 
                border:'1px solid #d1d5db', 
                borderRadius:'6px',
                fontSize:'14px'
              }}
            />
          </div>
          <div>
            <label style={{display:'block', marginBottom:'4px', fontWeight:'600', color:'#374151'}}>
              🕐 Data/Ora Fine (opzionale)
            </label>
            <input 
              type="datetime-local" 
              value={endDate} 
              onChange={e=>setEndDate(e.target.value)}
              style={{
                width:'100%', 
                padding:'8px 12px', 
                border:'1px solid #d1d5db', 
                borderRadius:'6px',
                fontSize:'14px'
              }}
              placeholder="Lascia vuoto per contratto aperto"
            />
          </div>
        </div>
        
        {calculatedPrice && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#059669', marginBottom: '4px' }}>
              💰 Prezzo Stimato
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
              €{calculatedPrice.recommendedPrice?.toFixed(2) || '0.00'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {calculatedPrice.recommendedType === 'hourly' ? 'Tariffa oraria' : 'Tariffa giornaliera'}
            </div>
          </div>
        )}
      </section>

      <section style={{marginBottom:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <h3>Cliente</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginBottom:16}}>
          <input placeholder="Nome e Cognome" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} />
          <input placeholder="Telefono" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} />
        </div>
        
        <DocumentScanner
          onCapture={(imageData) => setCustomer({...customer, idFrontUrl: imageData})}
          onOCRResult={handleOCRResult}
        />
      </section>

      {/* Input manuale barcode */}
      <section style={{marginBottom:16, padding:12, border:'1px solid #eee', borderRadius:12, background:'#f8fafc'}}>
        <h3 style={{margin:'0 0 12px 0', color:'#374151'}}>🔫 Inserimento Rapido Barcode</h3>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input
            type="text"
            placeholder="Scansiona o digita barcode bici/accessorio"
            value={q}
            onChange={async (e) => {
              const value = e.target.value;
              setQ(value);
              
              // Gestisce pistola barcode che termina con asterisco (*)
              if (value.endsWith('*')) {
                const cleanBarcode = value.slice(0, -1).trim(); // Rimuovi asterisco
                if (cleanBarcode) {
                  await handleBarcodeScanned(cleanBarcode);
                  setQ(''); // Pulisci il campo dopo la scansione automatica
                }
                return;
              }
              
              // Se il valore contiene Enter (tipico delle pistole barcode)
              if (value.includes('\n') || value.includes('\r')) {
                const cleanBarcode = value.replace(/[\n\r]/g, '').replace(/\*$/, '').trim();
                if (cleanBarcode) {
                  await handleBarcodeScanned(cleanBarcode);
                  setQ(''); // Pulisci il campo dopo la scansione automatica
                }
                return;
              }
            }}
            onKeyPress={async (e) => {
              if (e.key === 'Enter' && q.trim()) {
                const cleanBarcode = q.replace(/\*$/, '').trim(); // Rimuovi asterisco se presente
                await handleBarcodeScanned(cleanBarcode);
                setQ(''); // Pulisci il campo dopo la scansione
              }
            }}
            style={{
              flex: 1,
              padding: '12px',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              background: 'white',
              outline: 'none'
            }}
            autoFocus
          />
          <button
            onClick={async () => {
              if (q.trim()) {
                const cleanBarcode = q.replace(/\*$/, '').trim(); // Rimuovi asterisco se presente
                await handleBarcodeScanned(cleanBarcode);
                setQ('');
              }
            }}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            ➕ Aggiungi
          </button>
        </div>
        <div style={{fontSize:'12px', color:'#6b7280', marginTop:'8px'}}>
          💡 Tip: Usa la pistola barcode (scansione automatica con *) o digita manualmente, poi premi INVIO
        </div>
      </section>

      <section style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <h3>Bici</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
            {bikes.map(b=> (
              <div key={b._id} style={{
                border:'1px solid #ddd', 
                borderRadius:8, 
                padding:8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                {/* Foto della bici */}
                {b.photoUrl ? (
                  <img 
                    src={b.photoUrl} 
                    alt={b.name}
                    style={{
                      width: '60px',
                      height: '45px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '2px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // Mostra immagine in grande
                      const modal = document.createElement('div');
                      modal.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        cursor: pointer;
                      `;
                      modal.innerHTML = `
                        <img src="${b.photoUrl}" alt="${b.name}" style="
                          max-width: 90%;
                          max-height: 90%;
                          object-fit: contain;
                          border-radius: 8px;
                          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        ">
                      `;
                      modal.onclick = () => document.body.removeChild(modal);
                      document.body.appendChild(modal);
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '45px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#9ca3af',
                    border: '2px solid #e5e7eb'
                  }}>
                    🚲
                  </div>
                )}
                
                <div style={{textAlign: 'center'}}>
                  <div style={{fontWeight:600, fontSize: '14px'}}>{b.name}</div>
                  <div style={{fontSize:12, color: '#6b7280', fontFamily: 'monospace'}}>{b.barcode}</div>
                </div>
                
                <button 
                  onClick={()=>addItem('bike', b)} 
                  disabled={b.status!=='available'}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: b.status === 'available' ? '#10b981' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: b.status === 'available' ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  {b.status === 'available' ? '✅ Aggiungi' : '❌ Non disponibile'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div style={{border:'1px solid #eee', borderRadius:12, padding:12}}>
          <h3>Accessori</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
            {accs.map(a=> (
              <div key={a._id} style={{
                border:'1px solid #ddd', 
                borderRadius:8, 
                padding:8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                {/* Foto dell'accessorio */}
                {a.photoUrl ? (
                  <img 
                    src={a.photoUrl} 
                    alt={a.name}
                    style={{
                      width: '60px',
                      height: '45px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '2px solid #e5e7eb',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      // Mostra immagine in grande
                      const modal = document.createElement('div');
                      modal.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        cursor: pointer;
                      `;
                      modal.innerHTML = `
                        <img src="${a.photoUrl}" alt="${a.name}" style="
                          max-width: 90%;
                          max-height: 90%;
                          object-fit: contain;
                          border-radius: 8px;
                          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        ">
                      `;
                      modal.onclick = () => document.body.removeChild(modal);
                      document.body.appendChild(modal);
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '45px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#9ca3af',
                    border: '2px solid #e5e7eb'
                  }}>
                    🎒
                  </div>
                )}
                
                <div style={{textAlign: 'center'}}>
                  <div style={{fontWeight:600, fontSize: '14px'}}>{a.name}</div>
                  <div style={{fontSize:12, color: '#6b7280', fontFamily: 'monospace'}}>{a.barcode}</div>
                </div>
                
                <button 
                  onClick={()=>addItem('accessory', a)} 
                  disabled={a.status!=='available'}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: a.status === 'available' ? '#10b981' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: a.status === 'available' ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  {a.status === 'available' ? '✅ Aggiungi' : '❌ Non disponibile'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Items selezionati con barcode */}
      {items.length > 0 && (
        <section style={{marginTop:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
          <h3>📦 Items Selezionati ({items.length})</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16}}>
            {items.map((item, index) => {
              const fullItem = item.kind === 'bike' 
                ? bikes.find(b => b._id === item.id)
                : accs.find(a => a._id === item.id);
              
              return (
                <div key={index} style={{
                  border:'2px solid #e5e7eb', 
                  borderRadius:12, 
                  padding:16,
                  background: '#f8fafc'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12
                  }}>
                    {/* Foto dell'item */}
                    {fullItem?.photoUrl && (
                      <div style={{ marginRight: 12 }}>
                        <img 
                          src={fullItem.photoUrl} 
                          alt={item.name}
                          style={{
                            width: '50px',
                            height: '40px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '2px solid #e5e7eb',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            // Mostra immagine in grande
                            const modal = document.createElement('div');
                            modal.style.cssText = `
                              position: fixed;
                              top: 0;
                              left: 0;
                              width: 100%;
                              height: 100%;
                              background: rgba(0,0,0,0.8);
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              z-index: 1000;
                              cursor: pointer;
                            `;
                            modal.innerHTML = `
                              <img src="${fullItem.photoUrl}" alt="${item.name}" style="
                                max-width: 90%;
                                max-height: 90%;
                                object-fit: contain;
                                border-radius: 8px;
                                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                              ">
                            `;
                            modal.onclick = () => document.body.removeChild(modal);
                            document.body.appendChild(modal);
                          }}
                        />
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <div style={{fontWeight:600, fontSize:16, color:'#374151'}}>
                        {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                      </div>
                      <div style={{fontSize:12, color:'#6b7280'}}>
                        {fullItem?.barcode || 'N/A'}
                      </div>
                      {fullItem && (
                        <div style={{fontSize:12, color:'#059669', marginTop:4}}>
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <span>€{item.priceHourly || fullItem.priceHourly}/h • €{item.priceDaily || fullItem.priceDaily}/giorno</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newHourly = prompt('Nuovo prezzo orario (€):', item.priceHourly || fullItem.priceHourly);
                                const newDaily = prompt('Nuovo prezzo giornaliero (€):', item.priceDaily || fullItem.priceDaily);
                                
                                if (newHourly !== null && newDaily !== null) {
                                  const hourly = parseFloat(newHourly);
                                  const daily = parseFloat(newDaily);
                                  
                                  if (!isNaN(hourly) && !isNaN(daily) && hourly >= 0 && daily >= 0) {
                                    setItems(prev => prev.map((prevItem, prevIndex) => 
                                      prevIndex === index 
                                        ? { 
                                            ...prevItem, 
                                            priceHourly: hourly, 
                                            priceDaily: daily,
                                            // Mantieni i prezzi originali se già esistono, altrimenti salvali ora
                                            originalPriceHourly: prevItem.originalPriceHourly || prevItem.priceHourly,
                                            originalPriceDaily: prevItem.originalPriceDaily || prevItem.priceDaily
                                          }
                                        : prevItem
                                    ));
                                  } else {
                                    alert('❌ Inserisci prezzi validi (numeri positivi)');
                                  }
                                }
                              }}
                              style={{
                                background: '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                cursor: 'pointer'
                              }}
                              title="Modifica prezzi per questo contratto"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Assicurazione individuale solo per bici */}
                      {item.kind === 'bike' && (
                        <div style={{
                          marginTop: 8,
                          padding: 8,
                          background: '#fff7ed',
                          border: '1px solid #fed7aa',
                          borderRadius: 6
                        }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#ea580c',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={item.insurance || false}
                              onChange={(e) => {
                                setItems(prev => prev.map((prevItem, prevIndex) => 
                                  prevIndex === index 
                                    ? { ...prevItem, insurance: e.target.checked, insuranceFlat: e.target.checked ? 5 : 0 }
                                    : prevItem
                                ));
                              }}
                              style={{ marginRight: 4 }}
                            />
                            🛡️ Assicurazione (+€5.00)
                          </label>
                          {item.insurance && (
                            <div style={{ fontSize: 10, color: '#9a3412', marginTop: 2 }}>
                              Copertura danni e furto
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginLeft: 8
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {fullItem?.barcode && (
                    <BarcodeGenerator
                      code={fullItem.barcode}
                      name={item.name}
                      type={item.kind}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section style={{marginTop:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <h3>Riepilogo</h3>
        <div style={{marginBottom:8}}>
          <strong>Articoli:</strong> {items.length} 
          {items.filter(item => item.kind === 'bike').length > 0 && (
            <span style={{marginLeft: 12}}>
              🚲 Bici: {items.filter(item => item.kind === 'bike').length}
            </span>
          )}
          {items.filter(item => item.kind === 'accessory').length > 0 && (
            <span style={{marginLeft: 12}}>
              🎒 Accessori: {items.filter(item => item.kind === 'accessory').length}
            </span>
          )}
        </div>
        
        {/* Riepilogo assicurazioni */}
        {items.filter(item => item.insurance).length > 0 && (
          <div style={{
            marginBottom: 12,
            padding: 8,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 6
          }}>
            <strong>🛡️ Assicurazioni:</strong> {items.filter(item => item.insurance).length} bici assicurate
            <div style={{fontSize: 12, color: '#ea580c', marginTop: 4}}>
              Totale assicurazione: €{items.reduce((sum, item) => sum + (item.insurance ? (item.insuranceFlat || 5) : 0), 0).toFixed(2)}
            </div>
          </div>
        )}
        
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
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
        <textarea placeholder="Note" value={notes} onChange={e=>setNotes(e.target.value)} style={{width:'100%', height:80, marginTop:8}} />
        <div style={{marginTop:8}}>
          <button onClick={createContract} disabled={items.length===0}>Crea contratto</button>
        </div>
      </section>

      {/* Sezione Gestione Contratti Esistenti */}
      <section style={{marginTop:16, padding:12, border:'1px solid #eee', borderRadius:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3>📋 Gestione Contratti</h3>
          <button 
            onClick={() => {
              setShowExistingContracts(!showExistingContracts);
              if (!showExistingContracts) {
                loadExistingContracts();
              }
            }}
            style={{
              padding: '8px 16px',
              background: showExistingContracts ? '#ef4444' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {showExistingContracts ? '❌ Nascondi' : '👁️ Mostra Contratti'}
          </button>
        </div>

        {showExistingContracts && (
          <div>
            {existingContracts.length === 0 ? (
              <p>Nessun contratto trovato</p>
            ) : (
              <div style={{display:'grid', gap:12}}>
                {existingContracts.map(contract => (
                  <div key={contract._id} style={{
                    border:'1px solid #ddd', 
                    borderRadius:8, 
                    padding:12,
                    background: contract.status === 'returned' ? '#fef2f2' : 
                               contract.status === 'completed' ? '#f0fdf4' : '#f9fafb'
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <strong>{contract.customer.name}</strong> - {contract.customer.phone}
                        <div style={{fontSize:12, color:'#666'}}>
                          {contract.items.length} item(s) - {contract.status}
                        </div>
                        {contract.finalAmount !== undefined && contract.finalAmount !== null && (
                          <div style={{
                            fontSize:16, 
                            fontWeight:'bold', 
                            color:'#059669',
                            marginTop:4
                          }}>
                            💰 Totale: €{contract.finalAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                        {contract.status === 'in-use' && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowBikeReturn(true);
                            }}
                            style={{
                              padding:'6px 12px',
                              background:'#10b981',
                              color:'white',
                              border:'none',
                              borderRadius:'4px',
                              cursor:'pointer',
                              fontSize:'12px'
                            }}
                          >
                            🔄 Restituisci
                          </button>
                        )}
                        {contract.status === 'returned' && !contract.paymentCompleted && (
                          <button
                            onClick={() => openPaymentModal(contract)}
                            style={{
                              padding:'6px 12px',
                              background:'#f59e0b',
                              color:'white',
                              border:'none',
                              borderRadius:'4px',
                              cursor:'pointer',
                              fontSize:'12px'
                            }}
                          >
                            💳 Completa Pagamento
                          </button>
                        )}
                        <div style={{
                          fontSize:12,
                          color: contract.paymentCompleted ? '#059669' : '#dc2626',
                          fontWeight:'600'
                        }}>
                          {contract.paymentCompleted ? '✅ Pagato' : '❌ Non pagato'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal per pagamento */}
      {showPaymentModal && selectedContractForPayment && (
        <PaymentModal
          contract={selectedContractForPayment}
          calculatedBill={calculateBill(selectedContractForPayment)}
          onPaymentComplete={() => {
            setShowPaymentModal(false);
            setSelectedContractForPayment(null);
            if (showExistingContracts) {
              loadExistingContracts();
            }
          }}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedContractForPayment(null);
          }}
        />
      )}

      {/* Modal per sostituzione bici */}
      {showBikeSwapper && selectedContract && (
        <BikeSwapper
          contract={selectedContract}
          onSwapComplete={handleSwapComplete}
          onClose={() => setShowBikeSwapper(false)}
        />
      )}

      {/* Modal per gestione rientri */}
      {showBikeReturn && (
        <BikeReturn
          selectedContract={selectedContract}
          onReturnComplete={(contract) => {
            setShowBikeReturn(false);
            setSelectedContract(null);
            loadExistingContracts(); // Ricarica i contratti
            // Apri automaticamente il modal di pagamento se il contratto è completamente restituito
            if (contract && contract.status === 'returned') {
              setTimeout(() => {
                openPaymentModal(contract);
              }, 500);
            }
          }}
          onClose={() => {
            setShowBikeReturn(false);
            setSelectedContract(null);
          }}
        />
      )}

      {/* Modal per chiusura contratto */}
      {showContractClosure && selectedContract && (
        <ContractClosure
          contract={selectedContract}
          onComplete={() => {
            setShowContractClosure(false);
            setSelectedContract(null);
            // Ricarica dati se necessario
          }}
          onClose={() => setShowContractClosure(false)}
        />
      )}
    </div>
  )
}
