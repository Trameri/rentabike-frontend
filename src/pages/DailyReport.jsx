import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useNotifications } from '../Components/NotificationSystem.jsx';

export default function DailyReport() {
  const [report, setReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const { showError } = useNotifications();

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/stats/daily', {
        params: { date: selectedDate }
      });
      setReport(data);
    } catch (error) {
      console.error('Errore caricamento report:', error);
      showError('Errore nel caricamento del report giornaliero');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Caricamento report...</div>
      </div>
    );
  }

  const stats = report?.stats || {};

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: 0, color: '#1f2937' }}>📊 Report Giornaliero</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Statistiche principali */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
            €{(stats.revenue?.total || 0).toFixed(2)}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Ricavi Totali</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.contracts?.completed || 0}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Contratti Completati</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚲</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {stats.rentals?.bikes || 0}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Bici Noleggiate</div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏱️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {(stats.rentals?.averageHours || 0).toFixed(1)}h
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Durata Media</div>
        </div>
      </div>

      {/* Metodi di pagamento */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>💳 Metodi di Pagamento</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
              €{(stats.revenue?.cash || 0).toFixed(2)}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>💵 Contanti</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
              €{(stats.revenue?.card || 0).toFixed(2)}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>💳 Carta</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>
              €{(stats.revenue?.bank || 0).toFixed(2)}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>🏦 Bonifico</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
              €{(stats.revenue?.other || 0).toFixed(2)}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>🔄 Altro</div>
          </div>
        </div>
      </div>

      {/* Dettagli pagamenti */}
      {stats.payments && stats.payments.length > 0 && (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>📝 Dettagli Pagamenti</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#374151' }}>Ora</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#374151' }}>Importo</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#374151' }}>Metodo</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#374151' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {stats.payments.map((payment, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      {new Date(payment.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#059669' }}>
                      €{payment.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: payment.method === 'cash' ? '#fef3c7' : 
                                   payment.method === 'card' ? '#dbeafe' : '#f3e8ff',
                        color: payment.method === 'cash' ? '#92400e' : 
                               payment.method === 'card' ? '#1e40af' : '#6b21a8'
                      }}>
                        {payment.method === 'cash' ? '💵 Contanti' :
                         payment.method === 'card' ? '💳 Carta' :
                         payment.method === 'bank' ? '🏦 Bonifico' : '🔄 Altro'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                      {payment.notes || '-'}
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
}