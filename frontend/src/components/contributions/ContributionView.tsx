import { useState, type ReactNode } from 'react'
import type { Category, Contribution } from '../../types'
import { Input } from '../ui/FormField'
import { STATUS_META, DECISION_META } from './status'

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ', tf_ng: 'T/F/NG', yn_ng: 'Y/N/NG',
  sentence_completion: 'Sentence', form_completion: 'Form', short_answer: 'Short Answer',
  matching_headings: 'Match Headings', matching_information: 'Match Info', matching_features: 'Match Features',
}

function StatusBadge({ status }: { status: Contribution['status'] }) {
  const m = STATUS_META[status]
  return (
    <span style={{
      fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '2px 8px', border: `1px solid ${m.border}`, color: m.color, background: m.bg,
    }}>
      {m.label}
    </span>
  )
}

export default function ContributionView({ contribution, categories, actions, onComment, commenting }: {
  contribution: Contribution
  categories: Category[]
  actions?: ReactNode
  onComment?: (body: string) => void
  commenting?: boolean
}) {
  const p = contribution.proposed
  const catName = categories.find(c => c.id === p.category_id)?.name ?? `#${p.category_id}`
  const [draft, setDraft] = useState('')

  // Decisions and comments interleaved on one timeline, oldest → newest.
  const timeline = [
    ...contribution.reviews.map(r => ({ type: 'review' as const, at: r.created_at, review: r })),
    ...contribution.comments.map(c => ({ type: 'comment' as const, at: c.created_at, comment: c })),
  ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))

  const submit = () => {
    const body = draft.trim()
    if (!body || !onComment) return
    onComment(body)
    setDraft('')
  }

  return (
    <div style={{ position: 'relative', border: '1px solid var(--border-dim)', padding: '16px 20px', background: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between gap-4" style={{ marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 6 }}>
            <StatusBadge status={contribution.status} />
            <span style={{ fontSize: '0.6rem', padding: '1px 7px', border: '1px solid var(--border-dim)', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>
              {TYPE_LABELS[p.type] ?? p.type} · {p.difficulty} · {catName}
            </span>
            {contribution.contributor && (
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-dim)' }}>by {contribution.contributor.name}</span>
            )}
          </div>
          <div style={{ fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.5 }}>{p.content}</div>
        </div>
      </div>

      {/* Proposed answer detail */}
      {p.type === 'mcq' ? (
        <div className="flex flex-col gap-1" style={{ marginBottom: 8 }}>
          {(p.options ?? []).map(o => (
            <div key={o.key} style={{ fontSize: '0.82rem', color: (p.answers ?? []).includes(o.key) ? '#2a8a3a' : 'var(--ink-dim)' }}>
              <span style={{ fontFamily: 'Cinzel, serif', marginRight: 6 }}>{o.key}.</span>{o.text}
              {(p.answers ?? []).includes(o.key) && <span style={{ marginLeft: 6 }}>✓</span>}
            </div>
          ))}
        </div>
      ) : p.answer ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginBottom: 8 }}>
          Answer: <span style={{ color: '#2a8a3a' }}>{p.answer}</span>
        </div>
      ) : null}

      {p.tags.length > 0 && (
        <div className="flex flex-wrap gap-1" style={{ marginBottom: 8 }}>
          {p.tags.map(t => (
            <span key={t} style={{ fontSize: '0.6rem', padding: '1px 7px', border: '1px solid var(--border-dim)', color: 'var(--ink-dim)' }}>{t}</span>
          ))}
        </div>
      )}

      {/* Timeline: review decisions + comments, chronological */}
      {timeline.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 10, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {timeline.map(ev => ev.type === 'review' ? (
            <div key={`r${ev.review.id}`} style={{ fontSize: '0.78rem' }}>
              <span style={{ color: DECISION_META[ev.review.decision].color, fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {DECISION_META[ev.review.decision].label}
              </span>
              {ev.review.reviewer && <span style={{ color: 'var(--ink-dim)', marginLeft: 8 }}>{ev.review.reviewer.name}</span>}
              {ev.review.note && <span style={{ color: 'var(--ink)', marginLeft: 8 }}>— {ev.review.note}</span>}
            </div>
          ) : (
            <div key={`c${ev.comment.id}`} style={{ fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--gold-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                {ev.comment.author?.name ?? 'User'}
              </span>
              <span style={{ color: 'var(--ink)', marginLeft: 8 }}>{ev.comment.body}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comment composer */}
      {onComment && (
        <div className="flex gap-2 items-center" style={{ marginTop: 10 }}>
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a comment…"
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
          />
          <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
            disabled={commenting || !draft.trim()} onClick={submit}>
            {commenting ? '…' : 'Comment'}
          </button>
        </div>
      )}

      {actions && <div className="flex gap-2 items-center flex-wrap" style={{ marginTop: 10 }}>{actions}</div>}
    </div>
  )
}
