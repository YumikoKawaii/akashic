export interface User {
  id: number
  email: string
  name: string
  avatar_url: string
}

export type BankRole = 'owner' | 'editor' | 'viewer'

export interface BankMember {
  id: number
  bank_id: number
  user_id: number
  user?: User
  role: BankRole
  created_at: string
  updated_at: string
}

export interface TestConfig {
  easy_count: number
  medium_count: number
  hard_count: number
  category_ids?: number[]
  types?: string[]
  tags?: string[]
}

export interface Bank {
  id: number
  name: string
  description: string
  owner_id?: number
  default_config: TestConfig
  my_role: BankRole
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  bank_id: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export type QuestionType =
  | 'mcq'
  | 'tf_ng'
  | 'yn_ng'
  | 'matching_headings'
  | 'matching_information'
  | 'matching_features'
  | 'sentence_completion'
  | 'form_completion'
  | 'short_answer'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface MCQOption {
  key: string
  text: string
}

export interface QQuestionItem {
  question_id: number
  content: string
  answer: string
}

export interface QMultipleChoice {
  question_id: number
  content: string
  options: MCQOption[]
  answers: string[]
}

export interface Passage {
  id: number
  bank_id: number
  category_id: number
  category?: Category
  title: string
  body: string
  difficulty: QuestionDifficulty
  created_at: string
  updated_at: string
}

export interface Question {
  id: number
  bank_id: number
  category_id: number
  category?: Category
  group_id?: number
  type: QuestionType
  difficulty: QuestionDifficulty
  tags: string[]
  position?: number
  item?: QQuestionItem
  choice?: QMultipleChoice
  created_at: string
  updated_at: string
}

export interface TestQuestion {
  test_id: number
  question_id: number
  question?: Question
  position: number
}

export interface Test {
  id: number
  bank_id: number
  name: string
  description: string
  config: TestConfig
  questions?: TestQuestion[]
  created_at: string
  updated_at: string
}

export interface TestAttempt {
  id: number
  test_id: number
  test?: Test
  answers: Record<string, string>
  score?: number
  total?: number
  started_at: string
  completed_at?: string
}

export interface QuestionFilter {
  category_ids?: number[]
  difficulty?: string
  type?: string
  tags?: string[]
}
