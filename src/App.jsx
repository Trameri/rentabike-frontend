import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Login from './pages/LoginBeautiful.jsx'
import LocationLogo from './Components/LocationLogo.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Bikes from './pages/Bikes.jsx'
import Accessories from './pages/Accessories.jsx'
import Contracts from './pages/ContractsBeautiful.jsx'
import ContractsTest from './pages/ContractsTest.jsx'
import ContractsSimplified from './pages/ContractsSimplified.jsx'
import BikeSwapManager from './pages/BikeSwapManager.jsx'
import SystemDiagnostic from './pages/SystemDiagnostic.jsx'
import ContractManager from './pages/ContractManager.jsx'
import Reports from './pages/Reports.jsx'
import DailyReport from './pages/DailyReport.jsx'

import ContractHistory from './pages/ContractHistory.jsx'
import UserManagement from './pages/UserManagement.jsx'
import BarcodeManagement from './pages/BarcodeManagement.jsx'
import BarcodeTest from './Components/BarcodeTest.jsx'
import WebcamTest from './Components/WebcamTest.jsx'
import LogoTest from './pages/LogoTest.jsx'
import NotificationProvider from './Components/NotificationSystem.jsx'
import ContractsOptimized from './pages/ContractsOptimized.jsx'
import SystemStatus from './pages/SystemStatus.jsx'
import BikesOptimized from './pages/BikesOptimized.jsx'
import WebcamTestOptimized from './Components/WebcamTestOptimized.jsx'
import PricingLogicTest from './Components/PricingLogicTest.jsx'
import BikeManagement from './Components/BikeManagement.jsx'
import BikeROIStats from './pages/BikeROIStats.jsx'
import BikeROIDebug from './Components/BikeROIDebug.jsx'
import ExcelExport from './pages/ExcelExport.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

import { getToken, setToken, clearToken, api } from './services/api.js'

function Layout({ children }){
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const logout = ()=>{ 
    clearToken(); 
    window.location.href = '/';
  }

  useEffect(() => {
    (async () => {
      try {
        const response = await api('/auth/me');
        setUser(response.user);
      } catch (err) {
        console.error('Errore nel recupero utente:', err);
      }
    })();
  }, []);
  
  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/bikes', icon: '🚴', label: 'Bici' },
    { path: '/bike-management', icon: '🔧', label: 'Gestisci Bici' },
    { path: '/accessories', icon: '🎒', label: 'Accessori' },
    { path: '/contracts', icon: '📋', label: 'Nuovo Contratto' },
    { path: '/contract-manager', icon: '⚙️', label: 'Gestisci Contratti' },
    { path: '/bike-swap', icon: '🔄', label: 'Sostituzioni Bici' },
    { path: '/barcodes', icon: '🏷️', label: 'Gestione Barcode' },
    { path: '/barcode-test', icon: '🧪', label: 'Test Barcode' },

    { path: '/history', icon: '📚', label: 'Storico' },
    { path: '/reports', icon: '📈', label: 'Report' },
    { path: '/bike-roi-stats', icon: '💰', label: 'ROI Bici' },
    { path: '/bike-roi-debug', icon: '🔍', label: 'Debug ROI' },
    { path: '/excel-export', icon: '📊', label: 'Esporta Excel' },
    ...(user?.role === 'superadmin' ? [{ path: '/users', icon: '👥', label: 'Gestione Utenti' }] : []),
    ...(user?.role === 'admin' || user?.role === 'superadmin' ? [{ path: '/system-diagnostic', icon: '🔧', label: 'Diagnostica' }] : [])
  ];

  return (
    <div style={{
      display: 'grid', 
      gridTemplateColumns: '280px 1fr', 
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <aside style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        color: '#fff',
        padding: '24px',
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        borderRight: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Logo/Header */}
        <div style={{
          marginBottom: '32px',
          textAlign: 'center',
          paddingBottom: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Logo dinamico della location */}
          <div style={{
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            padding: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <LocationLogo 
              locationName={user?.location?.name || user?.username} 
              size="header"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}
            />
          </div>
          
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Rent a Bike</h2>
          
          {user?.location?.name && (
            <p style={{
              margin: '8px 0 4px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#60a5fa'
            }}>
              {user.location.name}
            </p>
          )}
          
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Sistema di Gestione</p>
        </div>

        {/* Navigation */}
        <nav style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {menuItems.map(item => (
            <Link 
              key={item.path}
              to={item.path} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#e2e8f0',
                textDecoration: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)';
                e.target.style.color = '#fff';
                e.target.style.transform = 'translateX(8px)';
                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                e.target.style.borderLeft = '3px solid #3b82f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#e2e8f0';
                e.target.style.transform = 'translateX(0)';
                e.target.style.boxShadow = 'none';
                e.target.style.borderLeft = 'none';
              }}
            >
              <span style={{fontSize: '16px'}}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout button */}
        <button 
          onClick={logout} 
          style={{
            width: '100%',
            marginTop: '32px',
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.2)';
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            e.target.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.1)';
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            e.target.style.color = '#fca5a5';
          }}
        >
          🚪 Esci
        </button>
      </aside>
      
      <main style={{
        padding: '32px',
        overflow: 'auto'
      }}>
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function App(){
  const token = getToken();
  return (
    <AuthProvider>
      <NotificationProvider>
        <Routes>
        {!token && <Route path="/*" element={<Login />} />}
        {token && (
          <Route path="/*" element={<Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bikes" element={<Bikes />} />
              <Route path="/bike-management" element={<BikeManagement />} />
              <Route path="/accessories" element={<Accessories />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contracts-test" element={<ContractsTest />} />
              <Route path="/contracts-simple" element={<ContractsSimplified />} />
              <Route path="/bike-swap" element={<BikeSwapManager />} />
              <Route path="/system-diagnostic" element={<SystemDiagnostic />} />
              <Route path="/contract-manager" element={<ContractManager />} />
              <Route path="/barcodes" element={<BarcodeManagement />} />
              <Route path="/barcode-test" element={<BarcodeTest />} />

              <Route path="/history" element={<ContractHistory />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/bike-roi-stats" element={<BikeROIStats />} />
              <Route path="/bike-roi-debug" element={<BikeROIDebug />} />
              <Route path="/excel-export" element={<ExcelExport />} />
              <Route path="/daily-report" element={<DailyReport />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/webcam-test" element={<WebcamTest />} />
              <Route path="/webcam-test-optimized" element={<WebcamTestOptimized />} />
              <Route path="/logo-test" element={<LogoTest />} />
              <Route path="/contracts-optimized" element={<ContractsOptimized />} />
              <Route path="/system-status" element={<SystemStatus />} />
              <Route path="/bikes-optimized" element={<BikesOptimized />} />
              <Route path="/pricing-test" element={<PricingLogicTest />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Layout>} />
        )}
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  )
}
