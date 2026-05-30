import { useState } from 'react'
import type { Category, Contribution, ProposedQuestion } from '../../types'
import {
  useMyContributions, useSubmitContribution, useUpdateContribution,
  useWithdrawContribution, useMergeContribution, useAddContributionComment,
} from '../../hooks/useContributions'
import OrnatePanel from '../ui/OrnatePanel'
import { Spinner } from '../ui/MagicCircle'
import ProposedQuestionForm from './ProposedQuestionForm'
import ContributionView from './ContributionView'
import { isNonTerminal } from './status'

export default function ContributeTab({ bankId, categories }: { bankId: string; categories: Category[] }) {
  const { data: mine = [], isLoading } = useMyContributions(bankId)
  const submit   = useSubmitContribution(bankId)
  const update   = useUpdateContribution(bankId)
  const withdraw = useWithdrawContribution(bankId)
  const merge    = useMergeContribution(bankId)
  const comment  = useAddContributionComment(bankId)

  const [composing, setComposing] = useState(false)
  const [editing,   setEditing]   = useState<number | null>(null)
  const [confirmWithdraw, setConfirmWithdraw] = useState<number | null>(null)

  const handleSubmit = async (proposed: ProposedQuestion) => {
    await submit.mutateAsync(proposed)
    setComposing(false)
  }
  const handleUpdate = async (id: number, proposed: ProposedQuestion) => {
    await update.mutateAsync({ id, proposed })
    setEditing(null)
  }

  const noCategories = categories.length === 0

  const actionsFor = (c: Contribution) => {
    if (!isNonTerminal(c.status)) return null
    return (
      <>
        {c.status === 'approved' && (
          <button className="btn btn-primary" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
            disabled={merge.isPending} onClick={() => merge.mutate(c.id)}>
            ⚔ Merge into bank
          </button>
        )}
        <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
          onClick={() => setEditing(c.id)}>Revise</button>
        {confirmWithdraw === c.id ? (
          <>
            <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px', color: '#b03030', borderColor: 'rgba(176,48,48,0.4)' }}
              onClick={() => { withdraw.mutate(c.id); setConfirmWithdraw(null) }}>Confirm withdraw</button>
            <button className="btn btn-ghost" style={{ fontSize: '0.62rem', padding: '4px 12px' }}
              onClick={() => setConfirmWithdraw(null)}>Cancel</button>
          </>
        ) : (
          <button className="btn-danger" style={{ fontSize: '0.62rem', padding: '4px 10px' }}
            onClick={() => setConfirmWithdraw(c.id)}>Withdraw</button>
        )}
      </>
    )
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

      {composing && (
        <OrnatePanel>
          <div className="section-title" style={{ marginBottom: 20 }}>Suggest a Question</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginBottom: 16 }}>
            Your proposal is reviewed by the bank’s editors. Once approved, you merge it into the bank yourself.
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
