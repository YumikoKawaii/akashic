import { useState, useEffect } from 'react'
import { authClient } from '../api/connect'

const STATE_KEY = 'oauth_state'

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  // Navigating Back from Google can restore this page from the bfcache exactly
  // as it was frozen — mid-redirect, with the button stuck on "REDIRECTING…".
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setLoading(false) }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const res = await authClient.getGoogleAuthURL({})
      sessionStorage.setItem(STATE_KEY, res.state)
      window.location.href = res.url
    } catch {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', gap: 40,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
            <svg width="34" height="34" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 1.5v4.2L2.9 12.6a1.3 1.3 0 0 0 1.1 1.9h8a1.3 1.3 0 0 0 1.1-1.9L9.5 5.7V1.5M5.5 1.5h5" stroke="var(--gold)" strokeLinejoin="round" strokeLinecap="round" /><circle cx="7" cy="11.8" r="0.8" fill="var(--gold)" /><circle cx="9.4" cy="12.6" r="0.55" fill="var(--gold)" /></svg>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: '2.8rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>Akashic</span>
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--ink-dim)' }}>
            Your question archive
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '12px 24px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--bg-elevated)',
            color: 'var(--ink)',
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '0.95rem',
            fontWeight: 500,
            textDecoration: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'var(--ink-dim)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <GoogleIcon />
          {loading ? 'Redirecting…' : 'Sign in with Google'}
        </button>
      </div>
    </>
  )
}
