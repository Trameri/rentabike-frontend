import React, { useState, useEffect } from 'react'

// Hook per gestire i toast
export const useToast = () => {
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (message, duration) => addToast(message, 'success', duration)
  const error = (message, duration) => addToast(message, 'error', duration)
  const warning = (message, duration) => addToast(message, 'warning', duration)
  const info = (message, duration) => addToast(message, 'info', duration)

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

// Componente Toast singolo
const ToastItem = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Animazione di entrata
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const getToastStyles = () => {
    const baseStyles = {
      background: 'white',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '12px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      maxWidth: '500px',
      transform: isVisible && !isRemoving ? 'translateX(0)' : 'translateX(100%)',
      opacity: isVisible && !isRemoving ? 1 : 0,
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }

    const typeStyles = {
      success: {
        borderLeft: '4px solid #10b981',
        background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
      },
      error: {
        borderLeft: '4px solid #ef4444',
        background: 'linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%)'
      },
      warning: {
        borderLeft: '4px solid #f59e0b',
        background: 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)'
      },
      info: {
        borderLeft: '4px solid #3b82f6',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)'
      }
    }

    return { ...baseStyles, ...typeStyles[toast.type] }
  }

  const getIcon = () => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }
    return icons[toast.type] || icons.info
  }

  const getTextColor = () => {
    const colors = {
      success: '#065f46',
      error: '#7f1d1d',
      warning: '#78350f',
      info: '#1e3a8a'
    }
    return colors[toast.type] || colors.info
  }

  return (
    <div
      style={getToastStyles()}
      onClick={handleRemove}
    >
      <div style={{
        fontSize: '20px',
        flexShrink: 0
      }}>
        {getIcon()}
      </div>
      
      <div style={{
        flex: 1,
        fontSize: '14px',
        fontWeight: '500',
        color: getTextColor(),
        lineHeight: '1.4'
      }}>
        {toast.message}
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
        onMouseEnter={(e) => e.target.style.opacity = 1}
        onMouseLeave={(e) => e.target.style.opacity = 0.6}
      >
        ✕
      </button>
    </div>
  )
}

// Container per i toast
export const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      <div style={{
        pointerEvents: 'auto'
      }}>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

// Provider per i toast (alternativa al NotificationSystem esistente)
export const ToastProvider = ({ children }) => {
  const toast = useToast()

  return (
    <>
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </>
  )
}

export default ToastItem