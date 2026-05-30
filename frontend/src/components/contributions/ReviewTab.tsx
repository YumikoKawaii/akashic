import { useState } from 'react'
import type { Category, Contribution, ContributionStatus, ReviewDecision } from '../../types'
import { useContributionQueue, useReviewContribution, useAddContributionComment } from '../../hooks/useContributions'
import { Spinner } from '../ui/MagicCircle'
import { Input } from '../ui/FormField'
import Select from '../ui/Select'
import ContributionView from './ContributionView'
import { STATUS_META } from './status'

const FILTERS: Array<{ value: ContributionStatus | ''; label: string }> = [
  { value: '',                  label: 'All' },
  { value: 'pending',           label: 'Pending' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'approved',          label: 'Approved' },
  { value: 'rejected',          label: 'Rejected' },
  { value: 'merged',            label: 'Merged' },
]

// Reviewable = the queue can still act on it (not yet approved/rejected/merged).
const isReviewable = (s: ContributionStatus) => s === 'pending' || s === 'changes_requested'

export default function ReviewTab({ bankId, categories }: { bankId: string; categories: Category[] }) {
  const { data: queue = [], isLoading } = useContributionQueue(bankId)
  const review = useReviewContribution(bankId)
  const comment = useAddContributionComment(bankId)

  const [filter, setFilter] = useState<ContributionStatus | ''>('')
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const shown = filter ? queue.filter(c => c.status === filter) : queue

  const act = async (id: number, decision: ReviewDecision) => {
    await review.mutateAsync({ id, decision, note: note.trim() })
    setNoteFor(null)
    setNote('')
  }

  const actionsFor = (c: Contribution) => {
    if (!isReviewable(c.status)) {
      return <span style={{ fontSize: '0.75rem', color: STATUS_META[c.status].color }}>{STATUS_META[c.status].label}</span>
    }
    return (
      <>
        {noteFor === c.id ? (
          <div className="flex flex-col gap-2" style={{ width: '100%' }}>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note to the contributor…" />
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-primary" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
                disabled={review.isPending} onClick={() => act(c.id, 'approve')}>✓ Approve</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px', color: '#b06a18', borderColor: 'rgba(176,106,24,0.4)' }}
                disabled={review.isPending} onClick={() => act(c.id, 'request_changes')}>↩ Request Changes</button>
              <button className="btn-danger" style={{ fontSize: '0.62rem', padding: '4px 10px' }}
                disabled={review.isPending} onClick={() => act(c.id, 'reject')}>✕ Reject</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
                onClick={() => { setNoteFor(null); setNote('') }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
            onClick={() => { setNoteFor(c.id); setNote('') }}>Review</button>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="section-title" style={{ marginBottom: 0 }}>Review Queue ({shown.length})</div>
        <div style={{ width: 200 }}>
          <Select value={filter} onChange={v => setFilter(v as ContributionStatus | '')} options={FILTERS} />
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
        Approving lets the contributor merge their question into the bank — it isn’t added until they do.
      </p>

      {isLoading ? (
        <div className="flex justify-center" style={{ padding: 24 }}><Spinner /></div>
      ) : shown.length === 0 ? (
        <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
          Nothing to review here.
        </div>
      ) : (
        <div className="flex flex-col gap-3" style={{ maxWidth: 760 }}>
          {shown.map(c => (
            <ContributionView
              key={c.id}
              contribution={c}
              categories={categories}
              actions={actionsFor(c)}
              onComment={body => comment.mutate({ id: c.id, body })}
              commenting={comment.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
