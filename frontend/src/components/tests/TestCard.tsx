import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Test } from '../../types'
import DifficultyBar from '../ui/DifficultyBar'
import { useDeleteTest } from '../../hooks/useTests'
import { useStartAttempt, useTestAttempts } from '../../hooks/useAttempts'

interface Props { test: Test; bankId: string }

export default function TestCard({ test, bankId }: Props) {
  const navigate    = useNavigate()
  const del         = useDeleteTest(bankId)
  const start       = useStartAttempt()
  const [showHistory, setShowHistory] = useState(false)
  const { data: attempts = [] } = useTestAttempts(bankId, test.id)

  const handleStart = async () => {
    const attempt = await start.mutateAsync({ bankId, testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const cfg   = test.config
  const total = (cfg.easy_count ?? 0) + (cfg.medium_count ?? 0) + (cfg.hard_count ?? 0)

  const completed = attempts.filter(a => a.completed_at)

  return (
    <div className="test-card">
      <div className="test-card-title">{test.name}</div>
      <div className="test-card-meta">
        {total} questions<br />
        {new Date(test.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>

      <DifficultyBar
        easy={cfg.easy_count ?? 0}
        medium={cfg.medium_count ?? 0}
        hard={cfg.hard_count ?? 0}
        total={10}
      />

      <div className="test-card-footer">
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
          onClick={() => { if (confirm('Delete this test?')) del.mutate(test.id) }}
        >✕</button>
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
  )
}
