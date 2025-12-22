import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const BikeROIDebug = () => {
  const [debugData, setDebugData] = useState({
    bikes: [],
    contracts: [],
    lastUpdate: null,
    loading: false,
    error: null
  });

  const fetchData = async () => {
    try {
      setDebugData(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('🔍 BikeROIDebug: Inizio fetch dati...');
      
      const [bikesRes, contractsRes] = await Promise.all([
        api.get('/api/bikes'),
        api.get('/api/contracts')
      ]);

      console.log('🔍 BikeROIDebug: Dati ricevuti:', {
        bikes: bikesRes.data.length,
        contracts: contractsRes.data.length,
        bikesData: bikesRes.data.slice(0, 2), // Prime 2 bici per debug
        contractsData: contractsRes.data.slice(0, 2) // Primi 2 contratti per debug
      });

      setDebugData({
        bikes: bikesRes.data,
        contracts: contractsRes.data,
        lastUpdate: new Date(),
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('🔍 BikeROIDebug: Errore:', error);
      setDebugData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const analyzeContracts = () => {
    const analysis = {
      total: debugData.contracts.length,
      byStatus: {},
      withRevenue: 0,
      withPayment: 0,
      recent: 0
    };

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    debugData.contracts.forEach(contract => {
      // Conta per status
      analysis.byStatus[contract.status] = (analysis.byStatus[contract.status] || 0) + 1;
      
      // Conta con ricavi
      if (contract.finalAmount > 0 || contract.totals?.grandTotal > 0) {
        analysis.withRevenue++;
      }
      
      // Conta con pagamento
      if (contract.paymentCompleted || contract.paid) {
        analysis.withPayment++;
      }
      
      // Conta recenti (ultima ora)
      if (new Date(contract.createdAt) > oneHourAgo) {
        analysis.recent++;
      }
    });

    return analysis;
  };

  const contractAnalysis = analyzeContracts();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
          🔍 Debug BikeROI Stats
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={fetchData}
            disabled={debugData.loading}
            style={{
              padding: '8px 16px',
              background: debugData.loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: debugData.loading ? 'not-allowed' : 'pointer'
            }}
          >
            {debugData.loading ? '🔄 Caricando...' : '🔄 Refresh Dati'}
          </button>
        </div>

        {debugData.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            ❌ Errore: {debugData.error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#059669' }}>📊 Bici</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {debugData.bikes.length}
            </div>
          </div>

          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>📋 Contratti</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {debugData.contracts.length}
            </div>
          </div>

          <div style={{
            background: '#fef3c7',
            border: '1px solid #fed7aa',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#92400e' }}>💰 Con Ricavi</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {contractAnalysis.withRevenue}
            </div>
          </div>

          <div style={{
            background: '#f3e8ff',
            border: '1px solid #d8b4fe',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#7c3aed' }}>✅ Pagati</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {contractAnalysis.withPayment}
            </div>
          </div>
        </div>

        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>📈 Analisi Contratti</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {Object.entries(contractAnalysis.byStatus).map(([status, count]) => (
              <div key={status} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                  {count}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                  {status}
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            🕐 Contratti ultima ora: <strong>{contractAnalysis.recent}</strong>
          </div>
        </div>

        {debugData.lastUpdate && (
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            🕐 Ultimo aggiornamento: {debugData.lastUpdate.toLocaleString()}
          </div>
        )}
      </div>

      {/* Dettagli contratti recenti */}
      {debugData.contracts.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
            📋 Ultimi 5 Contratti
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Cliente</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Totale</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Pagato</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Creato</th>
                </tr>
              </thead>
              <tbody>
                {debugData.contracts.slice(0, 5).map(contract => (
                  <tr key={contract._id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      {contract._id.slice(-6)}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: contract.status === 'completed' ? '#dcfce7' : '#fef3c7',
                        color: contract.status === 'completed' ? '#166534' : '#92400e'
                      }}>
                        {contract.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                      {contract.customer?.name || 'N/A'}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                      €{(contract.finalAmount || contract.totals?.grandTotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                      {contract.paymentCompleted || contract.paid ? '✅' : '❌'}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      {new Date(contract.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BikeROIDebug;