import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bank, Category } from '../../types'
import OrnatePanel from '../ui/OrnatePanel'
import { FormField, Input, Select } from '../ui/FormField'
import { useGenerateTest } from '../../hooks/useTests'
import { useStartAttempt } from '../../hooks/useAttempts'

interface Props { bank: Bank; categories: Category[] }

const DIFF_COLORS = { easy: '#3a9a4a', medium: 'var(--gold)', hard: '#b03030' }

export default function GenerateTestForm({ bank, categories }: Props) {
  const navigate  = useNavigate()
  const generate  = useGenerateTest(bank.id)
  const start     = useStartAttempt()

  const def = bank.default_config
  const [name,        setName]       = useState('')
  const [categoryId,  setCategoryId] = useState('')
  const [easy,        setEasy]       = useState(def.easy_count   ?? 5)
  const [medium,      setMedium]     = useState(def.medium_count ?? 10)
  const [hard,        setHard]       = useState(def.hard_count   ?? 5)

  const handleGenerate = async () => {
    const test = await generate.mutateAsync({
      name: name.trim() || `${bank.name} — ${new Date().toLocaleDateString()}`,
      config: {
        easy_count:   easy,
        medium_count: medium,
        hard_count:   hard,
        ...(categoryId ? { category_id: categoryId } : {}),
      },
    })
    const attempt = await start.mutateAsync({ bankId: bank.id, testId: test.id })
    navigate(`/attempts/${attempt.id}`)
  }

  const isPending = generate.isPending || start.isPending

  return (
    <OrnatePanel>
      <div className="section-title" style={{ marginBottom: 18 }}>Quick Generate</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <FormField label="Test Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning Practice" />
        </FormField>

        <FormField label="Category">
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>

        <FormField label="Difficulty Split">
          <div className="flex gap-2">
            {([['easy', easy, setEasy], ['medium', medium, setMedium], ['hard', hard, setHard]] as const).map(
              ([diff, val, set]) => (
                <div key={diff} className="flex items-center gap-1">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: DIFF_COLORS[diff], boxShadow: `0 0 4px ${DIFF_COLORS[diff]}`, flexShrink: 0, display: 'inline-block' }} />
                  <input
                    type="number" min={0} max={50}
                    value={val}
                    onChange={e => set(Number(e.target.value))}
                    className="form-input"
                    style={{ width: 52, textAlign: 'center', padding: '7px 4px' }}
                  />
                </div>
              )
            )}
          </div>
        </FormField>

        <button className="btn btn-primary" onClick={handleGenerate} disabled={isPending} style={{ height: 38 }}>
          {isPending ? '…' : '⚔ Generate'}
        </button>
      </div>
    </OrnatePanel>
  )
}
