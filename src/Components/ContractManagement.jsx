import React, { useState, useEffect } from 'react';

export default function ContractManagement({ contract, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    customer: { name: '', phone: '' },
    notes: '',
    status: 'in-use',
    paymentMethod: null
  });
  const [loading, setLoading] = useState(false);
  const [modificationHistory, setModificationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (contract) {
      setFormData({
        customer: contract.customer || { name: '', phone: '' },
        notes: contract.notes || '',
        status: contract.status || 'in-use',
        paymentMethod: contract.paymentMethod || null
      });
      loadModificationHistory();
    }
  }, [contract]);

  const loadModificationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}/modifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setModificationHistory(data.modificationHistory || []);
      }
    } catch (error) {
      console.error('Errore caricamento storico:', error);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedContract = await response.json();
        onUpdate(updatedContract.contract);
        alert('Contratto aggiornato con successo!');
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore aggiornamento:', error);
      alert('Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Motivo dell\'annullamento:');
    if (!reason) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        const result = await response.json();
        onUpdate(result.contract);
        alert('Contratto annullato con successo!');
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore annullamento:', error);
      alert('Errore durante l\'annullamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!confirm('Confermi di aver ricevuto il pagamento per questo contratto?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}/complete-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: formData.paymentMethod || 'cash',
          paymentNotes: 'Pagamento completato tramite gestione contratto'
        })
      });

      if (response.ok) {
        const result = await response.json();
        onUpdate(result.contract);
        alert('✅ Pagamento completato con successo!');
      } else {
        const error = await response.json();
        alert(`❌ Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore completamento pagamento:', error);
      alert('❌ Errore durante il completamento del pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo contratto? Questa azione non può essere annullata.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Contratto eliminato con successo!');
        onClose();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created': return '✨';
      case 'modified': return '✏️';
      case 'cancelled': return '❌';
      case 'deleted': return '🗑️';
      case 'item_swapped': return '🔄';
      default: return '📝';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'created': return 'Creato';
      case 'modified': return 'Modificato';
      case 'cancelled': return 'Annullato';
      case 'deleted': return 'Eliminato';
      case 'item_swapped': return 'Bici sostituita';
      default: return action;
    }
  };

  if (!contract) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            🛠️ Gestione Contratto
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Info contratto */}
        <div style={{
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            ID: {contract._id}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Creato: {formatDate(contract.createdAt)} • 
            Ultima modifica: {formatDate(contract.updatedAt)}
          </div>
          {contract.createdBy && (
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              Creato da: {contract.createdBy} • 
              {contract.lastModifiedBy && `Modificato da: ${contract.lastModifiedBy}`}
            </div>
          )}
        </div>

        {/* Form modifica */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#374151' }}>
            Modifica Dati
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Cliente */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
                Nome Cliente
              </label>
              <input
                type="text"
                value={formData.customer.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customer: { ...prev.customer, name: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Telefono */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
                Telefono
              </label>
              <input
                type="text"
                value={formData.customer.phone}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  customer: { ...prev.customer, phone: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Stato */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
                Stato
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="reserved">Prenotato</option>
                <option value="in-use">In uso</option>
                <option value="completed">Completato</option>
                <option value="cancelled">Annullato</option>
              </select>
            </div>

            {/* Metodo pagamento */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
                Metodo Pagamento
              </label>
              <select
                value={formData.paymentMethod || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value || null }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Non specificato</option>
                <option value="cash">Contanti</option>
                <option value="card">Carta</option>
                <option value="link">Link pagamento</option>
                <option value="bank">Bonifico</option>
              </select>
            </div>

            {/* Prezzo finale */}
            {contract?.finalAmount !== undefined && contract?.finalAmount !== null && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                  💰 Prezzo Finale
                </label>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1f2937',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderRadius: '12px',
                  border: '2px solid #10b981',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}>
                  💰 TOTALE: €{contract.finalAmount.toFixed(2)}
                </div>
              </div>
            )}

            {/* Stato pagamento */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                💳 Stato Pagamento
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: contract?.paymentCompleted ? '#f0fdf4' : '#fef2f2',
                borderRadius: '8px',
                border: `2px solid ${contract?.paymentCompleted ? '#10b981' : '#ef4444'}`
              }}>
                <div style={{
                  fontSize: '24px'
                }}>
                  {contract?.paymentCompleted ? '✅' : '❌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: contract?.paymentCompleted ? '#059669' : '#dc2626',
                    marginBottom: '4px'
                  }}>
                    {contract?.paymentCompleted ? 'Pagamento Completato' : 'Pagamento Pendente'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {contract?.paymentCompleted 
                      ? `Pagato il ${contract.paymentDate ? new Date(contract.paymentDate).toLocaleDateString('it-IT') : 'N/A'}`
                      : 'Il pagamento non è ancora stato completato'
                    }
                  </div>
                </div>
                {!contract?.paymentCompleted && (
                  <button
                    onClick={handleCompletePayment}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    💳 Segna Pagato
                  </button>
                )}
              </div>
            </div>

            {/* Note */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
                Note
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

        {/* Storico modifiche */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px'
            }}
          >
            {showHistory ? '📖 Nascondi Storico' : '📖 Mostra Storico'} ({modificationHistory.length})
          </button>

          {showHistory && (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {modificationHistory.length === 0 ? (
                <div style={{ color: '#6b7280', textAlign: 'center' }}>
                  Nessuna modifica registrata
                </div>
              ) : (
                modificationHistory.map((mod, index) => (
                  <div key={index} style={{
                    padding: '8px',
                    borderBottom: index < modificationHistory.length - 1 ? '1px solid #e5e7eb' : 'none',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#374151' }}>
                      {getActionIcon(mod.action)} {getActionLabel(mod.action)} - {mod.performedBy}
                    </div>
                    <div style={{ color: '#6b7280', marginTop: '2px' }}>
                      {formatDate(mod.date)}
                    </div>
                    {mod.details && (
                      <div style={{ color: '#9ca3af', marginTop: '4px', fontSize: '11px' }}>
                        {JSON.stringify(mod.details)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pulsanti azione */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Salvando...' : '💾 Salva Modifiche'}
          </button>

          <button
            onClick={handleCancel}
            disabled={loading || contract.status === 'cancelled'}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: (loading || contract.status === 'cancelled') ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: (loading || contract.status === 'cancelled') ? 0.7 : 1
            }}
          >
            ❌ Annulla Contratto
          </button>

          <button
            onClick={handleDelete}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: loading ? 0.7 : 1
            }}
          >
            🗑️ Elimina
          </button>
        </div>
      </div>
    </div>
  );
}