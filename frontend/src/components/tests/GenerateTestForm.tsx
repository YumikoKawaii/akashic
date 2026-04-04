import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input } from '../ui/FormField'
import MultiSelect from '../ui/MultiSelect'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

interface Props { bank: Bank; categories: Category[] }

const DIFF_COLORS = { easy: '#3a9a4a', medium: 'var(--gold)', hard: '#b03030' }
const DIFF_LABELS = { easy: 'Easy', medium: 'Med', hard: 'Hard' }

function autoSplit(total: number): [number, number, number] {
  const easy   = Math.round(total * 0.25)
  const hard   = Math.round(total * 0.25)
  const medium = total - easy - hard
  return [easy, Math.max(0, medium), hard]
}

export default function GenerateTestForm({ bank, categories }: Props) {
  const navigate    = useNavigate()
  const generate    = useGenerateTest(bank.id)
  const start       = useStartAttempt()
  const def = bank.default_config
  const TYPE_OPTIONS = [
    { value: 'mcq',        label: 'MCQ' },
    { value: 'true_false', label: 'True / False' },
    { value: 'open',       label: 'Open' },
  ]

  const [name,        setName]        = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [types,       setTypes]       = useState<string[]>([])
  const [easy,       setEasy]       = useState(def.easy_count   ?? 3)
  const [medium,     setMedium]     = useState(def.medium_count ?? 5)
  const [hard,       setHard]       = useState(def.hard_count   ?? 2)
  const total = easy + medium + hard

  const handleTotalChange = (n: number) => {
    const [e, m, h] = autoSplit(Math.max(0, n))
    setEasy(e); setMedium(m); setHard(h)
  }

  const handleGenerate = async () => {
    const test = await generate.mutateAsync({
      name: name.trim() || `${bank.name} — ${new Date().toLocaleString()}`,
      config: {
        easy_count:   easy,
        medium_count: medium,
        hard_count:   hard,
        ...(categoryIds.length ? { category_ids: categoryIds } : {}),
        ...(types.length       ? { types }                     : {}),
      },
    })
    const attempt = await start.mutateAsync({ bankId: bank.id, testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const isPending = generate.isPending || start.isPending

  return (
    <OrnatePanel>
      <div className="section-title" style={{ marginBottom: 18 }}>Quick Generate</div>

      {/* Row 1: Name + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 14 }}>
        <FormField label="Test Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Practice" />
        </FormField>
        <FormField label="Categories">
          <MultiSelect
            value={categoryIds}
            onChange={setCategoryIds}
            placeholder="All Categories"
            options={categories.map(c => ({ value: c.id, label: c.name }))}
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
      </div>

      {/* Row 2: Difficulty + Actions */}
      <div className="flex flex-wrap gap-4 items-end">
        <FormField label={`Questions · Total ${total}`}>
          <div className="flex gap-2 items-center">
            <input
              type="number" min={1} max={100}
              value={total}
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
        </FormField>

        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isPending}
          style={{ height: 38, padding: '0 20px', whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          {isPending ? '…' : '⚔ Generate'}
        </button>
      </div>
    </OrnatePanel>
  )
}
