import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api.js';
import LocationLogo from './LocationLogo';

const BikeManagement = () => {
  const { user } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, available, in-use, maintenance, reserved
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locations, setLocations] = useState([]);
  const [editingBike, setEditingBike] = useState(null)
  const [editForm, setEditForm] = useState({
    name:'',
    type:'ebike-full',
    priceHourly:5,
    priceDaily:30,
    photoUrl:'',
    barcode:'',
    model:'',
    brand:'',
    frameNumber:'',
    purchaseDate:'',
    purchasePrice:0
  })
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch bici
      const bikesResponse = await fetch('/api/bikes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bikesData = await bikesResponse.json();
      
      // Fetch contratti attivi per vedere quali bici sono in uso
      const [contractsInUse, contractsReserved] = await Promise.all([
        fetch('/api/contracts?status=in-use', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()),
        fetch('/api/contracts?status=reserved', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
      ]);
      
      const contractsData = [...contractsInUse, ...contractsReserved];
      
      // Fetch locations
      const locationsResponse = await fetch('/api/locations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const locationsData = await locationsResponse.json();
      
      setBikes(bikesData);
      setContracts(contractsData);
      setLocations(locationsData);
    } catch (err) {
      setError('Errore nel caricamento dei dati: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  function startEdit(bike) {
    setEditingBike(bike)
    setEditForm({
      name: bike.name || '',
      type: bike.type || 'ebike-full',
      priceHourly: bike.priceHourly ?? 5,
      priceDaily: bike.priceDaily ?? 30,
      photoUrl: bike.photoUrl || '',
      barcode: bike.barcode || '',
      model: bike.model || '',
      brand: bike.brand || '',
      frameNumber: bike.frameNumber || '',
      purchaseDate: bike.purchaseDate || '',
      purchasePrice: bike.purchasePrice ?? 0,
      location: bike.location || ''
    })
    setShowEditModal(true)
  }

  async function updateBike(e) {
    e.preventDefault()
    if (!editingBike) return
    try {
      await api.put(`/api/bikes/${editingBike._id}`, editForm)
      setShowEditModal(false)
      setEditingBike(null)
      await fetchData()
      alert('✅ Bici aggiornata con successo!')
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Errore sconosciuto';
      alert('❌ Errore nell\'aggiornamento della bici: ' + errorMessage)
    }
  }

  function closeEditModal() {
    setShowEditModal(false)
    setEditingBike(null)
  }

// Funzione per ottenere informazioni sul contratto per una bici (controlla anche prenotazioni future)
   const getBikeContractInfo = (bikeId) => {
    const now = new Date();
    const contract = contracts.find(c => 
      c.items.some(item => item.kind === 'bike' && item.refId === bikeId) &&
      (c.status === 'in-use' || c.status === 'reserved')
    );
    
    if (contract) {
      const bikeItem = contract.items.find(item => item.kind === 'bike' && item.refId === bikeId);
      
      // Se è una prenotazione, mostra informazioni ma la bici è disponibile fuori dal periodo
      if (contract.status === 'reserved') {
        const startAt = new Date(contract.startAt);
        // La bici è prenotata ma non ancora in uso - mostriamo comunque le info
        return {
          contract,
          customer: contract.customer,
          startDate: contract.startAt,
          expectedReturn: contract.expectedReturnAt,
          item: bikeItem,
          isFutureReservation: true
        };
      }
      
      return {
        contract,
        customer: contract.customer,
        startDate: contract.startAt,
        expectedReturn: contract.expectedReturnAt,
        item: bikeItem
      };
    }
    return null;
  };
  
  // Funzione per ottenere lo stato reale della bici in base ai contratti
  const getBikeRealStatus = (bike) => {
    const contractInfo = getBikeContractInfo(bike._id);
    if (!contractInfo) return bike.status; // Nessun contratto, usa lo stato salvato
    
    // Se è una prenotazione, la bici è disponibile fuori dal periodo della prenotazione
    if (contractInfo.isFutureReservation) {
      const now = new Date();
      const startAt = new Date(contractInfo.contract.startAt || contractInfo.contract.createdAt);
      let endAt = contractInfo.contract.endAt ? new Date(contractInfo.contract.endAt) : null;
      
      const startOfDay = new Date(startAt);
      startOfDay.setHours(0, 0, 0, 0);
      
      const nowDay = new Date(now);
      nowDay.setHours(0, 0, 0, 0);
      
      // Se non c'è endAt, la prenotazione è solo per un giorno
      if (!endAt) {
        if (nowDay >= startOfDay) {
          return contractInfo.contract.status;
        }
        return 'available';
      }
      
      // Con endAt, la bici è riservata fino alla data di fine
      const endOfDay = new Date(endAt);
      endOfDay.setHours(0, 0, 0, 0);
      
      // La bici è riservata se oggi è nel periodo della prenotazione
      if (nowDay >= startOfDay && nowDay <= endOfDay) {
        return contractInfo.contract.status;
      }
      
      // Altrimenti la bici è disponibile
      return 'available';
    }
    
    return contractInfo.contract.status;
  };

// Filtra le bici
  const filteredBikes = bikes.filter(bike => {
    // Get real status based on contracts
    const realStatus = getBikeRealStatus(bike);
    
    // Filtro per stato
    if (filter !== 'all' && realStatus !== filter) return false;
    
    // Filtro per location (solo per superadmin)
    if (user?.role === 'superadmin' && selectedLocation !== 'all' && bike.location !== selectedLocation) return false;
    
    // Filtro per termine di ricerca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        bike.name.toLowerCase().includes(term) ||
        bike.barcode.toLowerCase().includes(term) ||
        bike.model.toLowerCase().includes(term)
      );
    }
    
    return true;
  });
  
  // Statistiche - usa lo stato reale
  const stats = {
    total: bikes.length,
    available: bikes.filter(b => getBikeRealStatus(b) === 'available').length,
    inUse: bikes.filter(b => getBikeRealStatus(b) === 'in-use').length,
    reserved: bikes.filter(b => getBikeRealStatus(b) === 'reserved').length,
    maintenance: bikes.filter(b => getBikeRealStatus(b) === 'maintenance').length
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981'; // verde
      case 'in-use': return '#f59e0b'; // arancione
      case 'reserved': return '#3b82f6'; // blu
      case 'maintenance': return '#ef4444'; // rosso
      default: return '#6b7280'; // grigio
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponibile';
      case 'in-use': return 'In Uso';
      case 'reserved': return 'Riservata';
      case 'maintenance': return 'Manutenzione';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#64748b'
      }}>
        <div>🔄 Caricamento gestione bici...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fef2f2', 
        border: '1px solid #fecaca', 
        borderRadius: '8px',
        color: '#dc2626',
        margin: '20px'
      }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '30px',
        gap: '15px'
      }}>
        <LocationLogo locationName={user?.location?.name || 'superadmin'} size="header" />
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            🚲 Gestisci Bici
          </h1>
          <p style={{ 
            margin: '5px 0 0 0', 
            color: '#6b7280',
            fontSize: '16px'
          }}>
            Monitora lo stato e l'utilizzo delle bici
          </p>
        </div>
      </div>

      {/* Statistiche */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
            {stats.total}
          </div>
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>
            Totale Bici
          </div>
        </div>

        <div style={{
          backgroundColor: '#f0fdf4',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #bbf7d0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {stats.available}
          </div>
          <div style={{ color: '#059669', fontSize: '14px', marginTop: '5px' }}>
            Disponibili
          </div>
        </div>

        <div style={{
          backgroundColor: '#fffbeb',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #fed7aa',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.inUse}
          </div>
          <div style={{ color: '#d97706', fontSize: '14px', marginTop: '5px' }}>
            In Uso
          </div>
        </div>

        <div style={{
          backgroundColor: '#eff6ff',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #bfdbfe',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.reserved}
          </div>
          <div style={{ color: '#2563eb', fontSize: '14px', marginTop: '5px' }}>
            Riservate
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef2f2',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #fecaca',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
            {stats.maintenance}
          </div>
          <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '5px' }}>
            Manutenzione
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ 
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: user?.role === 'superadmin' ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px',
          alignItems: 'end'
        }}>
          {/* Filtro per stato */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Stato:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="all">Tutti gli stati</option>
              <option value="available">Disponibili</option>
              <option value="in-use">In Uso</option>
              <option value="reserved">Riservate</option>
              <option value="maintenance">Manutenzione</option>
            </select>
          </div>

          {/* Filtro per location (solo superadmin) */}
          {user?.role === 'superadmin' && (
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: '500',
                color: '#374151'
              }}>
                Location:
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="all">Tutte le location</option>
                {locations.map(location => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ricerca */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500',
              color: '#374151'
            }}>
              Cerca:
            </label>
            <input
              type="text"
              placeholder="Nome, barcode, modello..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Pulsante reset */}
          <div>
            <button
              onClick={() => {
                setFilter('all');
                setSelectedLocation('all');
                setSearchTerm('');
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Lista bici */}
      <div style={{ 
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '20px',
          borderBottom: '2px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            Bici ({filteredBikes.length})
          </h3>
        </div>

        {filteredBikes.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280',
            fontSize: '16px'
          }}>
            🔍 Nessuna bici trovata con i filtri selezionati
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
{filteredBikes.map(bike => {
               const contractInfo = getBikeContractInfo(bike._id);
               const realStatus = getBikeRealStatus(bike);
               
               return (
                 <div
                   key={bike._id}
                   style={{
                     padding: '20px',
                     borderBottom: '1px solid #e5e7eb',
                     display: 'grid',
                     gridTemplateColumns: 'auto 1fr auto',
                     gap: '20px',
                     alignItems: 'center'
                   }}
                 >
                   {/* Info bici */}
                   <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                     <div
                       style={{
                         width: '12px',
                         height: '12px',
                         borderRadius: '50%',
                         backgroundColor: getStatusColor(realStatus)
                       }}
                     />
                     <div>
                       <div style={{ 
                         fontWeight: 'bold', 
                         fontSize: '16px',
                         color: '#1f2937'
                       }}>
                         {bike.name}
                       </div>
                       <div style={{ 
                         fontSize: '14px', 
                         color: '#6b7280',
                         marginTop: '2px'
                       }}>
                         {bike.barcode} • {bike.model}
                       </div>
                     </div>
                   </div>

                   {/* Dettagli centrali */}
                   <div>
                     <div style={{ 
                       display: 'flex', 
                       alignItems: 'center', 
                       gap: '10px',
                       marginBottom: '8px'
                     }}>
                       <span
                         style={{
                           padding: '4px 12px',
                           borderRadius: '20px',
                           fontSize: '12px',
                           fontWeight: '500',
                           backgroundColor: getStatusColor(realStatus) + '20',
                           color: getStatusColor(realStatus)
                         }}
                       >
                         {getStatusText(realStatus)}
                       </span>
                       
                       {bike.location && (
                         <span style={{ 
                           fontSize: '12px', 
                           color: '#6b7280',
                           backgroundColor: '#f3f4f6',
                           padding: '4px 8px',
                           borderRadius: '12px'
                         }}>
                           📍 {locations.find(l => l._id === bike.location)?.name || 'N/A'}
                         </span>
                       )}
                       
                       {/* Indicatore prenotazione futura */}
                       {contractInfo?.isFutureReservation && (
                         <span style={{
                           fontSize: '12px',
                           backgroundColor: '#fef3c7',
                           color: '#92400e',
                           padding: '4px 8px',
                           borderRadius: '12px',
                           fontWeight: '600'
                         }}>
                           📅 Prenotata per {formatDate(contractInfo.startDate).split(' ')[0]}
                         </span>
                       )}
                     </div>

                     {/* Info contratto se in uso */}
                     {contractInfo && !contractInfo.isFutureReservation && (
                       <div style={{ 
                         fontSize: '13px', 
                         color: '#4b5563',
                         backgroundColor: '#f9fafb',
                         padding: '8px 12px',
                         borderRadius: '6px',
                         border: '1px solid #e5e7eb'
                       }}>
                         <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                           👤 {contractInfo.customer.name}
                         </div>
                         <div>
                           📅 Dal: {formatDate(contractInfo.startDate)}
                         </div>
                         {contractInfo.expectedReturn && (
                           <div>
                             ⏰ Previsto: {formatDate(contractInfo.expectedReturn)}
                           </div>
                         )}
                       </div>
                     )}
                   </div>

                   {/* Prezzi e azioni */}
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ 
                       fontSize: '14px', 
                       fontWeight: '500',
                       color: '#1f2937'
                     }}>
                       €{bike.priceHourly}/h
                     </div>
                     <div style={{ 
                       fontSize: '12px', 
                       color: '#6b7280'
                     }}>
                       €{bike.priceDaily}/giorno
                     </div>
                     <button
                       onClick={() => startEdit(bike)}
                       style={{
                         marginTop: '8px',
                         padding: '4px 10px',
                         background: '#3b82f6',
                         color: 'white',
                         border: 'none',
                         borderRadius: '4px',
                         cursor: 'pointer',
                         fontSize: '12px'
                       }}
                       title="Modifica bici"
                     >
                       ✏️ Modifica
                     </button>
                   </div>
                 </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pulsante refresh */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px'
      }}>
        <button
          onClick={fetchData}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          🔄 Aggiorna Dati
        </button>
      </div>

      {/* Modal modifica bici */}
      {showEditModal && editingBike && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                ✏️ Modifica Bici
              </h2>
              <button
                onClick={closeEditModal}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={updateBike} style={{ padding: '24px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Nome Bici *
                  </label>
                  <input
                    placeholder="Nome bici *"
                    value={editForm.name}
                    onChange={e=>setEditForm({...editForm, name:e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: !editForm.name.trim() ? '2px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Tipo
                  </label>
                  <select 
                    value={editForm.type} 
                    onChange={e=>setEditForm({...editForm, type:e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="ebike-full">E-bike Full</option>
                    <option value="ebike-front">E-bike Front</option>
                    <option value="ebike-other">E-bike (altre)</option>
                    <option value="muscolare">Muscolare</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Barcode
                  </label>
                  <input
                    placeholder="Barcode (vuoto = auto)"
                    value={editForm.barcode}
                    onChange={e=>setEditForm({...editForm, barcode:e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    €/h
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editForm.priceHourly} 
                    onChange={e=>setEditForm({...editForm, priceHourly:Number(e.target.value)})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    €/giorno
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editForm.priceDaily} 
                    onChange={e=>setEditForm({...editForm, priceDaily:Number(e.target.value)})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Modello
                  </label>
                  <input
                    placeholder="Es. Trek FX 3"
                    value={editForm.model}
                    onChange={e => setEditForm({...editForm, model: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Marca
                  </label>
                  <input
                    placeholder="Es. Trek, Specialized, Giant"
                    value={editForm.brand}
                    onChange={e => setEditForm({...editForm, brand: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Numero Telaio
                  </label>
                  <input
                    placeholder="Es. WTU123456789"
                    value={editForm.frameNumber}
                    onChange={e => setEditForm({...editForm, frameNumber: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>
                    Prezzo Acquisto (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editForm.purchasePrice}
                    onChange={e => setEditForm({...editForm, purchasePrice: Number(e.target.value)})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeEditModal}
                  style={{
                    padding: '12px 24px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  💾 Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BikeManagement;