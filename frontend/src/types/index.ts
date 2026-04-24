export interface User {
  id: string
  email: string
  name: string
  avatar_url: string
}

export type BankRole = 'owner' | 'editor' | 'viewer'

export interface BankMember {
  bank_id: string
  user_id: string
  user?: User
  role: BankRole
  created_at: string
}

export interface TestConfig {
  easy_count: number
  medium_count: number
  hard_count: number
  total_count?: number
  category_ids?: string[]
  types?: string[]
  tags?: string[]
}

export interface Bank {
  id: string
  name: string
  description: string
  owner_id?: string
  default_config: TestConfig
  my_role: BankRole
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

export type QuestionType       = 'mcq' | 'true_false' | 'open' | 'tf_ng' | 'sentence_completion' | 'word_bank_completion' | 'matching' | 'multi_select'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface Passage {
  id: string
  bank_id: string
  category_id: string
  category?: Category
  title: string
  body: string
  difficulty: QuestionDifficulty
  questions?: Question[]
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  bank_id: string
  category_id: string
  category?: Category
  passage_id?: string
  passage?: Passage
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

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
