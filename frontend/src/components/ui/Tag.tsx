import { QuestionDifficulty, QuestionType } from '../../types'

export function TypeTag({ type }: { type: QuestionType }) {
  const label: Record<QuestionType, string> = {
    mcq:                  'MCQ',
    true_false:           'True / False',
    open:                 'Open',
    tf_ng:                'T / F / NG',
    sentence_completion:  'Fill in Blank',
    word_bank_completion: 'Word Bank',
    matching:             'Matching',
    multi_select:         'Multi Select',
  }
  return <span className="tag tag-type">{label[type]}</span>
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
