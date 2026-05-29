import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient, setToken } from '../api/connect'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/ui/MagicCircle'

const STATE_KEY = 'oauth_state'

export default function OAuthCallbackPage() {
  const navigate  = useNavigate()
  const { reload } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params  = new URLSearchParams(window.location.search)
    const code    = params.get('code')
    const state   = params.get('state')
    const stored  = sessionStorage.getItem(STATE_KEY)

    if (!code || !state || state !== stored) {
      navigate('/login', { replace: true })
      return
    }
    sessionStorage.removeItem(STATE_KEY)

    const redirectUri = window.location.origin + '/auth/callback'

    authClient.exchangeGoogleCode({ code, redirectUri })
      .then(res => {
        setToken(res.token)
        return reload()
      })
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login', { replace: true }))
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Spinner size={60} />
    </div>
  )
}
