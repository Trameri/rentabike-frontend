import React, { useState, useEffect, createContext, useContext } from 'react'

// Context per le notifiche
const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications deve essere usato dentro NotificationProvider')
  }
  return context
}

// Provider delle notifiche
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    const newNotification = {
      id,
      timestamp: new Date(),
      ...notification
    }
    
    setNotifications(prev => [newNotification, ...prev])

    // Auto-rimozione dopo il timeout specificato
    if (notification.autoRemove !== false) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration || 5000)
    }

    return id
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  // Funzioni di utilità per diversi tipi di notifiche
  const showSuccess = (message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      icon: '✅',
      ...options
    })
  }

  const showError = (message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      icon: '❌',
      duration: 8000, // Errori rimangono più a lungo
      ...options
    })
  }

  const showWarning = (message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      icon: '⚠️',
      ...options
    })
  }

  const showInfo = (message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      icon: 'ℹ️',
      ...options
    })
  }

  const showContractUpdate = (contractId, action, details = {}) => {
    const messages = {
      created: `Nuovo contratto creato: ${contractId}`,
      updated: `Contratto aggiornato: ${contractId}`,
      completed: `Contratto completato: ${contractId}`,
      cancelled: `Contratto annullato: ${contractId}`,
      bike_swapped: `Bici sostituita nel contratto: ${contractId}`
    }

    return addNotification({
      type: 'contract',
      message: messages[action] || `Contratto ${contractId}: ${action}`,
      icon: '📋',
      contractId,
      action,
      details,
      duration: 7000
    })
  }

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showContractUpdate
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

// Componente per visualizzare le notifiche
function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '400px',
      width: '100%'
    }}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

// Singola notifica
function NotificationItem({ notification, onRemove }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Animazione di entrata
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(onRemove, 300) // Aspetta l'animazione di uscita
  }

  const getNotificationStyle = () => {
    const baseStyle = {
      marginBottom: '12px',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      border: '1px solid',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: isVisible && !isRemoving ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible && !isRemoving ? 1 : 0,
      maxHeight: isRemoving ? '0' : '200px',
      overflow: 'hidden'
    }

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        borderColor: '#10b981',
        color: '#065f46'
      },
      error: {
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        borderColor: '#ef4444',
        color: '#7f1d1d'
      },
      warning: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        borderColor: '#f59e0b',
        color: '#78350f'
      },
      info: {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        borderColor: '#3b82f6',
        color: '#1e3a8a'
      },
      contract: {
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        borderColor: '#6366f1',
        color: '#312e81'
      }
    }

    return {
      ...baseStyle,
      ...typeStyles[notification.type]
    }
  }

  return (
    <div
      style={getNotificationStyle()}
      onClick={handleRemove}
    >
      <div style={{ fontSize: '20px', flexShrink: 0 }}>
        {notification.icon}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: '600',
          fontSize: '14px',
          marginBottom: '4px',
          wordBreak: 'break-word'
        }}>
          {notification.message}
        </div>
        
        {notification.details && Object.keys(notification.details).length > 0 && (
          <div style={{
            fontSize: '12px',
            opacity: 0.8,
            marginTop: '8px'
          }}>
            {Object.entries(notification.details).map(([key, value]) => (
              <div key={key}>
                <strong>{key}:</strong> {value}
              </div>
            ))}
          </div>
        )}
        
        <div style={{
          fontSize: '11px',
          opacity: 0.6,
          marginTop: '8px'
        }}>
          {notification.timestamp.toLocaleTimeString('it-IT')}
        </div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleRemove()
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          opacity: 0.6,
          padding: '4px',
          borderRadius: '4px',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.6'}
      >
        ✕
      </button>
    </div>
  )
}

// Hook per notifiche di contratti
export function useContractNotifications() {
  const { showContractUpdate, showSuccess, showError } = useNotifications()

  const notifyContractCreated = (contractId, customerName) => {
    showContractUpdate('created', contractId, {
      'Cliente': customerName,
      'Azione': 'Contratto creato'
    })
  }

  const notifyContractUpdated = (contractId, changes) => {
    showContractUpdate('updated', contractId, changes)
  }

  const notifyBikeSwapped = (contractId, oldBike, newBike, reason) => {
    showContractUpdate('bike_swapped', contractId, {
      'Bici precedente': oldBike,
      'Nuova bici': newBike,
      'Motivo': reason
    })
  }

  const notifyContractCompleted = (contractId, customerName) => {
    showSuccess(`Contratto completato con successo per ${customerName}`, {
      duration: 6000
    })
  }

  return {
    notifyContractCreated,
    notifyContractUpdated,
    notifyBikeSwapped,
    notifyContractCompleted
  }
}

export default NotificationProvider