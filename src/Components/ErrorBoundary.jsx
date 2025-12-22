import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // Log dell'errore per debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#fef2f2',
          borderRadius: '12px',
          border: '2px solid #fecaca',
          margin: '20px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px'
          }}>
            😵
          </div>
          
          <h2 style={{
            color: '#dc2626',
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '12px'
          }}>
            Oops! Qualcosa è andato storto
          </h2>
          
          <p style={{
            color: '#7f1d1d',
            fontSize: '16px',
            marginBottom: '24px'
          }}>
            Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Ricarica Pagina
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              style={{
                background: 'white',
                color: '#dc2626',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🏠 Torna alla Dashboard
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{
              marginTop: '24px',
              textAlign: 'left',
              background: '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Dettagli Errore (Development)
              </summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary