import { describe, it, expect } from 'vitest'
import { checkAnswer, seededShuffle, questionContent } from './answers'
import { gradeForPct } from './grade'
import type { Question } from '../../types'

const base = { bank_id: 1, difficulty: 'easy' as const, tags: [] as string[], created_at: '', updated_at: '' }

const mcq = (answers: string[]): Question => ({
  ...base, id: 1, type: 'mcq',
  choice: { question_id: 1, content: 'Pick', options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }], answers },
})

const item = (type: Question['type'], answer: string): Question => ({
  ...base, id: 2, type, item: { question_id: 2, content: 'Q', answer },
})

describe('checkAnswer', () => {
  it('needs the exact set of MCQ keys, in any order', () => {
    expect(checkAnswer(mcq(['A', 'C']), 'C | A')).toBe(true)
    expect(checkAnswer(mcq(['A', 'C']), 'A')).toBe(false)
    expect(checkAnswer(mcq(['A']), 'A|B')).toBe(false)
  })

  it('compares text answers ignoring case and surrounding space', () => {
    expect(checkAnswer(item('short_answer', 'Tokyo'), '  tokyo ')).toBe(true)
    expect(checkAnswer(item('tf_ng', 'Not Given'), 'not given')).toBe(true)
    expect(checkAnswer(item('matching_headings', 'iv'), 'IV')).toBe(true)
    expect(checkAnswer(item('sentence_completion', 'sink'), 'sinks')).toBe(false)
  })

  it('is false for a question without content', () => {
    expect(checkAnswer({ ...base, id: 3, type: 'short_answer' }, 'x')).toBe(false)
  })
})

describe('seededShuffle', () => {
  const xs = ['A', 'B', 'C', 'D', 'E', 'F']

  it('returns the same order for the same seed', () => {
    expect(seededShuffle(xs, 42)).toEqual(seededShuffle(xs, 42))
  })

  it('keeps every element and leaves the input untouched', () => {
    const out = seededShuffle(xs, 7)
    expect([...out].sort()).toEqual(xs)
    expect(xs).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })
})

describe('questionContent', () => {
  it('reads the stem from either content shape', () => {
    expect(questionContent(mcq(['A']))).toBe('Pick')
    expect(questionContent(item('short_answer', 'x'))).toBe('Q')
  })
})

describe('gradeForPct', () => {
  it('maps percentages onto the grade bands', () => {
    expect([95, 80, 60, 45, 10].map(gradeForPct)).toEqual(['S', 'A', 'B', 'C', 'D'])
  })
})
