import { useEffect } from 'react'
import RuneCorners from './RuneCorners'

interface Props {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirm, onCancel])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(20,14,4,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: '1px solid var(--gold-dim)',
          padding: '32px 36px 28px',
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 8px 48px rgba(20,14,4,0.38), 0 0 0 1px var(--border-dim)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <RuneCorners color="var(--gold-dim)" opacity={0.5} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.6rem',
            letterSpacing: '0.28em',
            color: 'var(--gold-dim)',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            Confirmation
          </p>

          <p style={{
            fontFamily: 'EB Garamond, serif',
            fontSize: '1rem',
            color: 'var(--ink)',
            lineHeight: 1.65,
            marginBottom: 28,
          }}>
            {message}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ clipPath: 'none' }} onClick={onCancel} autoFocus>
              Cancel
            </button>
            <button className="btn btn-danger" style={{ clipPath: 'none', fontSize: '0.63rem', padding: '9px 22px' }} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
