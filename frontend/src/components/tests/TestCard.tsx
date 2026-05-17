import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Test } from '../../types'
import DifficultyBar from '../ui/DifficultyBar'
import { useDeleteTest } from '../../hooks/useTests'
import { useStartAttempt, useTestAttempts } from '../../hooks/useAttempts'
import MagicCircle from '../ui/MagicCircle'

const DIFF_COLOR: Record<string, string> = {
  easy: '#2a8a3a', medium: '#9a7018', hard: '#b03030',
}

interface Props { test: Test; bankId: string }

export default function TestCard({ test, bankId }: Props) {
  const navigate    = useNavigate()
  const del         = useDeleteTest(bankId)
  const start       = useStartAttempt()
  const [showHistory,  setShowHistory]  = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { data: attempts = [] } = useTestAttempts(bankId, test.id)

  const handleStart = async () => {
    const attempt = await start.mutateAsync({ bankId, testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const cfg   = test.config
  const total = (cfg.easy_count ?? 0) + (cfg.medium_count ?? 0) + (cfg.hard_count ?? 0)

  const completed = attempts.filter(a => a.completed_at)

  const dominant = cfg.hard_count >= cfg.medium_count && cfg.hard_count >= cfg.easy_count
    ? 'hard' : cfg.medium_count >= cfg.easy_count ? 'medium' : 'easy'
  const diffColor = DIFF_COLOR[dominant]

  return (
    <div className="test-card">
      {/* Top-left — dominant difficulty color */}
      <div style={{ position: 'absolute', top: -44, left: -44, width: 110, height: 110, color: diffColor, opacity: 0.55, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="full" speed={5} />
      </div>
      {/* Bottom-right — purple */}
      <div style={{ position: 'absolute', bottom: -44, right: -44, width: 110, height: 110, color: '#6b4c8a', opacity: 0.45, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="full" speed={5} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="test-card-title">{test.name}</div>
      <div className="test-card-meta">
        {total} questions<br />
        {new Date(test.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>

      <DifficultyBar
        easy={cfg.easy_count ?? 0}
        medium={cfg.medium_count ?? 0}
        hard={cfg.hard_count ?? 0}
        total={total}
      />

      <div className="test-card-footer">
        {confirmDelete ? (
          <>
            <span style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
              Delete?
            </span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.6rem', padding: '4px 10px', color: '#b03030', borderColor: 'rgba(176,48,48,0.4)' }}
              onClick={() => del.mutate(test.id)}
              disabled={del.isPending}
            >
              {del.isPending ? '…' : 'Yes'}
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.6rem', padding: '4px 10px' }}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" style={{ fontSize: '0.6rem', padding: '6px 14px' }} onClick={handleStart} disabled={start.isPending}>
              {start.isPending ? '…' : '▶ Start'}
            </button>
            {completed.length > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.6rem', padding: '6px 14px' }}
                onClick={() => setShowHistory(v => !v)}
              >
                {showHistory ? '▴ History' : `▾ History (${completed.length})`}
              </button>
            )}
            <button
              className="btn-danger"
              style={{ marginLeft: 'auto' }}
              onClick={() => setConfirmDelete(true)}
            >✕</button>
          </>
        )}
      </div>

      {showHistory && completed.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border-dim)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {completed.map(a => {
            const pct   = a.total ? Math.round((a.score! / a.total) * 100) : 0
            const grade = pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D'
            const color = { S: '#c89030', A: '#2a8a3a', B: '#3a60c0', C: '#b8942a', D: '#b03030' }[grade]
            const date  = new Date(a.completed_at!).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/attempts/${a.id}/results`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', cursor: 'pointer', borderRadius: 3,
                  fontSize: '0.75rem', color: 'var(--ink-dim)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(154,112,24,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{date}</span>
                <span style={{ fontFamily: 'Cinzel, serif', color, fontSize: '0.7rem' }}>
                  {a.score}/{a.total} · {grade}
                </span>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
