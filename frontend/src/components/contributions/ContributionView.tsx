import type { ReactNode } from 'react'
import type { Category, Contribution } from '../../types'
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

export default function ContributionView({ contribution, categories, actions }: {
  contribution: Contribution
  categories: Category[]
  actions?: ReactNode
}) {
  const p = contribution.proposed
  const catName = categories.find(c => c.id === p.category_id)?.name ?? `#${p.category_id}`

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

      {/* Review history */}
      {contribution.reviews.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 8, marginTop: 4 }}>
          {contribution.reviews.map(r => {
            const dm = DECISION_META[r.decision]
            return (
              <div key={r.id} style={{ fontSize: '0.78rem', marginBottom: 4 }}>
                <span style={{ color: dm.color, fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{dm.label}</span>
                {r.reviewer && <span style={{ color: 'var(--ink-dim)', marginLeft: 8 }}>{r.reviewer.name}</span>}
                {r.note && <span style={{ color: 'var(--ink)', marginLeft: 8 }}>— {r.note}</span>}
              </div>
            )
          })}
        </div>
      )}

      {actions && <div className="flex gap-2 items-center flex-wrap" style={{ marginTop: 10 }}>{actions}</div>}
    </div>
  )
}
