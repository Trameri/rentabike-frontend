import React, { useState, useEffect } from 'react';
import ProfessionalBarcode from '../Components/ProfessionalBarcode';

export default function BarcodeManagement() {
  const [bikes, setBikes] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showBatchDownload, setShowBatchDownload] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Carica bici
      const bikesResponse = await fetch('/api/bikes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Carica accessori
      const accessoriesResponse = await fetch('/api/accessories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (bikesResponse.ok && accessoriesResponse.ok) {
        const bikesData = await bikesResponse.json();
        const accessoriesData = await accessoriesResponse.json();
        
        setBikes(bikesData);
        setAccessories(accessoriesData);
      }
    } catch (error) {
      console.error('Errore caricamento items:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateBarcode = async (type, id) => {
    if (!confirm('Sei sicuro di voler rigenerare il barcode? Il vecchio barcode non sarà più valido.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/barcode/regenerate/${type}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Barcode rigenerato: ${result.oldBarcode} → ${result.newBarcode}`);
        loadItems(); // Ricarica per aggiornare i barcode
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore rigenerazione barcode:', error);
      alert('Errore durante la rigenerazione');
    }
  };

  const downloadBarcode = async (type, id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/barcode/generate/${type}/${id}?width=400&height=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `barcode_${type}_${id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore download barcode:', error);
    }
  };

  const toggleItemSelection = (type, id) => {
    const itemKey = `${type}_${id}`;
    setSelectedItems(prev => 
      prev.includes(itemKey) 
        ? prev.filter(item => item !== itemKey)
        : [...prev, itemKey]
    );
  };

  const downloadBatchBarcodes = async () => {
    if (selectedItems.length === 0) {
      alert('Seleziona almeno un item per il download batch');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const items = selectedItems.map(item => {
        const [type, id] = item.split('_');
        return { type, id };
      });

      const response = await fetch('/api/barcode/generate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Crea un PDF o ZIP con tutti i barcode
        const printWindow = window.open('', '_blank');
        let htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Barcode Batch - ${result.barcodes.length} items</title>
            <style>
              @page { size: A4; margin: 1cm; }
              body { font-family: Arial, sans-serif; }
              .barcode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
              .barcode-item { 
                border: 2px solid #000; 
                padding: 15px; 
                text-align: center; 
                page-break-inside: avoid;
                margin-bottom: 20px;
              }
              .barcode-image { max-width: 100%; height: auto; }
              .barcode-info { margin-top: 10px; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Barcode Batch - ${result.barcodes.length} items</h1>
            <div class="barcode-grid">
        `;

        result.barcodes.forEach(item => {
          htmlContent += `
            <div class="barcode-item">
              <div style="font-weight: bold; margin-bottom: 10px;">
                ${item.type === 'bike' ? '🚲' : '🎒'} ${item.name}
              </div>
              <img src="${item.image}" alt="Barcode ${item.barcode}" class="barcode-image" />
              <div class="barcode-info">
                <div>Barcode: ${item.barcode}</div>
                <div>Tipo: ${item.type === 'bike' ? 'Bicicletta' : 'Accessorio'}</div>
              </div>
            </div>
          `;
        });

        htmlContent += `
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Errore download batch:', error);
      alert('Errore durante il download batch');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div>Caricamento items...</div>
      </div>
    );
  }

  const allItems = [
    ...bikes.map(bike => ({ ...bike, type: 'bike' })),
    ...accessories.map(acc => ({ ...acc, type: 'accessory' }))
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '16px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937'
        }}>
          🏷️ Gestione Barcode Professionali
        </h1>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setSelectedItems([])}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Deseleziona Tutto
          </button>
          
          <button
            onClick={downloadBatchBarcodes}
            disabled={selectedItems.length === 0}
            style={{
              padding: '8px 16px',
              background: selectedItems.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            📥 Download Batch ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{bikes.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>🚲 Biciclette</div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{accessories.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>🎒 Accessori</div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{allItems.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>📦 Totale Items</div>
        </div>
      </div>

      {/* Lista items */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {allItems.map(item => {
          const itemKey = `${item.type}_${item._id}`;
          const isSelected = selectedItems.includes(itemKey);
          
          return (
            <div key={itemKey} style={{
              background: 'white',
              border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Header item */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {item.type === 'bike' ? '🚲' : '🎒'} {item.name}
                  </h3>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    fontFamily: 'monospace'
                  }}>
                    ID: {item._id}
                  </div>
                </div>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(item.type, item._id)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Seleziona</span>
                </label>
              </div>

              {/* Barcode */}
              <ProfessionalBarcode
                code={item.barcode}
                name={item.name}
                type={item.type}
                width={350}
                height={80}
                showDownload={false}
              />

              {/* Azioni */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => downloadBarcode(item.type, item._id)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  📥 Scarica PNG
                </button>
                
                <button
                  onClick={() => regenerateBarcode(item.type, item._id)}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  🔄 Rigenera
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {allItems.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Nessun item trovato</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Aggiungi biciclette o accessori per generare i barcode
          </div>
        </div>
      )}
    </div>
  );
}