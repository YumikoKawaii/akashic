import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Starfield from '../components/ui/Starfield'
import { FormField, Input } from '../components/ui/FormField'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { login, register } = useAuth()

  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [pending,  setPending]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Something went wrong.')
    } finally {
      setPending(false)
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

        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* mode toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-dim)', borderRadius: 4 }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                style={{
                  flex: 1, padding: '8px 0',
                  fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.15em',
                  textTransform: 'uppercase', border: 'none', cursor: 'pointer', borderRadius: 3,
                  background: mode === m ? 'var(--gold-dim)' : 'transparent',
                  color: mode === m ? 'var(--bg)' : 'var(--ink-dim)',
                  transition: 'background 0.15s',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <FormField label="Name">
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </FormField>
            )}
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </FormField>
            <FormField label="Password">
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min. 6 characters' : ''}
                required
              />
            </FormField>

            {error && (
              <div style={{ fontSize: '0.8rem', color: '#b03030', padding: '8px 10px', border: '1px solid rgba(176,48,48,0.3)', borderRadius: 3 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {pending ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--ink-dim)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
          </div>

          <a
            href="/api/v1/auth/google"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '12px 28px',
              border: '1px solid var(--border-dim)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontFamily: 'Cinzel, serif',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
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
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
