export default function GlobalError() {
  return (
    <html>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          padding: '2rem',
          borderRadius: '1rem',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          textAlign: 'center',
          maxWidth: '28rem'
        }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#f87171', margin: '0 0 1rem 0' }}>Error</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 1.5rem 0' }}>An unexpected error occurred.</p>
          <button onClick={() => window.location.reload()} style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer'
          }}>Try Again</button>
        </div>
      </body>
    </html>
  );
}
