import { useState } from 'react'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import Starfield from '../components/ui/Starfield'

export default function LoginPage() {
  const { reload } = useAuth()
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authApi.localLogin(email, pass)
      await reload() // sets user in context → ProtectedRoutes redirects away from /login
    } catch {
      setError('Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Starfield />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', gap: 40,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2.2rem', letterSpacing: '0.3em', color: 'var(--gold)', marginBottom: 8 }}>
            AKASHIC
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.25em', color: 'var(--ink-dim)' }}>
            QUESTION ARCHIVE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 280 }}>
          {/* Password form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="form-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="form-input"
              type="password"
              placeholder="Password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete="current-password"
            />
            {error && (
              <div style={{ fontSize: '0.8rem', color: '#b03030', textAlign: 'center' }}>{error}</div>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? '…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--ink-dim)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
          </div>

          {/* Google */}
          <a
            href="/api/v1/auth/google"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 20px',
              border: '1px solid var(--border-dim)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-dim)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dim)')}
          >
            <GoogleIcon />
            SIGN IN WITH GOOGLE
          </a>
        </div>
      </div>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
