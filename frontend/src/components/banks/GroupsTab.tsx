import { useState } from 'react'
import { QuestionGroup } from '../../types'
import { useQuestionGroups } from '../../hooks/useQuestions'
import { DifficultyTag, CategoryTag } from '../ui/Tag'
import Spinner from '../ui/Spinner'
import EditGroupDialog from './EditGroupDialog'

export default function GroupsTab({ bankId, canEdit }: { bankId: string; canEdit: boolean }) {
  const { data: groups = [], isLoading } = useQuestionGroups(bankId)
  const [editing, setEditing] = useState<QuestionGroup | null>(null)

  return (
    <>
      <div className="section-title" style={{ marginBottom: 0 }}>Groups ({groups.length})</div>

      {isLoading ? (
        <div className="flex justify-center" style={{ padding: 40 }}><Spinner /></div>
      ) : groups.length === 0 ? (
        <div style={{ color: 'var(--ink-dim)', fontSize: '0.9rem', padding: '24px 0', textAlign: 'center', lineHeight: 1.6 }}>
          No groups yet. Import a JSON or YAML file with a <code style={{ fontFamily: 'IBM Plex Mono, monospace' }}>questions</code> list to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map(({ group, question_count }) => (
            <article key={group.id} className="test-card" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="test-card-title" style={{ marginBottom: 4 }}>{group.title || 'Untitled group'}</div>
                  <div className="test-card-meta">{question_count} question{question_count !== 1 ? 's' : ''} · {group.options.length} option{group.options.length !== 1 ? 's' : ''}</div>
                </div>
                {canEdit && <button className="btn btn-ghost" onClick={() => setEditing(group)}>Edit</button>}
              </div>
              {group.instructions && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.5 }}>{group.instructions}</p>
              )}
              {group.passage && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-dim)', lineHeight: 1.55, maxHeight: 64, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 55%, transparent)' }}>
                  {group.passage}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                <DifficultyTag difficulty={group.difficulty} />
                {group.tags.map(t => <CategoryTag key={t} name={t} />)}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <EditGroupDialog bankId={bankId} group={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
