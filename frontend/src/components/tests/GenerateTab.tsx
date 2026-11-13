import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, GroupMode } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useTags } from '../../hooks/useQuestions'
import { useStartAttempt } from '../../hooks/useAttempts'

type DiffMode = 'difficulty' | 'count'

const TYPE_OPTIONS = [
  { value: 'mcq',                  label: 'MCQ' },
  { value: 'tf_ng',                label: 'T/F/NG' },
  { value: 'yn_ng',                label: 'Y/N/NG' },
  { value: 'sentence_completion',  label: 'Sentence' },
  { value: 'form_completion',      label: 'Form' },
  { value: 'short_answer',         label: 'Short Answer' },
  { value: 'matching_headings',    label: 'Match Headings' },
  { value: 'matching_information', label: 'Match Info' },
  { value: 'matching_features',    label: 'Match Features' },
]

const NUM = { width: 52, textAlign: 'center' as const, padding: '4px 4px' }

const DIFF = {
  easy:   { dot: '#1F7A72', border: 'rgba(31,122,114,0.45)',   bg: 'rgba(31,122,114,0.07)'  },
  medium: { dot: '#B85A0A', border: 'rgba(184,90,10,0.45)',  bg: 'rgba(184,90,10,0.07)' },
  hard:   { dot: '#A3222D', border: 'rgba(163,34,45,0.45)',   bg: 'rgba(163,34,45,0.07)'  },
} as const

function autoSplit(total: number): [number, number, number] {
  const e = Math.round(total * 0.25)
  const h = Math.round(total * 0.25)
  return [e, Math.max(0, total - e - h), h]
}

/* ── Pill toggle ──────────────────────────────────────────────── */
function SegToggle<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1" role="group" style={{ background: 'var(--bg)', padding: 3, borderRadius: 8, flexShrink: 0 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value} style={{
          fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', fontWeight: value === o.value ? 500 : 400,
          padding: '6px 14px', border: 'none', cursor: 'pointer', borderRadius: 6,
          background: value === o.value ? 'var(--bg-elevated)' : 'transparent',
          boxShadow:  value === o.value ? '0 1px 2px rgba(43,29,31,0.12)' : 'none',
          color:      value === o.value ? 'var(--ink)' : 'var(--ink-dim)',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Shared difficulty / generate row ─────────────────────────── */
