import { useDeletedQuestions, useRestoreQuestion } from '../../hooks/useQuestions'
import { useDeletedTests, useRestoreTest } from '../../hooks/useTests'
import { TypeTag, DifficultyTag } from '../ui/Tag'
import Spinner from '../ui/Spinner'

const when = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

function Row({ title, meta, children, onRestore, pending }: {
  title: string; meta: string; children?: React.ReactNode; onRestore: () => void; pending: boolean
}) {
  return (
    <div className="q-card" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
          {children}
          <span>{meta}</span>
        </div>
      </div>
      <button className="btn btn-ghost" onClick={onRestore} disabled={pending}>{pending ? 'Restoring…' : 'Restore'}</button>
    </div>
  )
}

export default function TrashTab({ bankId, canEdit }: { bankId: string; canEdit: boolean }) {
  const { data: questions = [], isLoading: qLoading } = useDeletedQuestions(bankId, canEdit)
  const { data: tests = [], isLoading: tLoading }     = useDeletedTests(bankId)
  const restoreQuestion = useRestoreQuestion(bankId)
  const restoreTest     = useRestoreTest(bankId)

  if ((canEdit && qLoading) || tLoading) {
    return <div className="flex justify-center" style={{ padding: 40 }}><Spinner /></div>
  }

  return (
    <>
      <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink-dim)' }}>
        Deleted items stay here until restored. {canEdit ? 'Editors see every deleted question and test.' : 'You can restore tests you generated.'}
      </p>

      {canEdit && (
        <>
          <div className="section-title" style={{ marginBottom: 0 }}>Questions ({questions.length})</div>
          {questions.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '8px 0' }}>No deleted questions.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {questions.map(q => (
                <Row
                  key={q.id}
                  title={q.item?.content ?? q.choice?.content ?? ''}
                  meta={q.group_id ? 'part of a group' : ''}
                  onRestore={() => restoreQuestion.mutate(q.id)}
                  pending={restoreQuestion.isPending && restoreQuestion.variables === q.id}
                >
                  <TypeTag type={q.type} />
                  <DifficultyTag difficulty={q.difficulty} />
                </Row>
              ))}
            </div>
          )}
        </>
      )}

      <div className="section-title" style={{ marginBottom: 0 }}>Tests ({tests.length})</div>
      {tests.length === 0 ? (
        <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '8px 0' }}>No deleted tests.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {tests.map(t => {
            const n = t.config.easy_count + t.config.medium_count + t.config.hard_count
            return (
              <Row
                key={t.id}
                title={t.name}
                meta={`${n} question${n !== 1 ? 's' : ''} · ${when(t.created_at)}${t.creator ? ` · by ${t.creator.name}` : ''}`}
                onRestore={() => restoreTest.mutate(t.id)}
                pending={restoreTest.isPending && restoreTest.variables === t.id}
              />
            )
          })}
        </div>
      )}
    </>
  )
}
