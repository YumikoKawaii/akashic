import { QuestionDifficulty, QuestionType } from '../../types'

export function TypeTag({ type }: { type: QuestionType }) {
  const label: Record<QuestionType, string> = {
    mcq:                  'MCQ',
    tf_ng:                'T / F / NG',
    yn_ng:                'Y / N / NG',
    sentence_completion:  'Sentence Completion',
    form_completion:      'Form Completion',
    short_answer:         'Short Answer',
    matching_headings:    'Matching Headings',
    matching_information: 'Matching Info',
    matching_features:    'Matching Features',
  }
  return <span className="tag tag-type">{label[type] ?? type}</span>
}

export function DifficultyTag({ difficulty }: { difficulty: QuestionDifficulty }) {
  const cls: Record<QuestionDifficulty, string> = {
    easy:   'tag tag-easy',
    medium: 'tag tag-medium',
    hard:   'tag tag-hard',
  }
  return <span className={cls[difficulty]}>{difficulty}</span>
}

export function CategoryTag({ name }: { name: string }) {
  return <span className="tag tag-category">{name}</span>
}
