import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'
import NotificationCenter from '../components/NotificationCenter.jsx'

export default function DashboardFixed(){
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [superadminStats, setSuperadminStats] = useState(null)
  const [user, setUser] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeContracts, setActiveContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(()=>{
    // Decodifica il token per ottenere info utente
    const token = localStorage.getItem('token')
    if(token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
        console.log('User decoded:', decoded)
      } catch(e) {
        console.error('Errore decodifica token:', e)
        navigate('/login')
      }
    } else {
      navigate('/login')
    }
  }, [navigate])

  const loadData = async () => {
    if(!user) return
    
    setLoading(true)
    try{
      if(user.role === 'superadmin') {
        // Carica statistiche superadmin
        console.log('Loading superadmin stats...')
        try {
          const { data } = await api.get('/api/reports/superadmin-stats')
          console.log('Superadmin stats loaded:', data)
          setSuperadminStats(data)
          showNotification('Dashboard superadmin aggiornata', 'success')
        } catch (error) {
          console.error('Errore caricamento stats superadmin:', error)
          showNotification('Errore caricamento statistiche superadmin', 'error')
          // Fallback per superadmin
          setSuperadminStats({
            totals: { revenue: 0, closedContracts: 0, activeContracts: 0, totalContracts: 0, bikes: 0, accessories: 0 },
            locations: []
          })
        }
      } else {
        // Carica summary normale per admin location
        console.log('Loading location summary for:', user.location?.name || user.username)
        try {
          const { data } = await api.get('/api/reports/summary')
          console.log('Location summary loaded:', data)
          setSummary(data)
          showNotification(`Dashboard ${user.location?.name || user.username} aggiornata`, 'success')
        } catch (error) {
          console.error('Errore caricamento summary:', error)
          showNotification('Errore caricamento statistiche location', 'error')
          // Fallback per admin
          setSummary({ 
            total: 0, 
            count: 0, 
            activeContracts: 0,
            totalBikes: 0,
            availableBikes: 0,
            bikesInUse: 0,
            totalAccessories: 0,
            availableAccessories: 0,
            accessoriesInUse: 0
          })
        }
      }
      
      // Carica contratti attivi
      try {
        const contractsResponse = await api.get('/api/contracts', {
          params: { status: 'in-use', limit: 10 }
        })
        setActiveContracts(contractsResponse.data || [])
      } catch (error) {
        console.error('Errore caricamento contratti attivi:', error)
        setActiveContracts([])
      }

      setLastUpdate(new Date())
      
    } catch(error) {
      console.error('Errore generale caricamento dashboard:', error)
      showNotification('Errore generale nel caricamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if(user) {
      loadData()
    }
  }, [user])

  // Auto-refresh ogni 2 minuti
  useEffect(() => {
    if(!autoRefresh || !user) return
    
    const interval = setInterval(() => {
      console.log('Auto-refresh dashboard...')
      loadData()
    }, 120000) // 2 minuti
    
    return () => clearInterval(interval)
  }, [autoRefresh, user])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('it-IT')
  }

  if(!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <LocationLogo location={user.location} size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dashboard {user.role === 'superadmin' ? 'Superadmin' : user.location?.name || user.username}
                </h1>
                <p className="text-sm text-gray-500">
                  Benvenuto, {user.username} ({user.role})
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Centro Notifiche per Superadmin */}
              <NotificationCenter user={user} />
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>Aggiorna</span>
              </button>
              
              <button
                onClick={() => navigate('/contracts')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Nuovo Contratto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'superadmin' ? (
          // Dashboard Superadmin
          <div className="space-y-8">
            {/* Statistiche Generali */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Ricavi Totali</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(superadminStats?.totals?.revenue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Contratti Totali</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {superadminStats?.totals?.totalContracts || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Bici Totali</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {superadminStats?.totals?.bikes || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Accessori Totali</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {superadminStats?.totals?.accessories || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiche per Location */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Statistiche per Location</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {superadminStats?.locations?.map((locationStat) => (
                    <div key={locationStat.location._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <LocationLogo location={locationStat.location} size="xs" />
                          <h4 className="font-medium text-gray-900">{locationStat.location.name}</h4>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {locationStat.location.code}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ricavi:</span>
                          <span className="font-medium">{formatCurrency(locationStat.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Contratti:</span>
                          <span className="font-medium">{locationStat.totalContracts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bici:</span>
                          <span className="font-medium">{locationStat.bikes?.total || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Accessori:</span>
                          <span className="font-medium">{locationStat.accessories?.total || 0}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/reports?location=${locationStat.location._id}`)}
                            className="flex-1 bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100"
                          >
                            Reports
                          </button>
                          <button
                            onClick={() => navigate(`/bikes?location=${locationStat.location._id}`)}
                            className="flex-1 bg-green-50 text-green-600 px-3 py-1 rounded text-xs hover:bg-green-100"
                          >
                            Bici
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Dashboard Location Admin
          <div className="space-y-8">
            {/* Statistiche Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Ricavi</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(summary?.total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Contratti Attivi</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {summary?.activeContracts || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Bici Disponibili</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {summary?.availableBikes || 0}/{summary?.totalBikes || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Accessori Disponibili</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {summary?.availableAccessories || 0}/{summary?.totalAccessories || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Azioni Rapide */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Azioni Rapide</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => navigate('/contracts')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Nuovo Contratto</span>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/bikes')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Gestisci Bici</span>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/accessories')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Gestisci Accessori</span>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/reports')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Reports</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Contratti Attivi */}
            {activeContracts.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Contratti Attivi</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {activeContracts.slice(0, 5).map((contract) => (
                      <div key={contract._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{contract.customer?.name}</p>
                          <p className="text-sm text-gray-500">
                            {contract.items?.map(item => item.name).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(contract.totals?.grandTotal)}</p>
                          <p className="text-sm text-gray-500">{formatDate(contract.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeContracts.length > 5 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => navigate('/contracts')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Vedi tutti i contratti ({activeContracts.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          {lastUpdate && (
            <p>Ultimo aggiornamento: {formatDate(lastUpdate)}</p>
          )}
        </div>
      </div>
    </div>
  )
}