import { useNavigate } from 'react-router-dom'
import { Test } from '../../types'
import DifficultyBar from '../ui/DifficultyBar'
import { useDeleteTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

interface Props { test: Test; bankId: string }

export default function TestCard({ test, bankId }: Props) {
  const navigate    = useNavigate()
  const del         = useDeleteTest(bankId)
  const start       = useStartAttempt()

  const handleStart = async () => {
    const attempt = await start.mutateAsync({ bankId, testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const cfg = test.config
  const total = (cfg.easy_count ?? 0) + (cfg.medium_count ?? 0) + (cfg.hard_count ?? 0)

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
        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.6rem', padding: '6px 14px' }}
          onClick={() => navigate(`/banks/${bankId}/tests/${test.id}`)}
        >
          View
        </button>
        <button
          className="btn-danger"
          style={{ marginLeft: 'auto' }}
          onClick={() => { if (confirm('Delete this test?')) del.mutate(test.id) }}
        >✕</button>
      </div>
    </div>
  )
}
