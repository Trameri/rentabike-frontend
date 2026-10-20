import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import LocationLogo from './Components/LocationLogo.jsx'
import NotificationProvider from './Components/NotificationSystem.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

import { getToken, clearToken } from './services/api.js'

const Login = lazy(() => import('./pages/LoginBeautiful.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Bikes = lazy(() => import('./pages/Bikes.jsx'))
const Accessories = lazy(() => import('./pages/Accessories.jsx'))
const Contracts = lazy(() => import('./pages/ContractsBeautiful.jsx'))
const ContractsTest = lazy(() => import('./pages/ContractsTest.jsx'))
const ContractsSimplified = lazy(() => import('./pages/ContractsSimplified.jsx'))
const BikeSwapManager = lazy(() => import('./pages/BikeSwapManager.jsx'))
const SystemDiagnostic = lazy(() => import('./pages/SystemDiagnostic.jsx'))
const ContractManager = lazy(() => import('./pages/ContractManager.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const DailyReport = lazy(() => import('./pages/DailyReport.jsx'))
const ContractHistory = lazy(() => import('./pages/ContractHistory.jsx'))
const UserManagement = lazy(() => import('./pages/UserManagement.jsx'))
const UserCredentials = lazy(() => import('./pages/UserCredentials.jsx'))
const BarcodeManagement = lazy(() => import('./pages/BarcodeManagement.jsx'))
const BarcodeTest = lazy(() => import('./Components/BarcodeTest.jsx'))
const WebcamTest = lazy(() => import('./Components/WebcamTest.jsx'))
const LogoTest = lazy(() => import('./pages/LogoTest.jsx'))
const ContractsOptimized = lazy(() => import('./pages/ContractsOptimized.jsx'))
const SystemStatus = lazy(() => import('./pages/SystemStatus.jsx'))
const BikesOptimized = lazy(() => import('./pages/BikesOptimized.jsx'))
const WebcamTestOptimized = lazy(() => import('./Components/WebcamTestOptimized.jsx'))
const PricingLogicTest = lazy(() => import('./Components/PricingLogicTest.jsx'))
const BikeManagement = lazy(() => import('./Components/BikeManagement.jsx'))
const BikeROIStats = lazy(() => import('./pages/BikeROIStats.jsx'))
const BikeROIDebug = lazy(() => import('./Components/BikeROIDebug.jsx'))
const ExcelExport = lazy(() => import('./pages/ExcelExport.jsx'))
const LocationDashboard = lazy(() => import('./pages/LocationDashboard.jsx'))

function Layout({ children }){
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const logout = ()=>{ clearToken(); window.location.replace('/') }

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

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
    ...(user?.role === 'superadmin' ? [{ path: '/user-credentials', icon: '🔐', label: 'Credenziali Utenti' }] : []),
    ...(user?.role === 'admin' || user?.role === 'superadmin' ? [{ path: '/system-diagnostic', icon: '🔧', label: 'Diagnostica' }] : [])
  ];

  return (
    <div className="app-shell" style={{
      height: '100dvh',
      overflow: 'hidden',
      background: '#f8fafc'
    }}>
      <button
        type="button"
        aria-label={isMenuOpen ? 'Chiudi menu' : 'Apri menu'}
        aria-expanded={isMenuOpen}
        aria-controls="main-navigation"
        onClick={() => setIsMenuOpen(open => !open)}
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 102,
          width: '42px',
          height: '42px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(15,23,42,0.25)',
          cursor: 'pointer'
        }}
      >
        <span style={{ width: '19px', height: '2px', background: '#fff', borderRadius: '2px' }} />
        <span style={{ width: '19px', height: '2px', background: '#fff', borderRadius: '2px' }} />
        <span style={{ width: '19px', height: '2px', background: '#fff', borderRadius: '2px' }} />
      </button>

      {isMenuOpen && (
        <button
          type="button"
          aria-label="Chiudi menu"
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            border: 0,
            background: 'rgba(15,23,42,0.45)',
            cursor: 'pointer'
          }}
        />
      )}

      <aside style={{
        position: 'fixed',
        inset: '0 auto 0 0',
        zIndex: 100,
        width: 'min(280px, calc(100vw - 52px))',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        color: '#fff',
        padding: '64px 16px 16px',
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        transform: isMenuOpen ? 'translateX(0)' : 'translateX(-105%)',
        visibility: isMenuOpen ? 'visible' : 'hidden',
        transition: `transform 220ms ease, visibility 0s linear ${isMenuOpen ? '0ms' : '220ms'}`
      }}>
        {/* Logo/Header */}
        <div style={{
          marginBottom: '16px',
          textAlign: 'center',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Logo dinamico della location */}
          <div style={{
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            padding: '10px',
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
        <nav id="main-navigation" aria-label="Navigazione principale" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          paddingRight: '4px'
        }}>
          {menuItems.map(item => (
            <Link 
              key={item.path}
              to={item.path} 
              onClick={() => setIsMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                minWidth: 0,
                overflowWrap: 'anywhere',
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
                e.target.style.transform = 'none';
                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                e.target.style.borderLeft = '3px solid #3b82f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#e2e8f0';
                e.target.style.transform = 'none';
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
            flexShrink: 0,
            marginTop: '12px',
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
      
      <main className="app-main" style={{
        height: '100dvh',
        overflowX: 'hidden',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        padding: '0 0 16px'
      }}>
        <div className="container app-content" style={{ paddingTop: '56px' }}>
          {children}
        </div>
      </main>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          aside { transition: none !important; }
        }
      `}</style>
    </div>
  )
}

export default function App(){
  const token = getToken();
  return (
    <AuthProvider>
      <NotificationProvider>
        <Suspense fallback={<div role="status">Caricamento...</div>}>
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
                  <Route path="/user-credentials" element={<UserCredentials />} />
                  <Route path="/location-dashboard/:locationId" element={<LocationDashboard />} />
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
        </Suspense>
      </NotificationProvider>
    </AuthProvider>
  )
}