function DifficultyRow({ diffMode, setDiffMode, easy, setEasy, medium, setMedium, hard, setHard, totalCount, setTotalCount, onGenerate, isPending }: {
  diffMode: DiffMode; setDiffMode: (m: DiffMode) => void
  easy: number; setEasy: (n: number) => void
  medium: number; setMedium: (n: number) => void
  hard: number; setHard: (n: number) => void
  totalCount: number; setTotalCount: (n: number) => void
  onGenerate: () => void; isPending: boolean
}) {
  const diffTotal = easy + medium + hard

  const handleTotal = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  return (
    <div style={{ paddingTop: 4 }}>
    <div className="flex flex-wrap gap-3 items-center">
      <SegToggle
        value={diffMode} onChange={setDiffMode}
        options={[{ value: 'difficulty', label: 'By Difficulty' }, { value: 'count', label: 'By Count' }]}
      />

      {diffMode === 'difficulty' ? (
        <div className="flex gap-2 items-center" style={{ overflowX: 'auto' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ink-dim)', whiteSpace: 'nowrap' }}>
            Total
          </span>
          <input type="number" min={0} max={200} value={diffTotal}
            onChange={e => handleTotal(Number(e.target.value))}
            className="form-input" style={NUM}
            title="Auto-splits 25% easy / 50% medium / 25% hard" />
          <span style={{ color: 'var(--border-dim)', fontSize: '0.7rem' }}>▸</span>
          {(['easy', 'medium', 'hard'] as const).map(d => {
            const val = d === 'easy' ? easy : d === 'medium' ? medium : hard
            const set = d === 'easy' ? setEasy : d === 'medium' ? setMedium : setHard
            return (
              <div key={d} className="flex items-center gap-1">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: DIFF[d].dot, boxShadow: `0 0 4px ${DIFF[d].dot}`, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--ink-dim)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {d}
                </span>
                <input type="number" min={0} max={100} value={val}
                  onChange={e => set(Math.max(0, Number(e.target.value)))}
                  className="form-input" style={NUM} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ink-dim)' }}>Questions</span>
          <input type="number" min={0} max={200} value={totalCount || ''}
            onChange={e => setTotalCount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
            onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) setTotalCount(1) }}
            className="form-input" style={NUM} />
        </div>
      )}

      <div style={{ marginLeft: 'auto', position: 'relative' }}>
        <button className="btn btn-primary" onClick={onGenerate} disabled={isPending}
          style={{ height: 38, padding: '0 24px', position: 'relative', zIndex: 1 }}>
          {isPending ? '…' : '▶ Generate'}
        </button>
      </div>
    </div>
    </div>
  )
}

interface Props { bank: Bank }

const GROUP_MODE_OPTIONS: { value: GroupMode; label: string }[] = [
  { value: 'mixed',      label: 'Mixed' },
  { value: 'standalone', label: 'Standalone' },
  { value: 'groups',     label: 'Groups' },
]

export default function GenerateTab({ bank }: Props) {
  const navigate = useNavigate()
  const generate = useGenerateTest(String(bank.id))
  const start    = useStartAttempt()
  const def      = bank.default_config
  const { data: tagOptions = [] } = useTags(String(bank.id))

  const [groupMode,  setGroupMode]  = useState<GroupMode>(def.group_mode ?? 'mixed')
  const [name,       setName]       = useState('')
  const [types,      setTypes]      = useState<string[]>([])
  const [tags,       setTags]       = useState<string[]>([])
  const [diffMode,   setDiffMode]   = useState<DiffMode>('difficulty')
  const [easy,       setEasy]       = useState(def.easy_count   ?? 3)
  const [medium,     setMedium]     = useState(def.medium_count ?? 5)
  const [hard,       setHard]       = useState(def.hard_count   ?? 2)
  const [totalCount, setTotalCount] = useState(10)
  const [genError,   setGenError]   = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenError(null)
    const [e, m, h] = diffMode === 'count' ? autoSplit(totalCount) : [easy, medium, hard]
    const config = {
      easy_count:   e,
      medium_count: m,
      hard_count:   h,
      group_mode:   groupMode,
      ...(types.length ? { types } : {}),
      ...(tags.length ? { tags } : {}),
    }
    try {
      const test = await generate.mutateAsync({ name: name.trim() || `${bank.name} — ${new Date().toLocaleString()}`, config })
      if (!test.questions?.length) {
        setGenError('No questions match these settings. Try another group mode, fewer filters, or different counts.')
        return
      }
      const attempt = await start.mutateAsync({ bankId: String(bank.id), testId: test.id })
      navigate(`/attempts/${bank.id}/${attempt.id}`)
    } catch {
      setGenError('Generating the test failed — please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="section-title" style={{ marginBottom: 0, flex: 1 }}>Generate Test</div>
        <SegToggle value={groupMode} onChange={v => { setGroupMode(v); setGenError(null) }} options={GROUP_MODE_OPTIONS} />
      </div>

      <OrnatePanel>
        <div style={{ display: 'grid', gridTemplateColumns: tagOptions.length ? '2fr 1.5fr 1.5fr' : '2fr 1.5fr', gap: 14, marginBottom: 14 }}>
          <FormField label="Test Name">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Practice" />
          </FormField>
          <FormField label="Types">
            <MultiSelect value={types} onChange={setTypes} placeholder="All Types" options={TYPE_OPTIONS} />
          </FormField>
          {tagOptions.length > 0 && (
            <FormField label="Tags · match all">
              <MultiSelect value={tags} onChange={setTags} placeholder="Any Tags"
                options={tagOptions.map(t => ({ value: t, label: t }))} />
            </FormField>
          )}
        </div>
        <DifficultyRow
          diffMode={diffMode} setDiffMode={setDiffMode}
          easy={easy} setEasy={setEasy}
          medium={medium} setMedium={setMedium}
          hard={hard} setHard={setHard}
          totalCount={totalCount} setTotalCount={setTotalCount}
          onGenerate={handleGenerate}
          isPending={generate.isPending || start.isPending}
        />
        {genError && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--rose-soft)', border: '1px solid var(--rose-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--red)' }}>
            {genError}
          </div>
        )}
      </OrnatePanel>
    </div>
  )
}
