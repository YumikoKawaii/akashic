export interface TestConfig {
  easy_count: number
  medium_count: number
  hard_count: number
  category_ids?: string[]
  types?: string[]
  tags?: string[]
}

export interface Bank {
  id: string
  name: string
  description: string
  default_config: TestConfig
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  bank_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export type QuestionType       = 'mcq' | 'true_false' | 'open'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  bank_id: string
  category_id: string
  category?: Category
  text: string
  type: QuestionType
  difficulty: QuestionDifficulty
  options: string[]
  correct_answer: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface TestQuestion {
  test_id: string
  question_id: string
  question?: Question
  position: number
}

export interface Test {
  id: string
  bank_id: string
  name: string
  description: string
  config: TestConfig
  questions?: TestQuestion[]
  created_at: string
  updated_at: string
}

export interface TestAttempt {
  id: string
  test_id: string
  test?: Test
  answers: Record<string, string>
  score?: number
  total?: number
  started_at: string
  completed_at?: string
}

export interface QuestionFilter {
  category_ids?: string[]
  difficulty?: string
  types?: string[]
  tags?: string[]
}
