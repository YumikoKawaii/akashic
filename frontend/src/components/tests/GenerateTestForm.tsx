import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category, Passage } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

interface Props { bank: Bank; categories: Category[]; passages: Passage[] }

const DIFF_COLORS = { easy: '#3daa50', medium: 'var(--gold)', hard: '#cc3838' }
const DIFF_LABELS = { easy: 'Easy', medium: 'Med', hard: 'Hard' }

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

function autoSplit(total: number): [number, number, number] {
  const easy   = Math.round(total * 0.25)
  const hard   = Math.round(total * 0.25)
  const medium = total - easy - hard
  return [easy, Math.max(0, medium), hard]
}

export default function GenerateTestForm({ bank, categories, passages }: Props) {
  const navigate    = useNavigate()
  const generate    = useGenerateTest(String(bank.id))
  const start       = useStartAttempt()
  const def         = bank.default_config

  const [name,        setName]        = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [passageIds,  setPassageIds]  = useState<string[]>([])
  const [types,       setTypes]       = useState<string[]>([])
  const [mode,        setMode]        = useState<'difficulty' | 'count'>('difficulty')
  const [easy,        setEasy]        = useState(def.easy_count   ?? 3)
  const [medium,      setMedium]      = useState(def.medium_count ?? 5)
  const [hard,        setHard]        = useState(def.hard_count   ?? 2)
  const [totalCount,  setTotalCount]  = useState(10)
  const diffTotal = easy + medium + hard

  const handleTotalChange = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  const handleGenerate = async () => {
    const catIds = categoryIds.map(Number).filter(Boolean)
    const psgIds = passageIds.map(Number).filter(Boolean)
    const config = mode === 'count'
      ? (() => {
          const [e, m, h] = autoSplit(totalCount)
          return {
            easy_count: e, medium_count: m, hard_count: h,
            ...(catIds.length  ? { category_ids: catIds } : {}),
            ...(psgIds.length  ? { passage_ids: psgIds }  : {}),
            ...(types.length   ? { types }                : {}),
          }
        })()
      : {
          easy_count:   easy,
          medium_count: medium,
          hard_count:   hard,
          ...(catIds.length  ? { category_ids: catIds } : {}),
          ...(psgIds.length  ? { passage_ids: psgIds }  : {}),
          ...(types.length   ? { types }                : {}),
        }
    const test = await generate.mutateAsync({
      name: name.trim() || `${bank.name} — ${new Date().toLocaleString()}`,
      config,
    })
    const attempt = await start.mutateAsync({ bankId: String(bank.id), testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const isPending = generate.isPending || start.isPending

  const colCount = passages.length > 0 ? 4 : 3

  return (
    <OrnatePanel>
      <div className="section-title" style={{ marginBottom: 16 }}>Quick Generate</div>

      <div
        className={`grid grid-cols-1 gap-4`}
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, marginBottom: 12 }}
      >
        <FormField label="Test Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Practice" />
        </FormField>
        <FormField label="Categories">
          <MultiSelect
            value={categoryIds}
            onChange={setCategoryIds}
            placeholder="All Categories"
            options={categories.map(c => ({ value: String(c.id), label: c.name }))}
          />
        </FormField>
        <FormField label="Types">
          <MultiSelect
            value={types}
            onChange={setTypes}
            placeholder="All Types"
            options={TYPE_OPTIONS}
          />
        </FormField>
        {passages.length > 0 && (
          <FormField label="Passages">
            <MultiSelect
              value={passageIds}
              onChange={setPassageIds}
              placeholder="All Passages"
              options={passages.map(p => ({ value: String(p.id), label: p.title }))}
            />
          </FormField>
        )}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4 }}>
          {(['difficulty', 'count'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em',
                padding: '4px 10px', border: 'none', cursor: 'pointer', borderRadius: 2,
                background: mode === m ? 'var(--gold-dim)' : 'transparent',
                color: mode === m ? 'var(--bg)' : 'var(--ink-dim)',
                textTransform: 'uppercase',
              }}
            >
              {m === 'difficulty' ? 'By Difficulty' : 'By Count'}
            </button>
          ))}
        </div>

        {mode === 'difficulty' ? (
          <FormField label={`Questions · Total ${diffTotal}`}>
            <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
              <div className="flex gap-2 items-center" style={{ minWidth: 'max-content' }}>
                <input
                  type="number" min={1} max={100}
                  value={diffTotal}
                  onChange={e => handleTotalChange(Number(e.target.value))}
                  className="form-input"
                  style={{ width: 54, textAlign: 'center', padding: '7px 4px' }}
                  title="Set total — auto-splits 25% easy / 50% medium / 25% hard"
                />
                <span style={{ color: 'var(--border-dim)', fontSize: '0.65rem', padding: '0 2px' }}>▸</span>
                {([['easy', easy, setEasy], ['medium', medium, setMedium], ['hard', hard, setHard]] as const).map(
                  ([diff, val, set]) => (
                    <div key={diff} className="flex items-center gap-1">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_COLORS[diff], boxShadow: `0 0 4px ${DIFF_COLORS[diff]}`, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
                        {DIFF_LABELS[diff]}
                      </span>
                      <input
                        type="number" min={0} max={50}
                        value={val}
                        onChange={e => set(Math.max(0, Number(e.target.value)))}
                        className="form-input"
                        style={{ width: 46, textAlign: 'center', padding: '7px 4px' }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </FormField>
        ) : (
          <FormField label="Questions">
            <input
              type="number" min={1} max={200}
              value={totalCount}
              onChange={e => setTotalCount(Math.max(1, Number(e.target.value)))}
              className="form-input"
              style={{ width: 72, textAlign: 'center', padding: '7px 4px' }}
            />
          </FormField>
        )}

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isPending}
          style={{ height: 38, padding: '0 20px', whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          {isPending ? '…' : '▶ Generate'}
        </button>
      </div>
    </OrnatePanel>
  )
}
