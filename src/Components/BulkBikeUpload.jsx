import React, { useState } from 'react';
import { api } from '../services/api.js';

const BulkBikeUpload = ({ onComplete, userRole, locations = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');

  const sampleCsv = `nome,tipo,prezzoOrario,prezzoGiornaliero,barcode,fotoUrl
Bici Elettrica 1,ebike-full,5.00,30.00,BIKE001,
Bici Muscolare 1,muscolare,3.00,20.00,BIKE002,
E-bike Front 1,ebike-front,4.50,25.00,,https://example.com/foto.jpg`;

  const parseCsvData = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Il CSV deve contenere almeno un header e una riga di dati');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['nome', 'tipo', 'prezzoOrario', 'prezzoGiornaliero'];
    
    // Verifica che gli header obbligatori siano presenti
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Header mancanti: ${missingHeaders.join(', ')}`);
    }

    const bikes = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new Error(`Riga ${i + 1}: numero di colonne non corrispondente`);
      }

      const bike = {};
      headers.forEach((header, index) => {
        const value = values[index];
        
        switch (header) {
          case 'nome':
            bike.name = value;
            break;
          case 'tipo':
            bike.type = value || 'ebike-full';
            break;
          case 'prezzoOrario':
            bike.priceHourly = parseFloat(value) || 5.00;
            break;
          case 'prezzoGiornaliero':
            bike.priceDaily = parseFloat(value) || 30.00;
            break;
          case 'barcode':
            if (value) bike.barcode = value;
            break;
          case 'fotoUrl':
            if (value) bike.photoUrl = value;
            break;
        }
      });

      // Aggiungi location se necessario
      if (userRole === 'superadmin' && selectedLocation) {
        bike.location = selectedLocation;
      }

      bikes.push(bike);
    }

    return bikes;
  };

  const handleUpload = async () => {
    if (!csvData.trim()) {
      alert('❌ Inserisci i dati CSV');
      return;
    }

    if (userRole === 'superadmin' && !selectedLocation) {
      alert('❌ Seleziona una location per le bici');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const bikes = parseCsvData(csvData);
      
      console.log('Caricamento bici in batch:', bikes);
      
      const response = await api.post('/api/bikes/bulk', { bikes });
      
      setResults(response.data);
      
      if (response.data.summary.errors === 0) {
        alert(`✅ Caricamento completato!\n\n` +
              `📊 Riepilogo:\n` +
              `• Bici create: ${response.data.summary.created}\n` +
              `• Bici aggiornate: ${response.data.summary.updated}\n` +
              `• Totale elaborate: ${response.data.summary.total}`);
      } else {
        alert(`⚠️ Caricamento completato con alcuni errori!\n\n` +
              `📊 Riepilogo:\n` +
              `• Bici create: ${response.data.summary.created}\n` +
              `• Bici aggiornate: ${response.data.summary.updated}\n` +
              `• Errori: ${response.data.summary.errors}\n` +
              `• Totale elaborate: ${response.data.summary.total}\n\n` +
              `Controlla i dettagli qui sotto per vedere gli errori.`);
      }

      if (onComplete) {
        onComplete(response.data);
      }

    } catch (error) {
      console.error('Errore nel caricamento bulk:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert('❌ Errore nel caricamento: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esempio_inventario_bici.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#2563eb';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#3b82f6';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        📤 Carica Inventario
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90%',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            📤 Caricamento Inventario Bici
          </h2>
          <button
            onClick={() => setIsOpen(false)}
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

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#6b7280', marginBottom: '12px' }}>
            Carica multiple bici utilizzando il formato CSV. Le bici esistenti (stesso barcode) verranno aggiornate.
          </p>
          
          <button
            onClick={downloadSample}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px'
            }}
          >
            📥 Scarica Esempio CSV
          </button>
        </div>

        {userRole === 'superadmin' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Location per le bici *
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="">Seleziona Location</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Dati CSV *
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Incolla qui i dati CSV..."
            style={{
              width: '100%',
              height: '200px',
              padding: '12px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setIsOpen(false)}
            disabled={loading}
            style={{
              padding: '12px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.5 : 1
            }}
          >
            Annulla
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              padding: '12px 20px',
              backgroundColor: loading ? '#6b7280' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? '⏳ Caricamento...' : '📤 Carica Bici'}
          </button>
        </div>

        {results && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📊 Risultati Caricamento
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                  {results.summary.created}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Create</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                  {results.summary.updated}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Aggiornate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                  {results.summary.errors}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Errori</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280' }}>
                  {results.summary.total}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Totale</div>
              </div>
            </div>

            {results.results.errors.length > 0 && (
              <div>
                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#ef4444'
                }}>
                  ❌ Errori ({results.results.errors.length})
                </h4>
                <div style={{
                  maxHeight: '150px',
                  overflow: 'auto',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '8px'
                }}>
                  {results.results.errors.map((error, index) => (
                    <div key={index} style={{
                      fontSize: '12px',
                      color: '#dc2626',
                      marginBottom: '4px'
                    }}>
                      Riga {error.index + 2}: {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkBikeUpload;