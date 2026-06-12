import { useState } from 'react'
import type { Category, Contribution, ContributorAction, ProposedQuestion } from '../../types'
import {
  useMyContributions, useSubmitContribution, useUpdateContribution,
  useTransitionContribution, useMergeContribution, useAddContributionComment,
} from '../../hooks/useContributions'
import OrnatePanel from '../ui/OrnatePanel'
import { Spinner } from '../ui/MagicCircle'
import ProposedQuestionForm from './ProposedQuestionForm'
import ContributionView from './ContributionView'

const ghost = { fontSize: '0.62rem', padding: '4px 12px' } as const
const danger = { fontSize: '0.62rem', padding: '4px 10px' } as const

export default function ContributeTab({ bankId, categories }: { bankId: string; categories: Category[] }) {
  const { data: mine = [], isLoading } = useMyContributions(bankId)
  const submit     = useSubmitContribution(bankId)
  const update     = useUpdateContribution(bankId)
  const transition = useTransitionContribution(bankId)
  const merge      = useMergeContribution(bankId)
  const comment    = useAddContributionComment(bankId)

  const [composing, setComposing] = useState(false)
  const [editing,   setEditing]   = useState<number | null>(null)
  const [confirm,   setConfirm]   = useState<{ id: number; action: ContributorAction } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (proposed: ProposedQuestion) => {
    try {
      await submit.mutateAsync(proposed)
      setComposing(false)
      setFormError(null)
    } catch {
      setFormError('Submitting the proposal failed — please try again.')
    }
  }
  const handleUpdate = async (id: number, proposed: ProposedQuestion) => {
    try {
      await update.mutateAsync({ id, proposed })
      setEditing(null)
      setFormError(null)
    } catch {
      setFormError('Saving the revision failed — please try again.')
    }
  }

  const noCategories = categories.length === 0

  const tBtn = (c: Contribution, action: ContributorAction, label: string) => (
    <button key={action} className="btn btn-ghost" style={ghost}
      disabled={transition.isPending} onClick={() => transition.mutate({ id: c.id, action })}>{label}</button>
  )

  // Withdraw/close are destructive-ish, so confirm first.
  const confirmBtn = (c: Contribution, action: ContributorAction, label: string, confirmLabel: string) =>
    confirm?.id === c.id && confirm.action === action ? (
      <span key={action} className="flex gap-2">
        <button className="btn btn-ghost" style={{ ...ghost, color: '#b03030', borderColor: 'rgba(176,48,48,0.4)' }}
          onClick={() => { transition.mutate({ id: c.id, action }); setConfirm(null) }}>{confirmLabel}</button>
        <button className="btn btn-ghost" style={ghost} onClick={() => setConfirm(null)}>Cancel</button>
      </span>
    ) : (
      <button key={action} className="btn-danger" style={danger}
        onClick={() => setConfirm({ id: c.id, action })}>{label}</button>
    )

  const reviseBtn = (c: Contribution) => (
    <button key="revise" className="btn btn-ghost" style={ghost} onClick={() => setEditing(c.id)}>Revise</button>
  )
  const mergeBtn = (c: Contribution) => (
    <button key="merge" className="btn btn-primary" style={ghost}
      disabled={merge.isPending} onClick={() => merge.mutate(c.id)}>⚔ Merge into record</button>
  )

  // Contributor actions available per state (the server's nextStatus is the
  // source of truth; this mirrors it for the UI).
  const actionsFor = (c: Contribution) => {
    const withdraw = confirmBtn(c, 'withdraw', 'Withdraw', 'Confirm withdraw')
    const close    = confirmBtn(c, 'close', 'Close', 'Confirm close')
    switch (c.status) {
      case 'approved':          return <>{mergeBtn(c)}{reviseBtn(c)}{withdraw}{close}</>
      case 'changes_requested': return <>{tBtn(c, 'resubmit', '↺ Re-request review')}{reviseBtn(c)}{withdraw}{close}</>
      case 'pending':           return <>{reviseBtn(c)}{withdraw}{close}</>
      case 'rejected':
      case 'withdrawn':         return <>{tBtn(c, 'reopen', '↺ Reopen')}{close}</>
      default:                  return null // merged / closed are terminal
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="section-title" style={{ marginBottom: 0 }}>My Contributions ({mine.length})</div>
        {!composing && !noCategories && (
          <button className="btn btn-ghost" onClick={() => setComposing(true)}>＋ Suggest a Question</button>
        )}
      </div>

      {noCategories && (
        <div style={{ color: 'var(--ink-dim)', fontSize: '0.85rem' }}>
          This bank has no categories yet, so questions can’t be proposed.
        </div>
      )}

      {formError && (
        <div style={{ padding: '10px 14px', background: 'rgba(176,48,48,0.06)', border: '1px solid rgba(176,48,48,0.3)', fontSize: '0.85rem', color: '#b03030', cursor: 'pointer' }}
          onClick={() => setFormError(null)}>
          {formError} <span style={{ opacity: 0.6 }}>✕</span>
        </div>
      )}

      {composing && (
        <OrnatePanel>
          <div className="section-title" style={{ marginBottom: 20 }}>Suggest a Question</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginBottom: 16 }}>
            Your proposal is reviewed by the record’s editors. Once approved, you merge it into the record yourself.
          </p>
          <ProposedQuestionForm
            categories={categories}
            submitLabel="⚔ Submit Proposal"
            pending={submit.isPending}
            onSubmit={handleSubmit}
            onCancel={() => setComposing(false)}
          />
        </OrnatePanel>
      )}

      {isLoading ? (
        <div className="flex justify-center" style={{ padding: 24 }}><Spinner /></div>
      ) : mine.length === 0 && !composing ? (
        <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '24px 0', textAlign: 'center' }}>
          You haven’t proposed any questions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3" style={{ maxWidth: 760 }}>
          {mine.map(c => editing === c.id ? (
            <OrnatePanel key={c.id}>
              <div className="section-title" style={{ marginBottom: 16 }}>Revise Proposal</div>
              <ProposedQuestionForm
                categories={categories}
                initial={c.proposed}
                submitLabel="⚔ Save & Resubmit"
                pending={update.isPending}
                onSubmit={p => handleUpdate(c.id, p)}
                onCancel={() => setEditing(null)}
              />
            </OrnatePanel>
          ) : (
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
